"""
FastAPI dependency that provides a scoped SQLAlchemy session per request.

Yields a session and closes it after the request. Use with Depends(get_db).
"""
from typing import Generator
from sqlalchemy.orm import Session
from app.db.session import engine


def get_db() -> Generator[Session, None, None]:
    # Minimal scoped session implementation
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
