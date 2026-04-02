from app.db.database import SessionLocal
from app.models.base import Post
db = SessionLocal()
posts = db.query(Post).filter(Post.image_url.isnot(None)).all()
for p in posts:
    if p.image_url.startswith("data:"):
        print(f"ID: {p.id}, MIME: {p.image_url.split(';')[0][:20]}")
