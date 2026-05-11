import asyncio
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import SocialAccount
from app.core.config import settings

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def check_tokens():
    db = SessionLocal()
    accounts = db.query(SocialAccount).filter(SocialAccount.platform == 'facebook').all()
    if not accounts:
        print("No facebook accounts found in DB.")
        return
    
    app_id = settings.META_CLIENT_ID
    app_secret = settings.META_CLIENT_SECRET
    app_access_token = f"{app_id}|{app_secret}"

    async with httpx.AsyncClient() as client:
        for acc in accounts:
            print(f"Checking Brand ID: {acc.brand_id}, Page ID: {acc.provider_account_id}")
            res = await client.get("https://graph.facebook.com/v19.0/debug_token", params={
                "input_token": acc.access_token,
                "access_token": app_access_token
            })
            data = res.json()
            if "data" in data:
                scopes = data["data"].get("scopes", [])
                is_valid = data["data"].get("is_valid")
                print(f"  Valid: {is_valid}")
                print(f"  Scopes: {scopes}")
                if "error" in data["data"]:
                    print(f"  Token Error: {data['data']['error']}")
            else:
                print(f"  Error debugging: {data}")

if __name__ == "__main__":
    asyncio.run(check_tokens())
