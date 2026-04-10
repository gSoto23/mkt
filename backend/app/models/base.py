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
    ad_accounts = relationship("AdAccount", back_populates="brand", cascade="all, delete-orphan")

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
    media_type = Column(String, default="IMAGE") # IMAGE, VIDEO, CAROUSEL, STORY, REEL
    copy = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    video_url = Column(Text, nullable=True) # Para reels MP4 en Base64
    media_urls = Column(JSON, nullable=True) # Para carruseles / stories múltiples ["url1", "url2"]
    media_prompt = Column(Text, nullable=True) # Prompt de imagen que sugirió Gemini
    platform_log = Column(Text, nullable=True) # Log detallado de Meta/TikTok
    metrics = Column(JSON, nullable=True) # {"likes": 0, "comments": 0, "reach": 0}

    status = Column(String, default="PENDING_APPROVAL") # PENDING_APPROVAL, APPROVED, PUBLISHED, FAILED
    scheduled_for = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    brand = relationship("Brand", back_populates="posts")

class AdAccount(Base):
    __tablename__ = "ad_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"))
    platform = Column(String) # facebook, tiktok
    ad_account_id = Column(String) 
    access_token = Column(String)
    
    brand = relationship("Brand", back_populates="ad_accounts")
    campaigns = relationship("AdCampaign", back_populates="ad_account", cascade="all, delete-orphan")

class AdCampaign(Base):
    __tablename__ = "ad_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    ad_account_id = Column(Integer, ForeignKey("ad_accounts.id"))
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True) # None para Dark Posts
    
    name = Column(String)
    campaign_type = Column(String) # BOOST, DARK_POST
    status = Column(String, default="ACTIVE") # ACTIVE, PAUSED, COMPLETED
    budget_daily = Column(Integer)
    target_audience = Column(JSON)
    
    impressions = Column(Integer, default=0)
    spend = Column(Integer, default=0) # en centavos
    clicks = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    ad_account = relationship("AdAccount", back_populates="campaigns")
    post = relationship("Post")
