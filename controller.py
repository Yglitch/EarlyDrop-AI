import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import joblib
import pandas as pd
from database import get_db
from model import Student
<<<<<<< HEAD
from dtos import   StudentResponse,StudentBase , PredictionLevel

router = APIRouter(prefix="/students", tags=["Students"])

model = joblib.load("trained_model.joblib")
label_encoder = joblib.load("label_encoding.joblib")
scaler = joblib.load("scaler.joblib")


# ---------- predict --------

@router.post("/predict")
def predict_student(student: StudentBase):

     return {"message":"hello"}
    

from dtos import StudentCreate, StudentUpdate, StudentResponse, StudentListResponse, StudentBase

router = APIRouter(prefix="/students", tags=["Students"])

# Load trained model
model = joblib.load("model.pkl")

# ---------- CREATE ----------
@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    db_student = Student(**payload.model_dump())
    try:
        db.add(db_student)
        db.commit()
        db.refresh(db_student)
        return db_student
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student ID or Email already exists."
        )

# ---------- READ (list / search / paginate) ----------
@router.get("/", response_model=StudentListResponse)
def list_students(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Items per page"),
    gender: Optional[str] = Query(None, description="Filter by gender"),
    search: Optional[str] = Query(None, description="Search by name or student_id"),
    db: Session = Depends(get_db)
):
    query = db.query(Student)

    if gender:
        query = query.filter(Student.gender == gender)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Student.name.ilike(search_filter)) |
            (Student.student_id.ilike(search_filter))
        )

    total = query.count()
    students = query.offset((page - 1) * size).limit(size).all()
>>>>>>> bed7800cb97551b0a28547ce7b033592b6184b25

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": students
    }

# ---------- PREDICT (MUST BE DEFINED BEFORE /{student_id}) ----------
@router.post("/predict")
def predict_dropout(student: StudentBase):
    try:
        data_dict = student.model_dump()
        
        # Remove non-feature columns dropped during training
        data_dict.pop("name", None)
        data_dict.pop("student_id", None)
        
        input_data = pd.DataFrame([data_dict])
        prediction = model.predict(input_data)[0]
        
        probabilities = model.predict_proba(input_data)[0] if hasattr(model, "predict_proba") else None
        
        return {
            "status": "success",
            "prediction": int(prediction) if isinstance(prediction, (int, float)) else str(prediction),
            "is_dropout_risk": bool(prediction == 1 or prediction == "High"),
            "dropout_probability": float(probabilities[1]) if probabilities is not None else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

# ---------- READ (single by student_id) ----------
@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student

<<<<<<< HEAD



=======
# ---------- UPDATE ----------
@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: str, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    try:
        db.commit()
        db.refresh(student)
        return student
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Update failed. Email or Student ID conflict."
        )
>>>>>>> bed7800cb97551b0a28547ce7b033592b6184b25

# ---------- DELETE ----------
@router.delete("/{student_id}", status_code=status.HTTP_200_OK)
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    db.delete(student)
    db.commit()
    return {"detail": f"Student with ID '{student_id}' has been deleted."}