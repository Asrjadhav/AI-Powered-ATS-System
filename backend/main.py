import os
import logging
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine, Base  # also loads backend/.env
import config
import logging_config
import models # Load all 11 models into SQLAlchemy Base metadata

# Logging must be configured after `database` has loaded backend/.env (so LOG_LEVEL / LOG_FILE
# from it apply) and before any startup work, so every step below is logged.
logging_config.setup_logging()
logger = logging.getLogger("ats.startup")


def _log_startup_summary() -> None:
    """One line per area saying what is configured. Booleans only: no values are ever logged."""
    dialect = engine.dialect.name
    if dialect == "postgresql":
        logger.info("Database: PostgreSQL")
    else:
        logger.warning(
            "Database: %s, NOT PostgreSQL. DATABASE_URL could not be used (missing driver?), so "
            "data lives in a throwaway database.", dialect,
        )
    logger.info("Gemini AI screening: %s", "configured" if config.GEMINI_API_KEY else "NOT configured (fallback scoring engine is used)")
    logger.info("Email (SMTP): %s", "configured" if config.SMTP_HOST else "NOT configured (no email will be sent)")
    meet_ready = bool((config.GOOGLE_SERVICE_ACCOUNT_FILE or config.GOOGLE_SERVICE_ACCOUNT_JSON) and config.GOOGLE_CALENDAR_ORGANIZER_EMAIL)
    logger.info("Google Meet: %s", "configured" if meet_ready else "NOT configured (interview emails will say the Meet link is unavailable)")
    logger.info("Login CAPTCHA (Turnstile): %s", "configured" if config.TURNSTILE_SECRET_KEY else "NOT configured (login will be refused)")
    logger.info("ATS match threshold: %s%%", config.ATS_MATCH_THRESHOLD)


_log_startup_summary()

# 1. Safely create all missing PostgreSQL tables on startup (non-destructive)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables checked/created (create_all)")
except Exception as _e:
    logger.error("Database table initialization failed: %s", _e)

try:
    from migrate_job_id_nullable import run_migration
    run_migration()
    logger.info("Migration finished: jobId nullability")
except Exception as _mig_err:
    logger.error("Migration failed: %s", _mig_err)

# 3. Seed default records safely if tables are brand new (idempotent checks)
try:
    from seed_notifications import seed_notifications
    from seed_email_templates import seed_email_templates
    from seed_users import seed_users
    seed_notifications()
    seed_email_templates()
    seed_users()
    logger.info("Default data seeding finished (notifications, email templates, users)")
except Exception as _seed_err:
    logger.error("Default data seeding failed: %s", _seed_err)

app = FastAPI(
    title="AI ATS FastAPI Backend",
    description="FastAPI Backend Foundation for AI Applicant Tracking System",
    version="1.0.0"
)

# Configure CORS for Vite (http://localhost:5173), Express (http://localhost:3000), and production Render domains
origins = [
    "https://ai-powered-ats-system-5avq.onrender.com",
    "https://ats-fastapi-backend.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added last so it is the outermost layer: it sees (and times) every request, including CORS preflights.
app.add_middleware(logging_config.RequestLoggingMiddleware)

@app.get("/healthz", tags=["Health"])
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """
    Phase 1A Health Check Endpoint.
    Verifies FastAPI application startup and PostgreSQL database connection.
    """
    db_connected = False
    error_detail = None
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception as e:
        error_detail = str(e)

    if db_connected:
        return {
            "status": "ok",
            "database": "connected"
        }
    else:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
                "detail": error_detail
            }
        )

from routers.jobs import router as jobs_router
from routers.job_import import router as job_import_router
from routers.candidates import router as candidates_router
from routers.applications import router as applications_router
from routers.interviews import router as interviews_router
from routers.directory import router as directory_router
from routers.talent_pool import router as talent_pool_router
from routers.offers import router as offers_router
from routers.email_templates import router as email_templates_router
from routers.notifications import router as notifications_router
from routers.stats import router as stats_router
from routers.insights import router as insights_router
from routers.users import router as users_router
from routers.report_schedules import router as report_schedules_router
from routers.google_calendar import router as google_calendar_router
from routers.emails import router as emails_router
from routers.auth import router as auth_router

# Registered before jobs_router so /jobs/import is matched literally and never
# captured by the /jobs/{id} routes.
app.include_router(job_import_router, prefix="/api", tags=["Job Import"])
app.include_router(jobs_router, prefix="/api", tags=["Jobs"])
app.include_router(candidates_router, prefix="/api", tags=["Candidates"])
app.include_router(applications_router, prefix="/api", tags=["Applications"])
app.include_router(interviews_router, prefix="/api", tags=["Interviews"])
app.include_router(directory_router, prefix="/api", tags=["Directory"])
app.include_router(talent_pool_router, prefix="/api", tags=["Talent Pool"])
app.include_router(offers_router, prefix="/api", tags=["Offers"])
app.include_router(email_templates_router, prefix="/api", tags=["Email Templates"])
app.include_router(notifications_router, prefix="/api", tags=["Notifications"])
app.include_router(stats_router, prefix="/api", tags=["Stats"])
app.include_router(insights_router, prefix="/api", tags=["Insights"])
app.include_router(users_router, prefix="/api", tags=["Users"])
app.include_router(report_schedules_router, prefix="/api", tags=["Report Schedules"])
app.include_router(google_calendar_router, prefix="/api", tags=["Google Calendar"])
app.include_router(emails_router, prefix="/api", tags=["Emails"])
app.include_router(auth_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
