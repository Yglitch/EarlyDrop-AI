import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DB_CONNECTION = os.getenv("DB_CONNECTION")

if not DB_CONNECTION:
    raise ValueError(
        "DB_CONNECTION is not set. Please set it in your .env file "
        "(see .env.example / README for the expected format)."
    )

# SQL echo is noisy and slow for production; opt in via env var instead of
# hardcoding it on.
DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"

engine = create_engine(DB_CONNECTION, echo=DB_ECHO, pool_pre_ping=True)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()