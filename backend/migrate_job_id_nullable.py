import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import engine
from sqlalchemy import text, inspect

def run_migration():
    print("Executing PostgreSQL Schema Migration for Job ID Nullability...")
    with engine.connect() as conn:
        inspector = inspect(engine)
        for tbl in ["applications", "interviews", "offers", "candidates"]:
            if inspector.has_table(tbl):
                cols = inspector.get_columns(tbl)
                for col in cols:
                    cname = col["name"]
                    if cname.lower() == "jobid":
                        print(f"Altering {tbl}.{cname} to DROP NOT NULL...")
                        try:
                            conn.execute(text(f'ALTER TABLE "{tbl}" ALTER COLUMN "{cname}" DROP NOT NULL;'))
                            conn.commit()
                            print(f"SUCCESS: {tbl}.{cname} is now nullable.")
                        except Exception as e:
                            print(f"Note on altering {tbl}.{cname}: {e}")

if __name__ == "__main__":
    run_migration()
