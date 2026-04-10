from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.base import Brand, Post, AdCampaign, AdAccount
from typing import List, Dict, Any
from app.api.auth import get_current_user

router = APIRouter()

@router.get("/{brand_id}/dashboard")
def get_metrics_dashboard(brand_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Verify ownership
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    if brand.owner_id is not None and brand.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this brand's metrics")

    # Organic Metrics
    posts = db.query(Post).filter(Post.brand_id == brand_id, Post.status == "PUBLISHED").order_by(Post.created_at.desc()).limit(20).all()
    
    total_organic_reach = 0
    total_likes = 0
    total_comments = 0
    
    organic_performance = []
    
    for p in posts:
        metrics = p.metrics or {}
        r = metrics.get('reach', 0)
        l = metrics.get('likes', 0)
        c = metrics.get('comments', 0)
        
        total_organic_reach += r
        total_likes += l
        total_comments += c
        
        organic_performance.append({
            "id": p.id,
            "copy": p.copy[:50] + "...",
            "likes": l,
            "comments": c,
            "reach": r,
            "date": p.created_at.isoformat() if p.created_at else None
        })
        
    # Sort organic top performers by likes
    organic_top = sorted(organic_performance, key=lambda x: x["likes"], reverse=True)[:5]
    
    # Ads Metrics
    ad_accounts = db.query(AdAccount).filter(AdAccount.brand_id == brand_id).all()
    ad_account_ids = [acc.id for acc in ad_accounts]
    
    campaigns = []
    if ad_account_ids:
        campaigns = db.query(AdCampaign).filter(AdCampaign.ad_account_id.in_(ad_account_ids)).all()
        
    total_spend = sum(c.spend for c in campaigns) # in cents
    total_ad_impressions = sum(c.impressions for c in campaigns)
    total_clicks = sum(c.clicks for c in campaigns)
    
    ads_performance = []
    for c in campaigns:
        cpc = (c.spend / c.clicks) / 100 if c.clicks > 0 else 0
        ads_performance.append({
            "id": c.id,
            "name": c.name,
            "spend": c.spend / 100, # to dollars
            "impressions": c.impressions,
            "clicks": c.clicks,
            "cpc": round(cpc, 2)
        })
        
    ads_top = sorted(ads_performance, key=lambda x: x["impressions"], reverse=True)[:5]
    
    # Global KPI
    avg_cpc = (total_spend / total_clicks) / 100 if total_clicks > 0 else 0
    
    # Historical Mock Data for Chart (Last 7 Days)
    # In a real scenario we'd query by date, for now we return a smooth curve based on totals
    chart_data = [
        {"name": "Día 1", "organic": int(total_organic_reach * 0.05), "paid": int(total_ad_impressions * 0.05)},
        {"name": "Día 2", "organic": int(total_organic_reach * 0.15), "paid": int(total_ad_impressions * 0.15)},
        {"name": "Día 3", "organic": int(total_organic_reach * 0.30), "paid": int(total_ad_impressions * 0.25)},
        {"name": "Día 4", "organic": int(total_organic_reach * 0.45), "paid": int(total_ad_impressions * 0.40)},
        {"name": "Día 5", "organic": int(total_organic_reach * 0.65), "paid": int(total_ad_impressions * 0.60)},
        {"name": "Día 6", "organic": int(total_organic_reach * 0.85), "paid": int(total_ad_impressions * 0.80)},
        {"name": "Día 7", "organic": total_organic_reach, "paid": total_ad_impressions},
    ]
        
    return {
        "kpis": {
            "total_organic_reach": total_organic_reach,
            "total_organic_likes": total_likes,
            "total_spend_usd": round(total_spend / 100, 2),
            "total_ad_impressions": total_ad_impressions,
            "total_clicks": total_clicks,
            "avg_cpc": round(avg_cpc, 2)
        },
        "chart_data": chart_data,
        "organic_top": organic_top,
        "ads_top": ads_top
    }
