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
# NOTE: field order here must match the column order the model was trained on
# (X = df.drop(["prediction"], axis="columns") in train.ipynb, after dropping
# name/student_id). Keep this in sync with train.ipynb's feature columns.
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


# ---------- Create DTO (input, no prediction — server computes/assigns it) ----------
class StudentCreate(StudentBase):
    prediction: Optional[PredictionLevel] = None


# ---------- Update DTO (all fields optional, for PATCH) ----------
class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    age: Optional[int] = Field(None, ge=1, le=100)
    gender: Optional[GenderEnum] = None
    attendance: Optional[int] = Field(None, ge=0, le=100)
    scholarship: Optional[YesNo] = None
    co_curricular_activities: Optional[YesNo] = None
    marks: Optional[int] = Field(None, ge=0, le=100)
    assignment_submission: Optional[SubmissionStatus] = None
    debtor: Optional[YesNo] = None
    displaced: Optional[YesNo] = None
    income: Optional[int] = Field(None, ge=0)
    prediction: Optional[PredictionLevel] = None


# ---------- Response DTO (output, includes DB id) ----------
class StudentResponse(StudentBase):
    id: int
    prediction: PredictionLevel

    model_config = ConfigDict(from_attributes=True)  # allows .from_orm() / ORM -> DTO


# ---------- List response wrapper (optional, useful for paginated endpoints) ----------
class StudentListResponse(BaseModel):
    total: int
    items: list[StudentResponse]