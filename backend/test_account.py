from app.db.database import SessionLocal
from app.models.base import SocialAccount
db = SessionLocal()
accs = db.query(SocialAccount).filter(SocialAccount.platform == 'instagram').all()
for a in accs:
    print(f"Brand: {a.brand_id}, IG_ID: {a.provider_account_id}, Token: {a.access_token[:10]}...")
