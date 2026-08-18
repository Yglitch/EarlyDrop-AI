from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from controller import router as student_router

# Create tables if they don't exist yet
# (For production, prefer Alembic migrations instead of this.)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Student Prediction Record API",
    description="API for managing student records and their scholarship/dropout risk predictions",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust origin URLs as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(student_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Student Prediction Record API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)