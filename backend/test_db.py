from app.db.database import SessionLocal
from app.models.base import Post
db = SessionLocal()
posts = db.query(Post).all()
for p in posts:
    print(f"ID: {p.id}, Image: {bool(p.image_url)}, Video: {bool(p.video_url)} (Type: {type(p.video_url)}, Value: {repr(p.video_url)[:50]})")
