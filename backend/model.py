from sqlalchemy import Column, Integer, String, Boolean, Enum
import enum

from database import Base  # import the declarative Base from your db.py


class YesNo(str, enum.Enum):
    YES = "Yes"
    NO = "No"


class SubmissionStatus(str, enum.Enum):
    YES = "Yes"
    NO = "No"
    HALF = "Half"


class PredictionLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class Student(Base):
    __tablename__ = "student_prediction_record"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    student_id = Column(String(20), unique=True, nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
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