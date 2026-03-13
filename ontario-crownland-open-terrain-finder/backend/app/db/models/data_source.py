from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    provider = Column(String)
    source_url = Column(String)
    format = Column(String)
    licence = Column(String)
    version_label = Column(String)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    checksum = Column(String)
    notes = Column(Text)
