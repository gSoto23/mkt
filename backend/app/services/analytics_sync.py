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
                
                # Fetch published posts root data
                url = f"https://graph.facebook.com/v19.0/{acc.provider_account_id}/published_posts"
                params = {
                    "fields": "id,message,permalink_url,likes.summary(true),attachments",
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
                        else:
                            print(f"⚠️ [FB Reach Error 1] {matched['id']}: {res_ins.text}")
                                
                        # 2. Views Reel/Video (Fallback a métricas de video específicas)
                        if reach == 0:
                            res_vid = client.get(ins_url, params={"metric": "post_video_views", "access_token": acc.access_token})
                            if res_vid.is_success:
                                data_vid = res_vid.json().get("data", [])
                                if data_vid and len(data_vid) > 0:
                                    reach = data_vid[0].get("values", [{}])[0].get("value", 0)
                            else:
                                print(f"⚠️ [FB Reach Error 2] {matched['id']}: {res_vid.text}")

                        # 3. Y si todo falla (Es un Reel puro nativo y requiere Video ID original)
                        if reach == 0:
                            vid_id = None
                            attachments = matched.get("attachments", {}).get("data", [])
                            if attachments and "target" in attachments[0]:
                                vid_id = attachments[0]["target"].get("id")
                            
                            if vid_id:
                                vid_ins_url = f"https://graph.facebook.com/v19.0/{vid_id}/video_insights"
                                res_raw = client.get(vid_ins_url, params={"metric": "total_video_views", "access_token": acc.access_token})
                                if res_raw.is_success:
                                    data_raw = res_raw.json().get("data", [])
                                    if data_raw and len(data_raw) > 0:
                                        reach = data_raw[0].get("values", [{}])[0].get("value", 0)
                                else:
                                    # Still fail? Likely just 0 reach or different metric
                                    pass
                                    
                        new_metrics = {
                            "meta_post_id": matched["id"],
                            "reach": reach,
                            "likes": likes,
                            "comments": 0,
                            "url": matched.get("permalink_url", f"https://facebook.com/{matched['id']}")
                        }
                        
                        lp.metrics = new_metrics
                        logger.info(f"  [SYNCED FB] Post #{lp.id} -> Reach {reach}, Likes {likes}")
                        
        # INSTAGRAM SYNC
        with httpx.Client() as client:
            ig_accounts = db.query(SocialAccount).filter(SocialAccount.platform == "instagram").all()
            for acc in ig_accounts:
                logger.info(f"[ANALYTICS SYNC] Analizando cuenta IG: {acc.provider_account_id}")
                
                url = f"https://graph.facebook.com/v19.0/{acc.provider_account_id}/media"
                params = {
                    "fields": "id,caption,permalink,like_count,comments_count,media_type",
                    "access_token": acc.access_token,
                    "limit": 100
                }
                
                res = client.get(url, params=params)
                if not res.is_success:
                    logger.error(f"[ANALYTICS SYNC] Error IG {acc.provider_account_id}: {res.text}")
                    continue
                    
                ig_posts = res.json().get("data", [])
                
                local_posts = db.query(Post).filter(
                    Post.brand_id == acc.brand_id,
                    Post.status == "PUBLISHED"
                ).all()
                
                for lp in local_posts:
                    matched = None
                    for ip in ig_posts:
                        ig_msg = ip.get("caption", "").strip()
                        lp_msg = lp.copy.strip()
                        if lp_msg and lp_msg[:30] in ig_msg:
                            matched = ip
                            break
                            
                    if matched:
                        likes = matched.get("like_count", 0)
                        comments = matched.get("comments_count", 0)
                        reach = 0
                        
                        # IG Reach Endpoint
                        ig_metric = "reach" if matched.get("media_type") != "VIDEO" else "plays"
                        ins_url = f"https://graph.facebook.com/v19.0/{matched['id']}/insights"
                        
                        res_ins = client.get(ins_url, params={"metric": ig_metric, "access_token": acc.access_token})
                        if res_ins.is_success:
                            data_ins = res_ins.json().get("data", [])
                            if data_ins and len(data_ins) > 0:
                                reach = data_ins[0].get("values", [{}])[0].get("value", 0)
                        else:
                            # 10 means missing instagram_manage_insights
                            if "code\":10" in res_ins.text:
                                logger.error(f"[IG Reach Error] Missing 'instagram_manage_insights' scope for IG profile. Reach locked at 0.")
                            print(f"⚠️ [IG Reach Error] Type: {matched.get('media_type')} | {matched['id']}: {res_ins.text}")
                                
                        new_metrics = {
                            "meta_post_id": matched["id"],
                            "reach": reach,
                            "likes": likes,
                            "comments": comments,
                            "url": matched.get("permalink", f"https://instagram.com/p/{matched['id']}")
                        }
                        
                        # Merge to existing instead of overwrite if it's already a dict
                        # BUT wait, the Post applies to Both? 
                        # In Huevos/GMKT each post represents the content. Meta and IG are both targeted.
                        # If the post went to both, we should sum them up!
                        existing = lp.metrics or {}
                        
                        lp.metrics = {
                            "meta_post_id": matched["id"], # We only keep the last ID in reference
                            "reach": existing.get("reach", 0) + reach,
                            "likes": existing.get("likes", 0) + likes,
                            "comments": existing.get("comments", 0) + comments,
                            "url": new_metrics["url"] # We prefer IG url or FB url
                        }
                        logger.info(f"  [SYNCED IG] Post #{lp.id} -> Reach {reach}, Likes {likes}")
                        
        db.commit()
    except Exception as e:
        logger.error(f"[ANALYTICS SYNC] Fatal Error: {e}")
    finally:
        db.close()
