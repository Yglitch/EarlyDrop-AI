from sqlalchemy import Column, Integer, String, Enum

from database import Base  # import the declarative Base from your db.py
from dtos import YesNo, SubmissionStatus, PredictionLevel, GenderEnum
# Reuse the enums defined in dtos.py instead of redefining them here, so the
# DB layer and the API layer can never drift out of sync with each other.


class Student(Base):
    __tablename__ = "student_prediction_record"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    student_id = Column(String(20), unique=True, nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(Enum(GenderEnum), nullable=False)
    attendance = Column(Integer, nullable=False)  # percentage
    scholarship = Column(Enum(YesNo), nullable=False)
    co_curricular_activities = Column(Enum(YesNo), nullable=False)
    marks = Column(Integer, nullable=False)
    assignment_submission = Column(Enum(SubmissionStatus), nullable=False)
    debtor = Column(Enum(YesNo), nullable=False)
    displaced = Column(Enum(YesNo), nullable=False)
    income = Column(Integer, nullable=False)
    prediction = Column(Enum(PredictionLevel), nullable=False)

    def __repr__(self):
        return f"<Student(student_id={self.student_id!r}, name={self.name!r}, prediction={self.prediction!r})>"