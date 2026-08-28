from sqlalchemy import Column, String, Text, BigInteger
from database import Base

class SystemTokenModel(Base):
    __tablename__ = "system_tokens"

    id = Column(String, primary_key=True, index=True)
    tokenType = Column(String, nullable=False)
    accessToken = Column(Text, nullable=True)
    refreshToken = Column(Text, nullable=True)
    expiryDate = Column(BigInteger, nullable=True)
    updatedAt = Column(String, nullable=True)
