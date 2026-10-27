from typing import List, Optional

from fastapi import APIRouter, Query

import services.directory_service as directory_service
from schemas.interview import DirectoryPerson

router = APIRouter()


@router.get("/directory/people", response_model=List[DirectoryPerson])
def read_people(q: Optional[str] = Query(None, description="Filter by name, email or role.")):
    """People who can be chosen as interviewer, CC or BCC when scheduling an interview."""
    return directory_service.list_people(q)
