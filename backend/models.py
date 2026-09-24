from sqlalchemy import Boolean, Date, Integer, Text, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class HSEReport(Base):
    __tablename__ = "hse_reports"

    report_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_date: Mapped[str] = mapped_column(Date)
    report_type: Mapped[str] = mapped_column(Text)
    report_text: Mapped[str] = mapped_column(Text)
    sif_potential: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)