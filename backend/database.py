import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Ensure backend/.env is loaded relative to database.py location
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ats_db")

# Create engine with fallback for static code imports if driver is missing
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )
except Exception as e:
    engine = create_engine("sqlite:///:memory:")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db_schema_migrations():
    """
    Executes ALTER TABLE statements to drop NOT NULL constraints on jobId columns
    in applications, interviews, and offers tables for PostgreSQL compatibility.
    """
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text('ALTER TABLE applications ALTER COLUMN "jobId" DROP NOT NULL;'))
            conn.execute(text('ALTER TABLE interviews ALTER COLUMN "jobId" DROP NOT NULL;'))
            conn.execute(text('ALTER TABLE offers ALTER COLUMN "jobId" DROP NOT NULL;'))
            conn.commit()
    except Exception:
        pass
