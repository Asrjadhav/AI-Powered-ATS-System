import sys
import os
sys.path.insert(0, os.path.abspath("backend"))

from database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE candidates ADD COLUMN IF NOT EXISTS "totalExperienceMonths" INTEGER DEFAULT 0;'))
        conn.commit()
        print("Successfully added totalExperienceMonths column to candidates table in PostgreSQL!")

if __name__ == "__main__":
    run_migration()
