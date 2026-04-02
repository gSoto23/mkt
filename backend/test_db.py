from app.db.database import SessionLocal
from app.models.base import Post
db = SessionLocal()
posts = db.query(Post).order_by(Post.id.desc()).limit(2).all()
for p in posts:
    print(f"ID: {p.id}, scheduled: {repr(p.scheduled_for)}, approved: {repr(p.approved_at)}")
