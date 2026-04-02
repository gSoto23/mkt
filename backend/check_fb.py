from app.db.database import SessionLocal
from app.models.base import SocialAccount
import requests

db = SessionLocal()
acc = db.query(SocialAccount).filter(SocialAccount.platform == 'facebook').first()
if acc:
    print(f"Token: {acc.access_token[:15]}...")
    res = requests.get(f"https://graph.facebook.com/v19.0/me/permissions?access_token={acc.access_token}")
    print(res.json())
else:
    print("No facebook account connected.")
