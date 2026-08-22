from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
import joblib
import pandas as pd
from database import get_db
from model import Student
import traceback
from dtos import StudentBase, StudentCreate, StudentUpdate, StudentResponse, StudentListResponse

router = APIRouter(prefix="/students", tags=["Students"])

model = joblib.load("trained_model.joblib")
scaler = joblib.load("scaler.joblib")
label_encoders = joblib.load("label_encoding.joblib")

# Columns the model was trained on, in the exact order used in train.ipynb
# (df with "name" and "student_id" dropped, "prediction" excluded from X).
# Keep this in sync with the notebook if the training schema changes.
FEATURE_COLUMNS = [
    "age", "gender", "attendance", "scholarship", "co_curricular_activities",
    "marks", "assignment_submission", "debtor", "displaced", "income",
]
CATEGORICAL_COLUMNS = [
    "gender", "scholarship", "co_curricular_activities",
    "assignment_submission", "debtor", "displaced",
]

from dtos import PredictionLevel

# Order the target LabelEncoder used during training.
# LabelEncoder.fit() sorts classes alphabetically by default, so for
# {"High", "Low", "Medium"} this is ["High", "Low", "Medium"].
# VERIFY against train.ipynb (print(target_encoder.classes_)) and fix if different.
PREDICTION_CLASSES = ["High", "Low", "Medium"]


def _run_prediction(student: StudentBase) -> dict:
    """
    Preprocess student data using the same pipeline used during training:
    1. Label encode categorical columns
    2. Convert values to float
    3. Apply trained MinMaxScaler
    4. Predict using trained ML model
    5. Decode prediction back to original label
    """

    # Get only ML features
    raw = student.model_dump(include=set(FEATURE_COLUMNS))

    # Create DataFrame in exactly the same column order as training
    input_data = pd.DataFrame([raw])[FEATURE_COLUMNS]

    # Label encode categorical features
    for col in CATEGORICAL_COLUMNS:
        encoder = label_encoders[col]

        raw_value = input_data.at[0, col]

        # Handle Enum values such as GenderEnum.MALE
        value = raw_value.value if hasattr(raw_value, "value") else raw_value

        try:
            input_data.at[0, col] = str(encoder.transform([value])[0])
        except ValueError:
            raise ValueError(
                f"Unknown value '{value}' for column '{col}'. "
                f"Expected one of: {list(encoder.classes_)}"
            )

    # Convert all features to float
    input_data = input_data.astype(float)

    # Apply the scaler fitted during training
    scaled = scaler.transform(input_data)

    # Make prediction
    prediction_encoded = int(model.predict(scaled)[0])

    # Get prediction probabilities if supported
    probabilities = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(scaled)[0].tolist()

    # Decode prediction back to original label.
    # No "prediction" key exists in label_encoders (it only holds feature
    # encoders), so we decode manually using the known target classes.
    try:
        prediction_label = PREDICTION_CLASSES[prediction_encoded]
    except IndexError:
        raise ValueError(
            f"Model returned encoded class {prediction_encoded}, which is "
            f"out of range for PREDICTION_CLASSES={PREDICTION_CLASSES}"
        )

    return {
        "prediction_label": PredictionLevel(prediction_label),
        "prediction_encoded": prediction_encoded,
        "probabilities": probabilities,
    }


# ---------- CREATE ----------
@router.post("/predict", response_model=StudentResponse)
def predict_student(data: StudentBase, db: Session = Depends(get_db)):
    try:
        result = _run_prediction(data)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Prediction failed: {e}")

    # Save the application + prediction to the database
    record = Student(
        **data.model_dump(),
        prediction=result["prediction_label"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return StudentResponse.model_validate(record)


# ---------- READ (list, with pagination + optional filter) ----------
@router.get("/", response_model=StudentListResponse)
def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    prediction: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Student)
    if prediction:
        query = query.filter(Student.prediction == prediction)

    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return StudentListResponse(total=total, items=items)


# ---------- READ (single by student_id) ----------
@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


# ---------- UPDATE (partial) ----------
@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(student_id: str, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


# ---------- DELETE ----------
@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Invalid Student found")

    db.delete(student)
    db.commit()
    return None


