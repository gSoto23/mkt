from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.orm import Session
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app.core.config import settings
from app.core.security import verify_password, create_access_token, get_current_user
from app.db.database import get_db
from app.models.base import SocialAccount, User

router = APIRouter()

router = APIRouter()

# --- AUTENTICACIÓN PROPIA (JWT) ---
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales incorrectas")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id}

# --- META (Facebook/Instagram) ---
@router.get("/meta/login")
def login_meta(brand_id: int):
    """ Redirige al usuario al inicio de sesión de Meta """
    state = str(brand_id) # Usamos state para mantener el contexto del brand_id
    url = f"https://www.facebook.com/v19.0/dialog/oauth?client_id={settings.META_CLIENT_ID}&redirect_uri={settings.META_REDIRECT_URI}&state={state}&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish"
    return RedirectResponse(url)

@router.get("/meta/callback")
async def callback_meta(code: str, state: str, db: Session = Depends(get_db)):
    """ Recibe el código de Meta y lo intercambia por un Access Token """
    brand_id = int(state)
    token_url = f"https://graph.facebook.com/v19.0/oauth/access_token?client_id={settings.META_CLIENT_ID}&redirect_uri={settings.META_REDIRECT_URI}&client_secret={settings.META_CLIENT_SECRET}&code={code}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(token_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Error obteniendo token de Meta")
        
        data = response.json()
        access_token = data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Token no encontrado en la respuesta")
        
        # Extender el Token para larga duración (Long-Lived Token)
        extend_url = f"https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id={settings.META_CLIENT_ID}&client_secret={settings.META_CLIENT_SECRET}&fb_exchange_token={access_token}"
        extend_resp = await client.get(extend_url)
        long_lived_data = extend_resp.json()
        long_lived_token = long_lived_data.get("access_token", access_token)

        # Guardar en base de datos
        # Primero buscamos si ya existe una cuenta de Facebook para esta marca
        account = db.query(SocialAccount).filter(
            SocialAccount.brand_id == brand_id,
            SocialAccount.platform == "meta"
        ).first()

        if not account:
            account = SocialAccount(brand_id=brand_id, platform="meta")
            db.add(account)
        
        account.access_token = long_lived_token
        db.commit()

    return RedirectResponse("http://localhost:3000/dashboard?auth=success&platform=meta")

# --- TIKTOK ---
@router.get("/tiktok/login")
def login_tiktok(brand_id: int):
    """ Redirige al usuario al inicio de sesión de TikTok """
    state = str(brand_id)
    url = f"https://www.tiktok.com/v2/auth/authorize/?client_key={settings.TIKTOK_CLIENT_KEY}&response_type=code&scope=video.publish,video.upload&redirect_uri={settings.TIKTOK_REDIRECT_URI}&state={state}"
    return RedirectResponse(url)

@router.get("/tiktok/callback")
async def callback_tiktok(code: str, state: str, db: Session = Depends(get_db)):
    """ Recibe el código de TikTok y lo intercambia por un Access Token """
    brand_id = int(state)
    token_url = "https://open.tiktokapis.com/v2/oauth/token/"
    
    payload = {
        "client_key": settings.TIKTOK_CLIENT_KEY,
        "client_secret": settings.TIKTOK_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.TIKTOK_REDIRECT_URI
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Error obteniendo token de TikTok")
        
        data = response.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        
        if not access_token:
             raise HTTPException(status_code=400, detail="Token no encontrado en la repuesta de TikTok")

        account = db.query(SocialAccount).filter(
            SocialAccount.brand_id == brand_id,
            SocialAccount.platform == "tiktok"
        ).first()

        if not account:
            account = SocialAccount(brand_id=brand_id, platform="tiktok")
            db.add(account)
        
        account.access_token = access_token
        account.refresh_token = refresh_token
        db.commit()

    return RedirectResponse("http://localhost:3000/dashboard?auth=success&platform=tiktok")
