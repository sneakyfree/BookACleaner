"""
Reviews API for BookACleaner.ai
Handles review creation, retrieval, and responses
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from app.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class CreateReviewRequest(BaseModel):
    job_id: str
    overall_rating: int  # 1-5
    cleanliness_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    timeliness_rating: Optional[int] = None
    text: Optional[str] = None
    tags: List[str] = []
    photos: List[str] = []


class RespondToReviewRequest(BaseModel):
    response: str


# ==================== AUTH HELPER ====================

async def get_current_user(authorization: str = Header(None), db = Depends(get_db)):
    """Get current user from Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from jose import jwt, JWTError
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


# ==================== ENDPOINTS ====================

@router.post("/")
async def create_review(
    data: CreateReviewRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a review for a completed job"""
    
    # Get the job
    job = await db.job.find_unique(where={"id": data.job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify job is completed
    if job.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed jobs")
    
    # Check if already reviewed
    existing = await db.review.find_many(where={"job_id": data.job_id})
    if existing:
        raise HTTPException(status_code=400, detail="Job already reviewed")
    
    # Create review
    review = await db.review.create(data={
        "job_id": data.job_id,
        "author_id": user["id"],
        "overall_rating": data.overall_rating,
        "cleanliness_rating": data.cleanliness_rating,
        "communication_rating": data.communication_rating,
        "timeliness_rating": data.timeliness_rating,
        "text": data.text,
        "tags": data.tags,
        "photos": data.photos,
    })
    
    # Update cleaner stats
    if job.get("cleaner_id"):
        cleaner = await db.cleaner.find_unique(where={"id": job["cleaner_id"]})
        if cleaner:
            current_rating = cleaner.get("rating") or 0
            review_count = (cleaner.get("review_count") or 0) + 1
            
            # Calculate new average
            if current_rating == 0:
                new_rating = data.overall_rating
            else:
                new_rating = ((current_rating * (review_count - 1)) + data.overall_rating) / review_count
            
            await db.cleaner.update(
                where={"id": cleaner["id"]},
                data={
                    "rating": round(new_rating, 2),
                    "review_count": review_count,
                }
            )
    
    return review


@router.get("/")
async def list_reviews(
    job_id: Optional[str] = Query(None),
    cleaner_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db)
):
    """List reviews with optional filters"""
    
    where = {}
    if job_id:
        where["job_id"] = job_id
    
    reviews = await db.review.find_many(where=where if where else None)
    
    # Filter by cleaner if specified
    if cleaner_id:
        # Get jobs for this cleaner
        jobs = await db.job.find_many(where={"cleaner_id": cleaner_id})
        job_ids = {j["id"] for j in jobs}
        reviews = [r for r in reviews if r.get("job_id") in job_ids]
    
    # Sort by date descending
    reviews.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    paginated = reviews[start:end]
    
    # Enrich with author info
    enriched = []
    for r in paginated:
        author = await db.user.find_unique(where={"id": r.get("author_id")})
        enriched.append({
            **r,
            "author": {
                "name": author.get("full_name") if author else "Anonymous",
                "avatar": author.get("avatar_url") if author else None,
            } if author else None,
        })
    
    return {
        "reviews": enriched,
        "total": len(reviews),
        "page": page,
        "limit": limit,
    }


@router.get("/{review_id}")
async def get_review(review_id: str, db = Depends(get_db)):
    """Get review by ID"""
    
    review = await db.review.find_unique(where={"id": review_id})
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Get author info
    author = await db.user.find_unique(where={"id": review.get("author_id")})
    
    # Get job and cleaner info
    job = await db.job.find_unique(where={"id": review.get("job_id")})
    cleaner_info = None
    if job and job.get("cleaner_id"):
        cleaner = await db.cleaner.find_unique(where={"id": job["cleaner_id"]})
        if cleaner:
            cleaner_info = {
                "id": cleaner["id"],
                "business_name": cleaner.get("business_name"),
            }
    
    return {
        **review,
        "author": {
            "name": author.get("full_name") if author else "Anonymous",
            "avatar": author.get("avatar_url") if author else None,
        } if author else None,
        "cleaner": cleaner_info,
    }


@router.post("/{review_id}/respond")
async def respond_to_review(
    review_id: str,
    data: RespondToReviewRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Respond to a review (cleaner only)"""
    
    if user.get("role") != "cleaner":
        raise HTTPException(status_code=403, detail="Only cleaners can respond to reviews")
    
    review = await db.review.find_unique(where={"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Verify this is a review for the cleaner
    job = await db.job.find_unique(where={"id": review.get("job_id")})
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner or job.get("cleaner_id") != cleaner["id"]:
        raise HTTPException(status_code=403, detail="Can only respond to your own reviews")
    
    # Update review with response
    updated = await db.review.update(
        where={"id": review_id},
        data={
            "response": data.response,
            "responded_at": datetime.utcnow(),
        }
    )
    
    return updated


@router.post("/{review_id}/reveal")
async def reveal_review(
    review_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Reveal a review (two-sided reveal system).
    Both parties must reveal, or reviews auto-reveal after 48 hours."""
    
    review = await db.review.find_unique(where={"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.get("revealed"):
        return {"message": "Review already revealed", "review": review}
    
    # Get the job to check both sides
    job = await db.job.find_unique(where={"id": review.get("job_id")})
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")
    
    # Check all reviews for this job
    job_reviews = await db.review.find_many(where={"job_id": job["id"]})
    
    # Both sides have reviewed — reveal all
    both_sides = len(job_reviews) >= 2
    if both_sides:
        for r in job_reviews:
            await db.review.update(
                where={"id": r["id"]},
                data={"revealed": True}
            )
        return {"message": "Both reviews revealed", "count": len(job_reviews)}
    
    # Auto-reveal after 48 hours
    created = review.get("created_at")
    if created:
        from datetime import timedelta
        if isinstance(created, str):
            created = datetime.fromisoformat(created)
        if datetime.utcnow() - created > timedelta(hours=48):
            await db.review.update(
                where={"id": review_id},
                data={"revealed": True}
            )
            return {"message": "Review auto-revealed (48h elapsed)"}
    
    return {"message": "Waiting for other party to review before revealing"}


@router.get("/{review_id}/badges")
async def check_badges_after_review(review_id: str, db=Depends(get_db)):
    """Check and award badges after a review is created."""
    review = await db.review.find_unique(where={"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    job = await db.job.find_unique(where={"id": review.get("job_id")})
    if not job or not job.get("cleaner_id"):
        return {"badges_awarded": []}
    
    cleaner = await db.cleaner.find_unique(where={"id": job["cleaner_id"]})
    if not cleaner:
        return {"badges_awarded": []}
    
    try:
        from app.services.badge_engine import badge_engine
        awarded = await badge_engine.evaluate_user(cleaner.get("user_id"), db)
        return {"badges_awarded": awarded}
    except Exception as e:
        logger.error(f"Badge evaluation failed: {e}")
        return {"badges_awarded": [], "error": str(e)}


class FlagReviewRequest(BaseModel):
    reason: str  # inappropriate, fake, spam, other


@router.post("/{review_id}/flag")
async def flag_review(
    review_id: str,
    data: FlagReviewRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Flag a review for moderation"""
    review = await db.review.find_unique(where={"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Create flagged content entry
    flagged = await db.flagged_content.create(data={
        "content_type": "review",
        "content_id": review_id,
        "flagged_by": user["id"],
        "reason": data.reason,
        "status": "pending",
    })

    return {"message": "Review flagged for moderation", "flag_id": flagged.get("id")}


@router.get("/stats/{cleaner_id}")
async def get_review_stats(cleaner_id: str, db=Depends(get_db)):
    """Get computed aggregate review stats for a cleaner"""

    cleaner = await db.cleaner.find_unique(where={"id": cleaner_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")

    # Get all jobs for this cleaner
    jobs = await db.job.find_many(where={"cleaner_id": cleaner_id})
    job_ids = {j["id"] for j in jobs}

    # Get all reviews for those jobs
    all_reviews = await db.review.find_many()
    reviews = [r for r in all_reviews if r.get("job_id") in job_ids]

    if not reviews:
        return {
            "cleaner_id": cleaner_id,
            "total_reviews": 0,
            "average_rating": 0,
            "satisfaction_rate": 0,
            "rating_breakdown": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "sub_ratings": {
                "cleanliness": 0,
                "communication": 0,
                "timeliness": 0,
            },
        }

    # Compute stats
    ratings = [r.get("overall_rating", 0) for r in reviews]
    avg_rating = round(sum(ratings) / len(ratings), 2)

    breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in ratings:
        if r in breakdown:
            breakdown[r] += 1

    satisfied = len([r for r in ratings if r >= 4])
    satisfaction_rate = round((satisfied / len(ratings)) * 100, 1)

    # Sub-ratings
    clean_ratings = [r.get("cleanliness_rating") for r in reviews if r.get("cleanliness_rating")]
    comm_ratings = [r.get("communication_rating") for r in reviews if r.get("communication_rating")]
    time_ratings = [r.get("timeliness_rating") for r in reviews if r.get("timeliness_rating")]

    return {
        "cleaner_id": cleaner_id,
        "total_reviews": len(reviews),
        "average_rating": avg_rating,
        "satisfaction_rate": satisfaction_rate,
        "rating_breakdown": breakdown,
        "sub_ratings": {
            "cleanliness": round(sum(clean_ratings) / len(clean_ratings), 2) if clean_ratings else 0,
            "communication": round(sum(comm_ratings) / len(comm_ratings), 2) if comm_ratings else 0,
            "timeliness": round(sum(time_ratings) / len(time_ratings), 2) if time_ratings else 0,
        },
    }

