import os
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine, Base
import models # Load all models into SQLAlchemy Base metadata

try:
    with engine.connect() as _conn:
        _conn.execute(text('ALTER TABLE candidates ADD COLUMN IF NOT EXISTS "totalExperienceMonths" INTEGER DEFAULT 0;'))
        _conn.commit()
except Exception:
    pass

app = FastAPI(
    title="AI ATS FastAPI Backend",
    description="FastAPI Backend Foundation for AI Applicant Tracking System",
    version="1.0.0"
)

# Configure CORS for Vite (http://localhost:5173), Express (http://localhost:3000), and local dev
origins = [
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
from routers.candidates import router as candidates_router
from routers.applications import router as applications_router
from routers.interviews import router as interviews_router
from routers.talent_pool import router as talent_pool_router
from routers.offers import router as offers_router
from routers.email_templates import router as email_templates_router
from routers.notifications import router as notifications_router

app.include_router(jobs_router, prefix="/api", tags=["Jobs"])
app.include_router(candidates_router, prefix="/api", tags=["Candidates"])
app.include_router(applications_router, prefix="/api", tags=["Applications"])
app.include_router(interviews_router, prefix="/api", tags=["Interviews"])
app.include_router(talent_pool_router, prefix="/api", tags=["Talent Pool"])
app.include_router(offers_router, prefix="/api", tags=["Offers"])
app.include_router(email_templates_router, prefix="/api", tags=["Email Templates"])
app.include_router(notifications_router, prefix="/api", tags=["Notifications"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
