from app.db.database import SessionLocal
from app.models.base import Post, Brand
import base64

db = SessionLocal()
b = Brand(name="Test")
db.add(b)
db.commit()

# Create dummy 1x1 black JPEG in base64
dummy_jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

p = Post(brand_id=b.id, platform="Instagram", copy="Test", image_url=dummy_jpeg, status="APPROVED")
db.add(p)
db.commit()
print("Post ID:", p.id)
