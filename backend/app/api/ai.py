from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import logging
import base64
from app.core.config import settings
from app.db.database import get_db
from app.models.base import Brand, Post
from google import genai
from google.genai import types

router = APIRouter()

try:
    if settings.GEMINI_API_KEY:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
    else:
        client = None
except Exception as e:
    client = None
    logging.error(f"Error inicializando Gemini: {e}")

class GenerateBatchRequest(BaseModel):
    brand_id: int
    post_counts: dict = {"Facebook": 1, "Instagram": 1} # e.g. {"Facebook": 2, "TikTok": 1}

@router.post("/generate-batch")
def generate_batch(request: GenerateBatchRequest, db: Session = Depends(get_db)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API no configurada.")
        
    brand = db.query(Brand).filter(Brand.id == request.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada en BD")

    visual_guidelines = json.dumps(brand.visual_identity) if brand.visual_identity else "No definido."
    platforms_str = ", ".join([f"{count} posts para {plat}" for plat, count in request.post_counts.items()])
    total_posts = sum(request.post_counts.values())
    custom_master_prompt = brand.master_prompt if brand.master_prompt else "Diseña una estrategia altamente atractiva."
    news_context = f"Noticia o tendencia clave a incluir: {brand.news_trend}" if brand.news_trend else "No hay noticias recientes."

    system_prompt = (
        f"Eres un Director de Marketing experto operando G-MKT AI. "
        f"Tu cliente es: {brand.name}. Su audiencia o target es: {brand.target_audience}. "
        f"El tono de voz requerido es: {brand.brand_voice_prompt}. "
        f"Productos o promociones a impulsar: {brand.products_promotions}. "
        f"Sus guías visuales (colores corporativos, estilo): {visual_guidelines}. "
        f"DIRECTRIZ ESTRATÉGICA MAESTRA: {custom_master_prompt}. "
        f"{news_context}. "
        f"IMPORTANTE: Debes generar exactamente un total de {total_posts} publicaciones distribuidos de esta manera: {platforms_str}. NO generes contenido para ninguna otra plataforma ni alteres las cantidades. "
        "SOLO devuelve un arreglo JSON estricto con la siguiente estructura y ni una sola palabra más (retorna codígo json válido): "
        '[{ "day_offset": 1, "platform": "Facebook", "copy": "...", "image_prompt": "Instrucción MUY DETALLADA en inglés para DALL-E/Imagen3. DEBE indicar: 1) Forma para [Plataforma], 2) Aspect ratio técnico, 3) Elementos visuales y colores." }]'
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=system_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        posts_data = json.loads(response.text)
    except Exception as e:
        logging.error(f"Error generando texto JSON: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini falló al generar la grilla: {e}")

    generated_posts = []
    
    # 2. Guardar en BD sin generar imagen todavía (para hacerlo veloz y darle control al usuario)
    for item in posts_data:
        offset = item.get("day_offset", 1)
        schedule_date = datetime.now() + timedelta(days=offset)
        
        new_post = Post(
            brand_id=brand.id,
            platform=item.get("platform", "Instagram"),
            copy=item.get("copy", ""),
            media_prompt=item.get("image_prompt", f"Aesthetic flatlay related to {brand.name}"),
            image_url=None, # La imagen la creará el director en la fase de aprobación
            status="PENDING_APPROVAL",
            scheduled_for=schedule_date
        )
        db.add(new_post)
        generated_posts.append(new_post)

    db.commit()
    return {"message": f"{len(generated_posts)} ideas de posts generadas listas para aprobación", "status": "success"}

@router.get("/posts/{brand_id}")
def get_pending_posts(brand_id: int, db: Session = Depends(get_db)):
    posts = db.query(Post).filter(Post.brand_id == brand_id).order_by(Post.scheduled_for.asc()).all()
    results = []
    for p in posts:
        b_url = settings.BACKEND_URL.rstrip('/')
        results.append({
            "id": p.id,
            "brand_id": p.brand_id,
            "platform": p.platform,
            "copy": p.copy,
            "image_url": f"{b_url}/api/social/media/{p.id}_t.jpg" if p.image_url else None,
            "video_url": f"{b_url}/api/social/media/{p.id}_t.mp4" if p.video_url else None,
            "media_prompt": p.media_prompt,
            "status": p.status,
            "platform_log": p.platform_log,
            "scheduled_for": p.scheduled_for.isoformat() + "Z" if p.scheduled_for else None,
            "approved_at": p.approved_at.isoformat() + "Z" if p.approved_at else None
        })
    return results

@router.get("/posts_global")
def get_global_posts(brand_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Post).join(Brand)
    if brand_id:
        query = query.filter(Post.brand_id == brand_id)
        
    posts = query.order_by(Post.scheduled_for.asc()).all()
    results = []
    for p in posts:
        brand_colors = []
        if p.brand and p.brand.visual_identity and isinstance(p.brand.visual_identity, dict):
            brand_colors = p.brand.visual_identity.get("colors", [])
            
        b_url = settings.BACKEND_URL.rstrip('/')
        results.append({
            "id": p.id,
            "brand_id": p.brand_id,
            "brand_name": p.brand.name if p.brand else "Unknown",
            "brand_colors": brand_colors,
            "platform": p.platform,
            "copy": p.copy,
            "image_url": f"{b_url}/api/social/media/{p.id}_t.jpg" if p.image_url else None,
            "video_url": f"{b_url}/api/social/media/{p.id}_t.mp4" if p.video_url else None,
            "media_prompt": p.media_prompt,
            "status": p.status,
            "platform_log": p.platform_log,
            "scheduled_for": p.scheduled_for.isoformat() + "Z" if p.scheduled_for else None,
            "approved_at": p.approved_at.isoformat() + "Z" if p.approved_at else None
        })
    return results

class PostUpdateRequest(BaseModel):
    copy: str
    media_prompt: str
    status: str
    platform: str = None
    scheduled_for: str = None

@router.put("/posts/{post_id}")
def update_post(post_id: int, request: PostUpdateRequest, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    post.copy = request.copy
    post.media_prompt = request.media_prompt
    post.status = request.status
    if request.platform:
        post.platform = request.platform
    if request.scheduled_for:
        try:
            from datetime import timezone
            d_tz = datetime.fromisoformat(request.scheduled_for.replace('Z', '+00:00'))
            post.scheduled_for = d_tz.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass # fallback to original

    if request.status == "APPROVED":
        post.approved_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Post actualizado correctamente", "post_id": post.id}

@router.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    db.delete(post)
    db.commit()
    return {"message": "Post eliminado"}

class GenerateImageRequest(BaseModel):
    media_prompt: str

@router.post("/posts/{post_id}/generate-image")
def generate_image_for_post(post_id: int, request: GenerateImageRequest, db: Session = Depends(get_db)):
    """ Genera la imagen a demanda del Director en la etapa de revisión """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if not client:
         raise HTTPException(status_code=500, detail="Gemini API no configurada.")
         
    try:
        # Llamamos al modelo de generacion visual de Google
        result = client.models.generate_images(
            model='imagen-4.0-fast-generate-001',
            prompt=request.media_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/jpeg",
                aspect_ratio="1:1"
            )
        )
        image_base64 = None
        for generated_image in result.generated_images:
            image_base64 = "data:image/jpeg;base64," + base64.b64encode(generated_image.image.image_bytes).decode('utf-8')
            break
            
        if not image_base64:
             raise Exception("La API no devolvió bytes de imagen.")
             
        # Guardamos la imagen final en el post
        post.media_prompt = request.media_prompt
        post.image_url = image_base64
        db.commit()
        
        return {"message": "Imagen generada", "image_url": image_base64}
        
    except Exception as e:
        logging.error(f"Error generando imagen para el post: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo generar imagen: {e}")

@router.post("/posts/{post_id}/generate-image-pro")
def generate_image_pro_for_post(post_id: int, request: GenerateImageRequest, db: Session = Depends(get_db)):
    """ Genera la imagen a demanda del Director usando el modelo PRO """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if not client:
         raise HTTPException(status_code=500, detail="Gemini API no configurada.")
         
    try:
        # Añadiremos al prompt los colores de la marca para forzar composición visual
        brand = db.query(Brand).filter(Brand.id == post.brand_id).first()
        enhanced_prompt = request.media_prompt
        if brand and brand.visual_identity and "colors" in brand.visual_identity:
            colors_str = ", ".join(brand.visual_identity["colors"])
            enhanced_prompt += f". IMPORTANT: High fidelity, photorealistic, premium quality. Stylize with primary brand colors: {colors_str}."

        result = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=enhanced_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/jpeg",
                aspect_ratio="1:1"
            )
        )
        image_base64 = None
        for generated_image in result.generated_images:
            image_base64 = "data:image/jpeg;base64," + base64.b64encode(generated_image.image.image_bytes).decode('utf-8')
            break
            
        if not image_base64:
             raise Exception("La API no devolvió bytes de imagen.")
             
        # Guardamos la imagen final en el post
        post.media_prompt = request.media_prompt
        post.image_url = image_base64
        db.commit()
        
        return {"message": "Imagen generada con modelo PRO", "image_url": image_base64}
        
    except Exception as e:
        logging.error(f"Error generando imagen PRO para el post: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo generar imagen PRO: {e}")

@router.post("/posts/{post_id}/generate-video")
def generate_video_for_post(post_id: int, request: GenerateImageRequest, db: Session = Depends(get_db)):
    """ Genera Reel de video nativo a demanda usando Veo """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if not client:
         raise HTTPException(status_code=500, detail="Gemini API no configurada.")
         
    try:
        brand = db.query(Brand).filter(Brand.id == post.brand_id).first()
        enhanced_prompt = request.media_prompt
        if brand and brand.visual_identity and "colors" in brand.visual_identity:
            colors_str = ", ".join(brand.visual_identity["colors"])
            enhanced_prompt += f". Cinematic aesthetic. Integrate brand colors organically: {colors_str}."

        import time
        operation = client.models.generate_videos(
            model='veo-2.0-generate-001',
            prompt=enhanced_prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="9:16",
                person_generation="DONT_ALLOW"
            )
        )
        
        # Pull operation state
        max_retries = 60
        while not getattr(operation, 'done', False) and max_retries > 0:
            time.sleep(10)
            try:
                # Actualizar status via API
                operation = client.operations.get(operation=operation)
            except Exception:
                pass # Continue fallback 
            max_retries -= 1

        if not getattr(operation, 'done', False):
             raise Exception("Timeout esperando respuesta de Veo. La renderización está tomando más de 10 minutos.")
             
        if getattr(operation, 'error', None):
             raise Exception(f"Video bloqueado o fallido: {operation.error}")
             
        video_base64 = None
        
        # Revisar respuesta en result o response internamente
        result_payload = getattr(operation, 'response', None) or getattr(operation, 'result', None)
        
        if result_payload and getattr(result_payload, 'generated_videos', None):
            for generated_video in result_payload.generated_videos:
                if generated_video.video:
                    video_bytes = getattr(generated_video.video, 'video_bytes', None)
                    video_uri = getattr(generated_video.video, 'uri', None)
                    
                    if not video_bytes and video_uri:
                        # Descargar usando la SDK nativa ya que la URL cruda bloquea descargas directas
                        try:
                            video_bytes = client.files.download(file=generated_video.video)
                        except Exception as e:
                            logging.error(f"Error descargando video vía SDK: {e}")
                            
                    if video_bytes:
                        video_base64 = "data:video/mp4;base64," + base64.b64encode(video_bytes).decode('utf-8')
                        break
            
        if not video_base64:
             raise Exception(f"La API no devolvió bytes de video final ni se pudo descargar la URI. Detalles: {result_payload}")
             
        post.media_prompt = request.media_prompt
        post.video_url = video_base64
        post.image_url = None
        db.commit()
        
        return {"message": "Reel Generado", "video_url": video_base64}
        
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower():
            # Traducir a un mensaje Premium
            raise HTTPException(status_code=429, detail="Has superado tu cuota diaria del Plan Ultra para renderizado cinematográfico Veo (5 por día). Tu cuota se reiniciará en las próximas horas.")
        
        logging.error(f"Error generando video para el post: {e}")
        raise HTTPException(status_code=500, detail=f"Fallo en el motor cinemático: {e}")
