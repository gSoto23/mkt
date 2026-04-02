import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from urllib.parse import urlencode
import base64
from typing import List

from app.db.database import get_db
from app.models.base import Brand, SocialAccount, Post
from app.core.config import settings

router = APIRouter()



@router.get("/meta_login")
def meta_login(brand_id: int):
    """
    Inicia el flujo de OAuth 2.0 redirigiendo al usuario a Facebook.
    Pasamos brand_id en el 'state' para recuperarlo en el callback.
    """
    if not settings.META_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Falta configurar META_CLIENT_ID en el archivo .env del backend. ¡Reinicia Uvicorn!")
        
    scopes = [
        "pages_manage_posts",
        "pages_read_engagement",
        "pages_show_list",
        "instagram_basic",
        "instagram_content_publish",
        "business_management",
        "public_profile"
    ]
    
    params = {
        "client_id": settings.META_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/social/meta_callback",
        "state": str(brand_id),
        "scope": ",".join(scopes),
        "response_type": "code",
        "auth_type": "rerequest"
    }
    
    auth_url = f"https://www.facebook.com/v19.0/dialog/oauth?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/meta_callback")
async def meta_callback(code: str, state: str, db: Session = Depends(get_db)):
    """
    Punto de retorno tras autorizar en Meta.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Code de Meta no provisto")
        
    brand_id = int(state) if state.isdigit() else None
    if not brand_id:
        raise HTTPException(status_code=400, detail="Invalid brand_id en state")
        
    if not settings.META_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="META_CLIENT_SECRET no está configurado")

    redirect_uri = f"{settings.BACKEND_URL}/api/social/meta_callback"

    async with httpx.AsyncClient() as client:
        # Petición 1: Canjeamos el code por un Short-Lived Token
        token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
        token_res = await client.get(token_url, params={
            "client_id": settings.META_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "client_secret": settings.META_CLIENT_SECRET,
            "code": code
        })
        token_data = token_res.json()
        
        if "access_token" not in token_data:
            raise HTTPException(status_code=400, detail=f"Fallo trayendo token. Meta dice: {token_data}")
            
        short_lived_token = token_data["access_token"]
        
        # Petición 2: Intercambiamos por un Long-Lived User Access Token
        long_res = await client.get(token_url, params={
            "grant_type": "fb_exchange_token",
            "client_id": settings.META_CLIENT_ID,
            "client_secret": settings.META_CLIENT_SECRET,
            "fb_exchange_token": short_lived_token
        })
        long_data = long_res.json()
        long_lived_token = long_data.get("access_token", short_lived_token)
        
        # Petición 3: Conseguir las Pages y sus Tokens perpetuos
        pages_res = await client.get("https://graph.facebook.com/v19.0/me/accounts", params={
            "access_token": long_lived_token,
            "fields": "id,name,access_token,instagram_business_account"
        })
        
        pages_data = pages_res.json()
        pages = pages_data.get("data", [])
        
        cuentas_añadidas = 0
        for page in pages:
            page_id = page["id"]
            page_token = page["access_token"] 
            
            # Guardamos/Actualizamos la página de FB
            db_page = db.query(SocialAccount).filter(SocialAccount.provider_account_id == page_id).first()
            if not db_page:
                db_page = SocialAccount(brand_id=brand_id, platform="facebook", provider_account_id=page_id)
                db.add(db_page)
            db_page.access_token = page_token
            db_page.brand_id = brand_id
            cuentas_añadidas += 1
            
            # Guardamos la página de Instagram Business (Si existe)
            if "instagram_business_account" in page:
                ig_id = page["instagram_business_account"]["id"]
                db_ig = db.query(SocialAccount).filter(SocialAccount.provider_account_id == ig_id).first()
                if not db_ig:
                    db_ig = SocialAccount(brand_id=brand_id, platform="instagram", provider_account_id=ig_id)
                    db.add(db_ig)
                db_ig.access_token = page_token # Ig usa el Page Token!
                db_ig.brand_id = brand_id
                cuentas_añadidas += 1
                
        db.commit()
    
    # Redirigir de regreso al Dashboard con un toast de exito opcional
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/?oauth=success&accounts={cuentas_añadidas}")

@router.get("/status/{brand_id}")
def check_status(brand_id: int, db: Session = Depends(get_db)):
    """Retorna si una marca tiene cuentas conectadas o no"""
    accounts = db.query(SocialAccount).filter(SocialAccount.brand_id == brand_id).all()
    platforms = [acc.platform for acc in accounts]
    return {
        "connected": len(accounts) > 0,
        "platforms": list(set(platforms)),
        "total_accounts": len(accounts)
    }

@router.get("/media/{post_id}")
def serve_media(post_id: int, db: Session = Depends(get_db)):
    """
    Ruta pública necesaria para que los servidores de Meta (Graph API)
    puedan descargar el video/imagen Base64 como un archivo real de internet.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    media_data = post.video_url if post.video_url else post.image_url
    if not media_data:
        raise HTTPException(status_code=404, detail="No media attached to post")
        
    # Extraer formato y base64 (ej: 'data:video/mp4;base64,AAAA...')
    try:
        header, encoded = media_data.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        binary_data = base64.b64decode(encoded)
        return Response(content=binary_data, media_type=mime_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Invalid media format in DB")

@router.get("/tiktok_login")
def tiktok_login(brand_id: int):
    if not settings.TIKTOK_CLIENT_KEY:
        raise HTTPException(status_code=500, detail="Falta configurar TIKTOK_CLIENT_KEY en el backend")
        
    scopes = ["user.info.basic", "video.publish"]
    redirect_uri = f"{settings.BACKEND_URL}/api/social/tiktok_callback"
    
    params = {
        "client_key": settings.TIKTOK_CLIENT_KEY,
        "response_type": "code",
        "scope": ",".join(scopes),
        "redirect_uri": redirect_uri,
        "state": str(brand_id)
    }
    
    auth_url = f"https://www.tiktok.com/v2/auth/authorize/?{urlencode(params)}"
    return RedirectResponse(url=auth_url)

@router.get("/tiktok_callback")
async def tiktok_callback(code: str, state: str, db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Code de TikTok no provisto")
        
    brand_id = int(state) if state.isdigit() else None
    if not brand_id:
        raise HTTPException(status_code=400, detail="Invalid brand_id en state")
        
    if not settings.TIKTOK_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="TIKTOK_CLIENT_SECRET faltante")

    redirect_uri = f"{settings.BACKEND_URL}/api/social/tiktok_callback"

    async with httpx.AsyncClient() as client:
        # Petición 1: Canjeamos el code por Access Token
        token_url = "https://open.tiktokapis.com/v2/oauth/token/"
        data = {
            "client_key": settings.TIKTOK_CLIENT_KEY,
            "client_secret": settings.TIKTOK_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        }
        token_res = await client.post(token_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        token_data = token_res.json()
        
        if "access_token" not in token_data:
            raise HTTPException(status_code=400, detail=f"Fallo trayendo token de TikTok: {token_data}")
            
        access_token = token_data["access_token"]
        open_id = token_data.get("open_id")
        refresh_token = token_data.get("refresh_token")
        
        # Guardamos/Actualizamos la cuenta de TikTok
        db_tt = db.query(SocialAccount).filter(SocialAccount.provider_account_id == open_id).first()
        if not db_tt:
            db_tt = SocialAccount(brand_id=brand_id, platform="tiktok", provider_account_id=open_id)
            db.add(db_tt)
        db_tt.access_token = access_token
        db_tt.refresh_token = refresh_token
        db_tt.brand_id = brand_id
        
        db.commit()
    
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/?oauth=success&accounts=1")
