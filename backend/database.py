from sqlalchemy import create_engine, URL
from sqlalchemy.orm import Session

from models import Base, HSEReport


DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username="postgres",
    password="bala@86400",
    host="localhost",
    port=5432,
    database="oil_hse_ai"
)

engine = create_engine(DATABASE_URL)


def test_connection():
    try:
        with engine.connect():
            print("PostgreSQL connected successfully!")
    except Exception as e:
        print("Database connection failed:")
        print(e)


def create_tables():
    Base.metadata.create_all(engine)
    print("Tables created successfully!")


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