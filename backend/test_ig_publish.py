import requests
from app.db.database import SessionLocal
from app.models.base import Post, SocialAccount

db = SessionLocal()
post = db.query(Post).order_by(Post.id.desc()).first()
acc = db.query(SocialAccount).filter(SocialAccount.platform == 'instagram').first()

if acc and post:
    print(f"Testing post {post.id} with IG Token {acc.access_token[:15]}...")
    media_url = f"https://juguetessinazucar.com/api/social/media/{post.id}"
    print(f"Media URL: {media_url}")
    
    # 1. Test GET media endpoint
    res = requests.get(media_url)
    print("Media HTTP Status:", res.status_code)
    print("Media Headers:", res.headers.get("Content-Type"))
    
    # 2. Test IG API directly
    container_data = {
        "image_url": media_url,
        "caption": "Test from CLI",
        "access_token": acc.access_token
    }
    ig_url = f"https://graph.facebook.com/v19.0/{acc.provider_account_id}/media"
    res_ig = requests.post(ig_url, data=container_data)
    print("IG API Response:\n", res_ig.json())

