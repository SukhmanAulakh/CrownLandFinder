from typing import Generator
from sqlalchemy.orm import Session
from app.db.session import engine

def get_db() -> Generator:
    # Minimal scoped session implementation
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
