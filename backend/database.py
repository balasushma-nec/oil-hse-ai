import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, URL
from sqlalchemy.orm import Session

from models import Base, HSEReport


# Load environment variables from .env
load_dotenv()


# --------------------------------------------------
# Database configuration
# --------------------------------------------------

# Render provides DATABASE_URL.
# Local development uses the DB_* variables from .env.

DATABASE_URL_ENV = os.getenv("DATABASE_URL")

if DATABASE_URL_ENV:
    # Render may provide a postgres:// or postgresql:// URL.
    # Convert it to the psycopg driver used by this project.
    if DATABASE_URL_ENV.startswith("postgres://"):
        DATABASE_URL_ENV = DATABASE_URL_ENV.replace(
            "postgres://",
            "postgresql+psycopg://",
            1
        )
    elif DATABASE_URL_ENV.startswith("postgresql://"):
        DATABASE_URL_ENV = DATABASE_URL_ENV.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1
        )

    DATABASE_URL = DATABASE_URL_ENV

else:
    # Local PostgreSQL configuration
    DATABASE_URL = URL.create(
        drivername="postgresql+psycopg",
        username=os.getenv("DB_USERNAME"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        database=os.getenv("DB_NAME", "oil_hse_ai")
    )


# Create database engine
engine = create_engine(DATABASE_URL)


# --------------------------------------------------
# Test database connection
# --------------------------------------------------

def test_connection():
    try:
        with engine.connect():
            print("PostgreSQL connected successfully!")
    except Exception as e:
        print("Database connection failed:")
        print(e)


# --------------------------------------------------
# Create database tables
# --------------------------------------------------

def create_tables():
    Base.metadata.create_all(engine)
    print("Tables created successfully!")


# --------------------------------------------------
# Add sample reports
# --------------------------------------------------

def add_sample_reports():
    sample_reports = [
        HSEReport(
            report_date="2026-09-15",
            report_type="Near Miss",
            report_text="Worker entered a confined space without proper gas testing.",
            sif_potential=True,
            confidence_score=0.94
        ),

        HSEReport(
            report_date="2026-09-16",
            report_type="Unsafe Condition",
            report_text="Oil leakage was observed near the equipment operating area.",
            sif_potential=True,
            confidence_score=0.87
        ),

        HSEReport(
            report_date="2026-09-17",
            report_type="Unsafe Act",
            report_text="Worker was not wearing the required personal protective equipment.",
            sif_potential=False,
            confidence_score=0.91
        ),

        HSEReport(
            report_date="2026-09-18",
            report_type="Near Miss",
            report_text="Vehicle movement was observed near a pedestrian working area.",
            sif_potential=True,
            confidence_score=0.89
        )
    ]

    with Session(engine) as session:
        session.add_all(sample_reports)
        session.commit()

    print("Sample reports added successfully!")