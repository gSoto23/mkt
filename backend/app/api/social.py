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
        "pages_manage_metadata",
        "pages_read_user_content",
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
            db_page = db.query(SocialAccount).filter(SocialAccount.provider_account_id == page_id, SocialAccount.brand_id == brand_id).first()
            if not db_page:
                db_page = SocialAccount(brand_id=brand_id, platform="facebook", provider_account_id=page_id)
                db.add(db_page)
            db_page.access_token = page_token
            db_page.brand_id = brand_id
            cuentas_añadidas += 1
            
            # Guardamos la página de Instagram Business (Si existe)
            if "instagram_business_account" in page:
                ig_id = page["instagram_business_account"]["id"]
                db_ig = db.query(SocialAccount).filter(SocialAccount.provider_account_id == ig_id, SocialAccount.brand_id == brand_id).first()
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

@router.get("/clear_meta/{brand_id}")
def clear_meta(brand_id: int, db: Session = Depends(get_db)):
    deleted = db.query(SocialAccount).filter(SocialAccount.brand_id == brand_id, SocialAccount.platform.in_(['facebook', 'instagram'])).delete()
    db.commit()
    return {"message": "Borradas", "deleted": deleted}

@router.get("/debug_meta/{brand_id}")
async def debug_meta(brand_id: int, db: Session = Depends(get_db)):
    acc = db.query(SocialAccount).filter(SocialAccount.brand_id == brand_id, SocialAccount.platform == 'facebook').first()
    if not acc:
        return {"error": "No facebook account connected"}
    
    app_id = settings.META_CLIENT_ID
    app_secret = settings.META_CLIENT_SECRET
    app_access_token = f"{app_id}|{app_secret}"

    async with httpx.AsyncClient() as client:
        res = await client.get("https://graph.facebook.com/v19.0/debug_token", params={
            "input_token": acc.access_token,
            "access_token": app_access_token
        })
        return res.json()

@router.api_route("/media/{filename}", methods=["GET", "HEAD"])
def serve_media(filename: str, db: Session = Depends(get_db)):
    """
    Ruta pública necesaria para que los servidores de Meta (Graph API)
    puedan descargar el video/imagen Base64 como un archivo real de internet.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[MEDIA ENDPOINT] Meta solicitó el archivo: {filename}")
    
    try:
        base_name = filename.split(".")[0]
        post_id_str = base_name.split("_")[0]
        post_id = int(post_id_str)
    except ValueError:
        logger.error(f"[MEDIA ENDPOINT] Invalid filename format: {filename}")
        raise HTTPException(status_code=400, detail="Invalid filename format")

    if post_id == 999999:
        logger.info("[MEDIA ENDPOINT] Sirviendo Imagen DUMMY de prueba")
        dummy_jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
        media_data = dummy_jpeg
    else:    
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            logger.error(f"[MEDIA ENDPOINT] Post {post_id} no encontrado en BD")
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Extraer formato y base64
        if filename.endswith('.mp4') and post.video_url:
            logger.info(f"[MEDIA ENDPOINT] Sirviendo Video para Post {post_id}")
            media_data = post.video_url
        else:
            logger.info(f"[MEDIA ENDPOINT] Sirviendo Imagen para Post {post_id}")
            media_data = post.image_url

    if not media_data:
        logger.error(f"[MEDIA ENDPOINT] Post {post_id} sin media adjunto")
        raise HTTPException(status_code=404, detail="No media attached to post")

    try:
        header, encoded = media_data.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        binary_data = base64.b64decode(encoded)
        
        # --- NUEVO: Sanitización Forzada de Meta a Baseline JPEG con Pillow ---
        # Solo lo aplicamos si NO es un video mp4
        if not filename.endswith('.mp4'):
            import io
            from PIL import Image
            
            # Forzar carga e ignorar perfiles corruptos 
            img = Image.open(io.BytesIO(binary_data))
            
            # Forzar sRGB/RGB (elimina canales Alpha .png o CMYK)
            if img.mode in ("RGBA", "P", "CMYK", "LA"):
                img = img.convert("RGB")
            elif img.mode != "RGB":
                img = img.convert("RGB")
                
            # Guardar en un buffer limpio como Standard JPEG compatible
            clean_io = io.BytesIO()
            img.save(clean_io, format="JPEG", quality=90, optimize=False)
            binary_data = clean_io.getvalue()
            mime_type = "image/jpeg"
            logger.info("[MEDIA ENDPOINT] Imagen limpiada exitosamente con Pillow a Baseline JPEG")
        
        logger.info(f"[MEDIA ENDPOINT] Exito decodificando Base64. Devolviendo Mime: {mime_type}, Bytes: {len(binary_data)}")
        headers = {
            "Content-Length": str(len(binary_data)),
            "Cache-Control": "public, max-age=31536000",
            "Access-Control-Allow-Origin": "*",
            "Accept-Ranges": "bytes"
        }
        return Response(content=binary_data, media_type=mime_type, headers=headers)
    except Exception as e:
        logger.error(f"[MEDIA ENDPOINT] Error crítico decodificando media: {e}")
        raise HTTPException(status_code=500, detail="Invalid media format in DB")

@router.get("/dump_logs")
def dump_logs():
    import os
    import subprocess
    home_dir = os.path.expanduser("~")
    # Intentar leer desde .pm2 o desde el wrapper local
    log_file = os.path.join(home_dir, ".pm2", "logs", "gmkt-celery-out.log")
    
    if not os.path.exists(log_file):
        log_file = os.path.join(home_dir, ".pm2", "logs", "gmkt-backend-out.log")
        
    res = {}
    if os.path.exists(log_file):
        try:
            res["out"] = subprocess.check_output(["tail", "-n", "100", log_file]).decode("utf-8", errors="ignore")
        except Exception as e:
            res["error"] = str(e)
            
    err_file = os.path.join(home_dir, ".pm2", "logs", "gmkt-backend-error.log")
    if os.path.exists(err_file):
        res["backend_err"] = subprocess.check_output(["tail", "-n", "100", err_file]).decode("utf-8", errors="ignore")
        
    # Añadir los ultimos 3 post IDs para depurar remotamente
    try:
        from app.db.database import SessionLocal
        from app.models.base import Post
        db = SessionLocal()
        posts = db.query(Post).order_by(Post.id.desc()).limit(3).all()
        res["latest_posts"] = [
            f"ID: {p.id}, has_img: {bool(p.image_url)}, has_vid: {bool(p.video_url)}"
            for p in posts
        ]
        db.close()
    except Exception as e:
        res["db_err"] = str(e)
        
    return res

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
        db_tt = db.query(SocialAccount).filter(SocialAccount.provider_account_id == open_id, SocialAccount.brand_id == brand_id).first()
        if not db_tt:
            db_tt = SocialAccount(brand_id=brand_id, platform="tiktok", provider_account_id=open_id)
            db.add(db_tt)
        db_tt.access_token = access_token
        db_tt.refresh_token = refresh_token
        db_tt.brand_id = brand_id
        
        db.commit()
    
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/?oauth=success&accounts=1")
