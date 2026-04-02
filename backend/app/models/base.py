from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
class Brand(Base):
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True) # Misión de la marca, meta
    
    # ADN de la marca para IA
    target_audience = Column(Text, nullable=True)
    brand_voice_prompt = Column(Text, nullable=True)
    products_promotions = Column(Text, nullable=True)
    visual_identity = Column(JSON, nullable=True) # { "colors": ["#fff"], "font": "Inter", "logo": "url" }
    
    active_platforms = Column(JSON, nullable=True) # ["Facebook", "Instagram", "TikTok"]
    master_prompt = Column(Text, nullable=True)
    news_trend = Column(Text, nullable=True) # Noticias trending para basar el contenido
    reference_images = Column(JSON, nullable=True) # Array of Base64 strings ["data:image/jpeg;..."]
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    posts = relationship("Post", back_populates="brand", cascade="all, delete-orphan")
    social_accounts = relationship("SocialAccount", back_populates="brand", cascade="all, delete-orphan")

class SocialAccount(Base):
    __tablename__ = "social_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"))
    platform = Column(String) # facebook, instagram, tiktok
    provider_account_id = Column(String) 
    access_token = Column(String)
    refresh_token = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    brand = relationship("Brand", back_populates="social_accounts")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"))
    
    platform = Column(String) # meta, tiktok
    copy = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    video_url = Column(Text, nullable=True) # Para reels MP4 en Base64
    media_prompt = Column(Text, nullable=True) # Prompt de imagen que sugirió Gemini
    platform_log = Column(Text, nullable=True) # Log detallado de Meta/TikTok

    status = Column(String, default="PENDING_APPROVAL") # PENDING_APPROVAL, APPROVED, PUBLISHED, FAILED
    scheduled_for = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    brand = relationship("Brand", back_populates="posts")
