from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
import joblib
import pandas as pd
from database import get_db
from model import Student
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


def _run_prediction(student: StudentBase) -> dict:
    """Reproduce the train.ipynb preprocessing pipeline (label-encode ->
    MinMax scale) before calling the model, then decode the result back to a
    PredictionLevel label."""
    raw = student.model_dump(include=set(FEATURE_COLUMNS))
    input_data = pd.DataFrame([raw])[FEATURE_COLUMNS]

    for col in CATEGORICAL_COLUMNS:
        encoder = label_encoders[col]
        # .value stringifies enums (e.g. GenderEnum.MALE -> "Male") to match
        # the raw string labels the encoder was fit on.
        raw_value = input_data.at[0, col]
        value = raw_value.value if hasattr(raw_value, "value") else raw_value
        input_data.at[0, col] = encoder.transform([value])[0]

    input_data = input_data.astype(float)
    scaled = scaler.transform(input_data)

    prediction_encoded = model.predict(scaled)[0]
    probabilities = model.predict_proba(scaled)[0] if hasattr(model, "predict_proba") else None

    prediction_encoder = label_encoders["prediction"]
    prediction_label = prediction_encoder.inverse_transform([prediction_encoded])[0]

    return {
        "prediction_label": prediction_label,
        "prediction_encoded": int(prediction_encoded),
        "probabilities": probabilities,
    }


# ---------- CREATE ----------
@router.post("/", response_model=StudentResponse, status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.student_id == payload.student_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="student_id already exists")

    data = payload.model_dump()
    if data.get("prediction") is None:
        # No prediction supplied by the client: compute it ourselves instead
        # of letting a NULL hit the NOT NULL "prediction" column and surface
        # as a misleading 409/integrity error.
        try:
            result = _run_prediction(StudentBase(**data))
            data["prediction"] = result["prediction_label"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not compute prediction for new student: {e}",
            )

    student = Student(**data)
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Could not create student (integrity error)")
    db.refresh(student)
    return student


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
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(student)
    db.commit()
    return None


@router.post("/predict")
def predict_dropout(student: StudentBase, db: Session = Depends(get_db)):
    try:
        result = _run_prediction(student)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

    probabilities = result["probabilities"]
    return {
        "status": "success",
        "prediction": result["prediction_label"],
        "is_dropout_risk": result["prediction_label"] == "High",
        "dropout_probability": float(max(probabilities)) if probabilities is not None else None,
    }