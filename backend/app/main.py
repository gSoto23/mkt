from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine, SessionLocal
from app.models.base import Brand
from app.api import auth, ai, brands, social
from app.core.config import settings

# Initialize DB tables
Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    if not db.query(Brand).first():
        b1 = Brand(
            name="darboles", 
            target_audience="Personas con consciencia ambiental, decoradores del hogar, amantes de la naturaleza y jardinería urbana.",
            brand_voice_prompt="Ecológico, pacífico, educativo, directo y motivacional.",
            products_promotions="Venta de árboles frutales, pinos de interior, herramientas sustentables y kits de jardinería.",
            visual_identity={"colors": ["#2ecc71", "#27ae60", "#ecf0f1", "#ad974f"]},
            active_platforms=["Facebook", "Instagram"],
            master_prompt="Genera contenido valioso que invite a plantar y reconectar con la naturaleza desde casa."
        )
        db.add(b1)
        db.commit()
    db.close()

seed_db()

app = FastAPI(
    title="G-MKT AI API",
    description="API for Social Media AI Automation",
    version="1.0.0"
)

# CORS Config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(brands.router, prefix="/api/brands", tags=["brands"])
app.include_router(social.router, prefix="/api/social", tags=["social"])

@app.get("/")
def read_root():
    return {"message": "Welcome to G-MKT AI API"}
