import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://pinboard:pinboard@localhost:5433/pinboard"
)
# Render/Heroku-style Postgres URLs use the "postgres://" scheme, which SQLAlchemy no
# longer accepts — normalize to "postgresql://" so either form works.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
