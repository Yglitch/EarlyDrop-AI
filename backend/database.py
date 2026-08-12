from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

DB_CONNECTION = os.getenv("DB_CONNECTION")

# Create an engine that conntects to the PostgreSQL database using the connection string from the .env file
engine = create_engine(DB_CONNECTION)

#Create a session factory that will be used to create new sessions for interacting with the database
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Create a base class for declarative models that will be used to define the database schema
Base = declarative_base()

# Dependency function that will be used to get a new database session for each request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  