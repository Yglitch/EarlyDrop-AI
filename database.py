import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DB_CONNECTION = os.getenv("DB_CONNECTION")

if not DB_CONNECTION:
    raise ValueError(
        "DB_CONNECTION is not set. Check /home/yash-rama/EarlyDrop-AI/.env"
    )

engine = create_engine(DB_CONNECTION, echo=True)

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