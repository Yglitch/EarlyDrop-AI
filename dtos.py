from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from typing import Optional


class YesNo(str, Enum):
    YES = "Yes"
    NO = "No"


class SubmissionStatus(str, Enum):
    YES = "Yes"
    NO = "No"
    HALF = "Half"


class PredictionLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class GenderEnum(str, Enum):
    MALE = "Male"
    FEMALE = "Female"


# ---------- Base (shared fields) ----------
class StudentBase(BaseModel):
    name: str = Field(..., max_length=100)
    student_id: str = Field(..., max_length=20)
    age: int = Field(..., ge=1, le=100)
    gender: GenderEnum
    attendance: int = Field(..., ge=0, le=100)
    scholarship: YesNo
    co_curricular_activities: YesNo
    marks: int = Field(..., ge=0, le=100)
    assignment_submission: SubmissionStatus
    debtor: YesNo
    displaced: YesNo
    income: int = Field(..., ge=0)






# ---------- Response DTO (output, includes DB id) ----------
class StudentResponse(StudentBase):
    id: int
    prediction: PredictionLevel



