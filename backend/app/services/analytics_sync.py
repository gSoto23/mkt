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
                                
                        # 2. Views Reel/Video (Fallback a métricas de video específicas si el anterior falló o dictó 0)
                        if reach == 0:
                            res_vid = client.get(ins_url, params={"metric": "post_video_views", "access_token": acc.access_token})
                            if res_vid.is_success:
                                data_vid = res_vid.json().get("data", [])
                                if data_vid and len(data_vid) > 0:
                                    reach = data_vid[0].get("values", [{}])[0].get("value", 0)
                            else:
                                pass # This fails cleanly often for non-video posts
                                
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
                                    print(f"⚠️ [FB Video Reach] No views for Video {vid_id}: {res_raw.text}")
                            else:
                                print(f"⚠️ [FB Diagnostic] ID: {matched['id']} failed all reach queries. Is it just organically 0?")
                                    
                        existing = lp.metrics or {}
                        new_metrics = {
                            "meta_post_id": matched["id"],
                            "fb_reach": reach,
                            "fb_likes": likes,
                            "fb_comments": 0,
                            "ig_reach": existing.get("ig_reach", 0),
                            "ig_likes": existing.get("ig_likes", 0),
                            "ig_comments": existing.get("ig_comments", 0),
                            "url": matched.get("permalink_url", f"https://facebook.com/{matched['id']}")
                        }
                        
                        # Sum values into totals for easy UI access
                        new_metrics["reach"] = new_metrics["fb_reach"] + new_metrics["ig_reach"]
                        new_metrics["likes"] = new_metrics["fb_likes"] + new_metrics["ig_likes"]
                        new_metrics["comments"] = new_metrics["fb_comments"] + new_metrics["ig_comments"]
                        
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
                        ig_metric = "reach"
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
                        
                        # Update existing metrics dict with IG specific keys
                        existing = lp.metrics or {}
                        
                        new_metrics = {
                            "meta_post_id": matched["id"],
                            "fb_reach": existing.get("fb_reach", 0),
                            "fb_likes": existing.get("fb_likes", 0),
                            "fb_comments": existing.get("fb_comments", 0),
                            "ig_reach": reach,
                            "ig_likes": likes,
                            "ig_comments": comments,
                            "url": matched.get("permalink", f"https://instagram.com/p/{matched['id']}")
                        }
                        
                        # Sum values to expose top-level totals gracefully
                        new_metrics["reach"] = new_metrics["fb_reach"] + new_metrics["ig_reach"]
                        new_metrics["likes"] = new_metrics["fb_likes"] + new_metrics["ig_likes"]
                        new_metrics["comments"] = new_metrics["fb_comments"] + new_metrics["ig_comments"]
                        
                        lp.metrics = new_metrics
                        logger.info(f"  [SYNCED IG] Post #{lp.id} -> Reach {reach}, Likes {likes}")
                        
        db.commit()
    except Exception as e:
        logger.error(f"[ANALYTICS SYNC] Fatal Error: {e}")
    finally:
        db.close()
