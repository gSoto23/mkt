from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.models.base import AdCampaign, AdAccount, Post, Brand
from app.services.ads_manager import launch_ad_campaign_task
from app.api.auth import get_current_user

router = APIRouter()

class BoostRequest(BaseModel):
    post_id: Optional[int] = None
    ad_account_id: int
    name: str
    campaign_type: str # BOOST or DARK_POST
    budget_daily: int
    target_audience: dict

@router.get("/accounts")
def get_user_ad_accounts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Returns all ad accounts associated with the logged in user's brands
    """
    accounts = db.query(AdAccount).join(AdAccount.brand).filter(Brand.owner_id == current_user.id).all()
    return [{"id": acc.id, "name": acc.ad_account_id, "platform": acc.platform, "brand_id": acc.brand_id} for acc in accounts]

@router.post("/create")
def create_ad_campaign(req: BoostRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Endpoint para crear un Boost Post o un Dark Post.
    """
    # Validations
    ad_acc = db.query(AdAccount).filter(AdAccount.id == req.ad_account_id).first()
    if not ad_acc:
        raise HTTPException(status_code=404, detail="Ad Account not found")
        
    if ad_acc.brand.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to use this Ad Account")
        
    if req.campaign_type == "BOOST" and not req.post_id:
        raise HTTPException(status_code=400, detail="Boost post requires post_id")
        
    campaign = AdCampaign(
        ad_account_id=req.ad_account_id,
        post_id=req.post_id,
        name=req.name,
        campaign_type=req.campaign_type,
        budget_daily=req.budget_daily,
        target_audience=req.target_audience
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Launch async task to Meta Ads
    launch_ad_campaign_task.delay(campaign.id)
    
    return {"status": "success", "campaign_id": campaign.id, "message": "Campaign creation scheduled on background worker."}

@router.get("/metrics/{campaign_id}")
def get_campaign_metrics(campaign_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    campaign = db.query(AdCampaign).filter(AdCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {
        "id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "spend": campaign.spend,
        "impressions": campaign.impressions,
        "clicks": campaign.clicks
    }
