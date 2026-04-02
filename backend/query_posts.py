from app.db.database import SessionLocal
from app.models.base import Post

db = SessionLocal()
posts = db.query(Post).all()
print("Post IDs:", [p.id for p in posts])
