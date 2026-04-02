from app.db.database import SessionLocal
from app.models.base import SocialAccount
import requests

db = SessionLocal()
accs = db.query(SocialAccount).all()
for acc in accs:
    print(f"Platform: {acc.platform}, Brand: {acc.brand_id}")
    if acc.access_token:
        res = requests.get(f"https://graph.facebook.com/v19.0/me/permissions?access_token={acc.access_token}").json()
        print(res)
