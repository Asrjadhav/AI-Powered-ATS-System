import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import Base
import models

def test_models_metadata_loading():
    """Verify that all 10 core ATS SQLAlchemy models are loaded into Base metadata."""
    expected_tables = {
        "users",
        "jobs",
        "candidates",
        "applications",
        "interviews",
        "offers",
        "notifications",
        "email_templates",
        "sent_emails",
        "system_tokens",
    }
    registered_tables = set(Base.metadata.tables.keys())
    for table in expected_tables:
        assert table in registered_tables, f"Table '{table}' missing from SQLAlchemy metadata"

def test_job_model_columns():
    """Verify JobModel contains jobId and required ATS fields."""
    job_table = Base.metadata.tables["jobs"]
    column_names = {col.name for col in job_table.columns}
    assert "id" in column_names
    assert "jobId" in column_names
    assert "title" in column_names
    assert "department" in column_names
    assert "createdBy" in column_names

def test_candidate_model_columns():
    """Verify CandidateModel contains candidateId and jobId fields."""
    cand_table = Base.metadata.tables["candidates"]
    column_names = {col.name for col in cand_table.columns}
    assert "id" in column_names
    assert "candidateId" in column_names
    assert "jobId" in column_names
    assert "skills" in column_names
