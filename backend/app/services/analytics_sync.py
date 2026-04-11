import httpx
from celery.utils.log import get_task_logger
from app.db.database import SessionLocal
from app.models.base import SocialAccount, Post
from app.core.celery_app import celery_app

logger = get_task_logger(__name__)

@celery_app.task
def sync_all_social_metrics():
    """
    Se ejecuta automáticamente en background (ej: cada 2 horas).
    Extrae Likes y Reach de todos los posts publicados vía Meta Graph API.
    """
    db = SessionLocal()
    try:
        accounts = db.query(SocialAccount).filter(SocialAccount.platform == "facebook").all()
        
        with httpx.Client() as client:
            for acc in accounts:
                logger.info(f"[ANALYTICS SYNC] Analizando cuenta FB: {acc.provider_account_id}")
                
                # Fetch published posts root data (id, message, permalink, total likes)
                url = f"https://graph.facebook.com/v19.0/{acc.provider_account_id}/published_posts"
                params = {
                    "fields": "id,message,permalink_url,likes.summary(true)",
                    "access_token": acc.access_token,
                    "limit": 100
                }
                
                res = client.get(url, params=params)
                if not res.is_success:
                    logger.error(f"[ANALYTICS SYNC] Error para {acc.provider_account_id}: {res.text}")
                    continue
                    
                fb_posts = res.json().get("data", [])
                
                # Traemos los posts locales de esta marca
                local_posts = db.query(Post).filter(
                    Post.brand_id == acc.brand_id,
                    Post.status == "PUBLISHED"
                ).all()
                
                for lp in local_posts:
                    matched = None
                    for fp in fb_posts:
                        fb_msg = fp.get("message", "").strip()
                        lp_msg = lp.copy.strip()
                        if lp_msg and lp_msg[:30] in fb_msg:
                            matched = fp
                            break
                            
                    if matched:
                        likes = matched.get("likes", {}).get("summary", {}).get("total_count", 0)
                        reach = 0
                        ins_url = f"https://graph.facebook.com/v19.0/{matched['id']}/insights"
                        
                        # 1. Reach Standard
                        res_ins = client.get(ins_url, params={"metric": "post_impressions_unique", "access_token": acc.access_token})
                        if res_ins.is_success:
                            data_ins = res_ins.json().get("data", [])
                            if data_ins and len(data_ins) > 0:
                                reach = data_ins[0].get("values", [{}])[0].get("value", 0)
                                
                        # 2. Views Reel/Video (Fallback a métricas de video específicas)
                        if reach == 0:
                            res_vid = client.get(ins_url, params={"metric": "post_video_views", "access_token": acc.access_token})
                            if res_vid.is_success:
                                data_vid = res_vid.json().get("data", [])
                                if data_vid and len(data_vid) > 0:
                                    reach = data_vid[0].get("values", [{}])[0].get("value", 0)

                        # 3. Y si todo falla (Es un Reel puro nativo y requiere Video ID)
                        if reach == 0 and "_" in matched['id']:
                            vid_id = matched['id'].split('_')[-1]
                            vid_ins_url = f"https://graph.facebook.com/v19.0/{vid_id}/video_insights"
                            res_raw = client.get(vid_ins_url, params={"metric": "total_video_views", "access_token": acc.access_token})
                            if res_raw.is_success:
                                data_raw = res_raw.json().get("data", [])
                                if data_raw and len(data_raw) > 0:
                                    reach = data_raw[0].get("values", [{}])[0].get("value", 0)
                                    
                        new_metrics = {
                            "meta_post_id": matched["id"],
                            "reach": reach,
                            "likes": likes,
                            "comments": 0,
                            "url": matched.get("permalink_url", f"https://facebook.com/{matched['id']}")
                        }
                        
                        lp.metrics = new_metrics
                        logger.info(f"  [SYNCED] Post #{lp.id} -> Reach {reach}, Likes {likes}")
        db.commit()
    except Exception as e:
        logger.error(f"[ANALYTICS SYNC] Fatal Error: {e}")
    finally:
        db.close()
