import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.base import AdCampaign, AdAccount, Post, SocialAccount
import logging
import os

logger = logging.getLogger(__name__)

class MetaAdsManager:
    BASE_URL = "https://graph.facebook.com/v19.0"

    @staticmethod
    def create_campaign(db: Session, campaign_id: int):
        """
        Creates the Campaign structure in Meta Ads.
        Under the hood this requires: Campaign -> AdSet (Targeting & Budget) -> Ad (Creative).
        """
        campaign = db.query(AdCampaign).filter(AdCampaign.id == campaign_id).first()
        if not campaign:
            return
            
        ad_account = campaign.ad_account
        if not ad_account or ad_account.platform != "facebook":
            logger.error("Invalid AdAccount or not Facebook")
            return

        # Para un BOOST, necesitamos la Fanpage vinculada
        page_id = None
        if campaign.post_id:
            social = db.query(SocialAccount).filter(SocialAccount.brand_id == ad_account.brand_id, SocialAccount.platform == "facebook").first()
            if social:
                page_id = social.provider_account_id

        act_id = f"act_{ad_account.ad_account_id}"
        
        # Le damos prioridad al Token Infinito global del sistema si existe.
        token_to_use = os.getenv("META_SYSTEM_TOKEN") or ad_account.access_token

        with httpx.Client() as client:
            try:
                # 1. Start Campaign
                payload_camp = {
                    "name": campaign.name,
                    "objective": "OUTCOME_ENGAGEMENT",
                    "status": "PAUSED",
                    "special_ad_categories": "[]",
                    "access_token": token_to_use
                }
                res = client.post(f"{MetaAdsManager.BASE_URL}/{act_id}/campaigns", data=payload_camp)
                
                if res.status_code != 200:
                    logger.error(f"Error creating campaign on Meta: {res.text}")
                    raise Exception(res.text)
                    
                fb_campaign_id = res.json().get("id")
                
                # 2. Create AdSet
                import json
                payload_adset = {
                    "name": f"AdSet - {campaign.name}",
                    "campaign_id": fb_campaign_id,
                    "daily_budget": campaign.budget_daily,
                    "billing_event": "IMPRESSIONS",
                    "optimization_goal": "POST_ENGAGEMENT",
                    "bid_amount": 20,
                    "promoted_object": json.dumps({"page_id": page_id}) if page_id else "{}",
                    "targeting": json.dumps({"geo_locations": {"countries": ["CR"]}}),
                    "status": "PAUSED",
                    "access_token": token_to_use
                }
                
                res_adset = client.post(f"{MetaAdsManager.BASE_URL}/{act_id}/adsets", data=payload_adset)
                if res_adset.status_code != 200:
                    logger.error(f"Error creating AdSet: {res_adset.text}")
                    raise Exception(res_adset.text)
                    
                fb_adset_id = res_adset.json().get("id")

                # 3. Create AdCreative & Ad (Only if POST exists)
                if campaign.post_id and page_id:
                    post = db.query(Post).filter(Post.id == campaign.post_id).first()
                    fb_post_id = post.platform_log if post and post.platform_log and "_" in post.platform_log else None
                    
                    if fb_post_id:
                        payload_creative = {
                            "name": f"Creative - {campaign.name}",
                            "object_story_id": fb_post_id,
                            "access_token": token_to_use
                        }
                        res_creative = client.post(f"{MetaAdsManager.BASE_URL}/{act_id}/adcreatives", data=payload_creative)
                        if res_creative.status_code == 200:
                            creative_id = res_creative.json().get("id")
                            
                            payload_ad = {
                                "name": f"Ad - {campaign.name}",
                                "adset_id": fb_adset_id,
                                "creative": json.dumps({"creative_id": creative_id}),
                                "status": "PAUSED",
                                "access_token": token_to_use
                            }
                            client.post(f"{MetaAdsManager.BASE_URL}/{act_id}/ads", data=payload_ad)
                            
                campaign.status = "ACTIVE"
                db.commit()
                logger.info(f"Campaign {campaign.name} successfully pushed (Camp+AdSet+Ad).")
                
            except Exception as e:
                logger.error(f"Meta Ads Execution Failed: {str(e)}")
                campaign.status = "FAILED"
                db.commit()

@celery_app.task
def launch_ad_campaign_task(campaign_id: int):
    """
    Tarea asincrónica para montar la campaña en Meta Ads.
    """
    db: Session = SessionLocal()
    try:
        MetaAdsManager.create_campaign(db, campaign_id)
    finally:
        db.close()
