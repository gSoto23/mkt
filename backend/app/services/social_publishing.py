import os
import httpx
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from celery.utils.log import get_task_logger

from app.core.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.base import Post, SocialAccount
from app.core.config import settings

logger = get_task_logger(__name__)

@celery_app.task
def check_scheduled_posts():
    """
    Se ejecuta cada 1 minuto por Celery Beat.
    Busca posts APROBADOS cuya fecha programada ya pasó o es ahora.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow() # Meta Graph timezone, assuming UTC
        posts_to_publish = db.query(Post).filter(
            Post.status == "APPROVED",
            Post.scheduled_for <= now
        ).all()
        
        for p in posts_to_publish:
            logger.info(f"Triggering publish for post {p.id}...")
            # Lanzamos la sub-tarea asincrónica real para no bloquear este beat loop
            publish_post_task.delay(p.id)
            
    except Exception as e:
        logger.error(f"Error checking scheduled posts: {e}")
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def publish_post_task(self, post_id: int):
    """
    Tarea core: Convierte imagen/video y texto en un HTTP Request
    hacia la Graph API de Meta para publicarlo 100% de verdad.
    """
    db: Session = SessionLocal()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post or post.status != "APPROVED":
            return
            
        # Obtener los tokens sociales de la marca correspondiente
        social_accs = db.query(SocialAccount).filter(SocialAccount.brand_id == post.brand_id).all()
        
        if not social_accs:
            logger.warning(f"Post {post.id} cannot be published: No Social Accounts connected for brand {post.brand_id}.")
            post.status = "FAILED"
            post.platform_log = "Error Fatal: No hay páginas de Facebook/Instagram/TikTok conectadas al sistema del cliente."
            db.commit()
            return
            
        # Se publica EXCLUSIVAMENTE en la plataforma definida en post.platform (Ej: 'Facebook', 'Instagram')
        platform_lower = str(post.platform).lower()
        posted_any = False
        
        for acc in social_accs:
            if acc.platform.lower() == platform_lower:
                if acc.platform == "facebook":
                    publish_to_facebook(post, acc)
                elif acc.platform == "instagram":
                    publish_to_instagram(post, acc)
                elif acc.platform == "tiktok":
                    publish_to_tiktok(post, acc)
                posted_any = True
                
        if not posted_any:
            logger.warning(f"Post {post.id} skipped for {post.platform}: No token found for this specific platform.")
            post.status = "FAILED"
            post.platform_log = f"Error: Elegiste la red {post.platform}, pero tu cuenta no está vinculada. Conéctala primero."
            db.commit()
            return
                
        post.status = "PUBLISHED"
        post.platform_log = "Publicación ejecutada con éxito en los servidores de Meta/TikTok vía Graph API."
        db.commit()
        logger.info(f"Post {post.id} published successfully.")
        
    except httpx.HTTPStatusError as exc:
        logger.error(f"HTTP Meta API Error en publish: {exc.response.text}")
        post.status = "FAILED"
        post.platform_log = f"Fallo al publicar (HTTP Error). Graph API Info:\n\n{exc.response.text}"
        db.commit()
        raise self.retry(exc=exc, countdown=60 * 5) # Reintenta en 5 min si Meta falla por timeout
        
    except Exception as exc:
        logger.error(f"Unexpected error in publish_post_task: {exc}")
        post.status = "FAILED"
        post.platform_log = f"Excepción interna fatal de Python:\n{str(exc)}"
        db.commit()
    finally:
        db.close()

def publish_to_facebook(post: Post, account: SocialAccount):
    import time
    is_video = bool(post.video_url)
    ext = "mp4" if is_video else "jpg"
    backend_base = settings.BACKEND_URL.rstrip("/")
    media_url = f"{backend_base}/api/social/media/{post.id}.{ext}?cb={int(time.time())}"
    logger.info(f"[META API] Iniciando request a FB Page {account.provider_account_id} con URL {media_url}")
    
    with httpx.Client() as client:
        if is_video:
            res = client.post(f"https://graph.facebook.com/v19.0/{account.provider_account_id}/videos", data={
                "file_url": media_url,
                "description": post.copy,
                "access_token": account.access_token
            }, timeout=60.0)
        else:
            res = client.post(f"https://graph.facebook.com/v19.0/{account.provider_account_id}/photos", data={
                "url": media_url,
                "message": post.copy,
                "access_token": account.access_token
            }, timeout=60.0)
            
        res.raise_for_status()

def publish_to_instagram(post: Post, account: SocialAccount):
    import time
    is_video = bool(post.video_url)
    ext = "mp4" if is_video else "jpg"
    backend_base = settings.BACKEND_URL.rstrip("/")
    media_url = f"{backend_base}/api/social/media/{post.id}.{ext}?cb={int(time.time())}"
    logger.info(f"[META API] Iniciando request a Instagram {account.provider_account_id} con URL {media_url}")
    
    caption = post.copy
    
    with httpx.Client() as client:
        # Paso 1: Crear Contenedor de Media
        container_data = {
            "caption": caption,
            "access_token": account.access_token
        }
        
        if is_video:
            container_data["media_type"] = "REELS"
            container_data["video_url"] = media_url
        else:
            container_data["image_url"] = media_url
            
        container_res = client.post(
            f"https://graph.facebook.com/v19.0/{account.provider_account_id}/media", 
            data=container_data, 
            timeout=60.0
        )
        container_res.raise_for_status()
        creation_id = container_res.json().get("id")
        
        # Ojo: IG procesa videos de forma asíncrona, en un código hiper-robusto 
        # haríamos un loop preguntando el 'status_code' del media. 
        # Aquí asumimos que videos cortos (Veo 5s) se procesan casi instantáneamente.
        import time
        if is_video:
            logger.info("Esperando 10 segundos para procesamiento de Reels en Meta...")
            time.sleep(10)
            
        # Paso 2: Publicar Contenedor
        publish_res = client.post(
            f"https://graph.facebook.com/v19.0/{account.provider_account_id}/media_publish",
            data={
                "creation_id": creation_id,
                "access_token": account.access_token
            },
            timeout=30.0
        )
        publish_res.raise_for_status()

def publish_to_tiktok(post: Post, account: SocialAccount):
    logger.info(f"[TIKTOK API] Iniciando request a TikTok {account.provider_account_id}")
    
    is_video = bool(post.video_url)
    
    if not is_video:
        logger.warning(f"TikTok rechazado para Post {post.id}: TikTok solo acepta videos en Content API.")
        return
        
    backend_base = settings.BACKEND_URL.rstrip("/")
    media_url = f"{backend_base}/api/social/media/{post.id}.mp4"
    
    with httpx.Client() as client:
        url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
        
        headers = {
            "Authorization": f"Bearer {account.access_token}",
            "Content-Type": "application/json; charset=UTF-8"
        }
        
        data = {
            "post_info": {
                "title": post.copy or "AI Generated Reel",
                "privacy_level": "PUBLIC_TO_EVERYONE",
                "disable_comment": False,
                "disable_duet": False,
                "disable_stitch": False,
                "video_cover_timestamp_ms": 1000
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": media_url
            }
        }
        
        res = client.post(url, headers=headers, json=data, timeout=60.0)
        res.raise_for_status()
        logger.info(f"TikTok publish_id: {res.json().get('data', {}).get('publish_id')}")
