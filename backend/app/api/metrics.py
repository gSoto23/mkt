from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.base import Brand, Post, AdCampaign, AdAccount
from typing import List, Dict, Any
from datetime import datetime, timedelta
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
        
        post_url = metrics.get('url', '#')

        organic_performance.append({
            "id": p.id,
            "copy": p.copy[:50] + "...",
            "likes": l,
            "comments": c,
            "reach": r,
            "url": post_url,
            "date": p.created_at.isoformat() if p.created_at else None
        })
        
    # Sort organic top performers by created_date desc internally first (frontend can re-sort)
    organic_top = sorted(organic_performance, key=lambda x: x["date"] or "", reverse=True)
    
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
    
    # Historical Data for Chart (Last 7 Days)
    today = datetime.utcnow().date()
    days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    
    chart_data = []
    
    for d in days:
        organic_for_day = 0
        paid_for_day = 0
        
        # Organic Reach per day (sum of reach for posts created on this day)
        for p in posts:
            if p.created_at and p.created_at.date() == d:
                r = p.metrics.get('reach', 0) if p.metrics else 0
                organic_for_day += r
                
        # In the future, paid_for_day should come from an AdDailyStats table.
        # Since we don't have historical ad arrays, we just show 0 or an average if campaigns are active.
        # For true representation, we will just use 0 until ad daily tracking is implemented.
                
        chart_data.append({
            "name": d.strftime("%d %b"),
            "organic": organic_for_day,
            "paid": paid_for_day
        })
        
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
