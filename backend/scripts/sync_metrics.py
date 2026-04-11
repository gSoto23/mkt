import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
from app.db.database import SessionLocal
from app.models.base import SocialAccount, Post
from app.core.config import settings

def main():
    db = SessionLocal()
    accounts = db.query(SocialAccount).filter(SocialAccount.platform == "facebook").all()
    
    with httpx.Client() as client:
        for acc in accounts:
            print(f"Sincronizando cuenta: {acc.provider_account_id}")
            
            # Fetch published posts
            url = f"https://graph.facebook.com/v19.0/{acc.provider_account_id}/published_posts"
            params = {
                "fields": "id,message,permalink_url,likes.summary(true)",
                "access_token": acc.access_token,
                "limit": 100
            }
            
            res = client.get(url, params=params)
            if not res.is_success:
                print(f"Error fetching posts para {acc.provider_account_id}: {res.text}")
                continue
                
            data = res.json()
            fb_posts = data.get("data", [])
            print(f"Encontrados {len(fb_posts)} posts remotos en FB.")
            
            # Traemos los posts locales de esta marca
            local_posts = db.query(Post).filter(
                Post.brand_id == acc.brand_id,
                Post.status == "PUBLISHED"
            ).all()
            
            for lp in local_posts:
                # Tratar de matchear por texto
                matched = None
                for fp in fb_posts:
                    fb_msg = fp.get("message", "").strip()
                    lp_msg = lp.copy.strip()
                    # Si el copy local es un substring largo del de FB, o son muy parecidos:
                    if lp_msg and lp_msg[:30] in fb_msg:
                        matched = fp
                        break
                        
                if matched:
                    # Likes desde el root sumary
                    likes = matched.get("likes", {}).get("summary", {}).get("total_count", 0)
                    reach = 0
                    
                    # Llamada individual de insights (Safe)
                    ins_url = f"https://graph.facebook.com/v19.0/{matched['id']}/insights"
                    
                    # 1. Intentamos post_impressions_unique
                    res_ins = client.get(ins_url, params={"metric": "post_impressions_unique", "access_token": acc.access_token})
                    if res_ins.is_success:
                        data_ins = res_ins.json().get("data", [])
                        if data_ins and len(data_ins) > 0:
                            reach_val = data_ins[0].get("values", [{}])[0].get("value", 0)
                            reach = reach_val
                            
                    # 2. Si es 0, tal vez es video, intentamos post_video_views
                    if reach == 0:
                        res_vid = client.get(ins_url, params={"metric": "post_video_views_unique", "access_token": acc.access_token}) # Reels/Videos
                        if res_vid.is_success:
                            data_vid = res_vid.json().get("data", [])
                            if data_vid and len(data_vid) > 0:
                                reach_val = data_vid[0].get("values", [{}])[0].get("value", 0)
                                reach = reach_val

                    # 3. Y si todo falla y no sabemos el endpoint de reel, sacamos insights crudos
                    if reach == 0:
                        res_raw = client.get(ins_url, params={"metric": "post_video_views", "access_token": acc.access_token})
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
                    print(f"  [SYNCED] Local ID {lp.id} -> FB Reach {reach}, Likes {likes}")
                else:
                    # Si no mapea, dejar como 0 pero no sobreescribir si ya tiene algo útil
                    m = lp.metrics or {}
                    if "meta_post_id" not in m: # Solo si no lo habíamos atrapado
                        lp.metrics = {
                            "reach": 0, "likes": 0, "comments": 0,
                            "url": "https://business.facebook.com/latest/posts/published_posts"
                        }
                        
    db.commit()
    db.close()
    print("Sincronización Finalizada.")

if __name__ == "__main__":
    main()
