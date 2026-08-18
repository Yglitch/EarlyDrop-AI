from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import joblib
import pandas as pd
from database import get_db
from model import Student
from dtos import   StudentResponse,StudentBase , PredictionLevel

router = APIRouter(prefix="/students", tags=["Students"])

model = joblib.load("trained_model.joblib")
label_encoder = joblib.load("label_encoding.joblib")
scaler = joblib.load("scaler.joblib")


# ---------- predict --------

@router.post("/predict")
def predict_student(student: StudentBase):

     return {"message":"hello"}
    


# ---------- READ (single by student_id) ----------
@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
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