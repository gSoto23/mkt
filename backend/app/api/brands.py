from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Brand

router = APIRouter()

class BrandUpdateADN(BaseModel):
    name: str = ""
    target_audience: str = ""
    brand_voice_prompt: str = ""
    products_promotions: str = ""
    visual_identity: dict = {}
    active_platforms: list = []
    master_prompt: str = ""
    news_trend: str = ""
    reference_images: list = []

@router.get("/")
def list_brands(db: Session = Depends(get_db)):
    return db.query(Brand).all()

class BrandCreate(BaseModel):
    name: str = ""
    target_audience: str = ""
    brand_voice_prompt: str = ""
    products_promotions: str = ""
    visual_identity: dict = {}
    active_platforms: list = []
    master_prompt: str = ""
    news_trend: str = ""
    reference_images: list = []

@router.post("/")
def create_brand(request: BrandCreate, db: Session = Depends(get_db)):
    new_brand = Brand(
        name=request.name,
        target_audience=request.target_audience,
        brand_voice_prompt=request.brand_voice_prompt,
        products_promotions=request.products_promotions,
        visual_identity=request.visual_identity,
        active_platforms=request.active_platforms,
        master_prompt=request.master_prompt,
        news_trend=request.news_trend,
        reference_images=request.reference_images
    )
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)
    return new_brand

@router.get("/{brand_id}")
def get_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
         raise HTTPException(status_code=404, detail="Marca no encontrada")
    return brand

@router.put("/{brand_id}")
def update_brand(brand_id: int, request: BrandUpdateADN, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
         raise HTTPException(status_code=404, detail="Marca no encontrada")
         
    brand.name = request.name
    brand.target_audience = request.target_audience
    brand.brand_voice_prompt = request.brand_voice_prompt
    brand.products_promotions = request.products_promotions
    brand.visual_identity = request.visual_identity
    brand.active_platforms = request.active_platforms
    brand.master_prompt = request.master_prompt
    brand.news_trend = request.news_trend
    brand.reference_images = request.reference_images
    
    db.commit()
    return {"message": "ADN Actualizado correctamente"}

@router.delete("/{brand_id}")
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
         raise HTTPException(status_code=404, detail="Marca no encontrada")
         
    db.delete(brand)
    db.commit()
    return {"message": "Marca y todo su contenido asociado fueron eliminados correctamente"}
