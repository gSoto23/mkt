from app.db.database import SessionLocal
from app.models.base import Post

db = SessionLocal()
posts = db.query(Post).all()
for p in posts:
    print(f"ID: {p.id}, Brand: {p.brand_id}, Status: {p.status}, Scheduled: {p.scheduled_for}")
