from sqlalchemy import Column, String, Text, JSON
from database import Base

class EmailTemplateModel(Base):
    __tablename__ = "email_templates"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String, nullable=True, default="General")
    variables = Column(JSON, nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)
