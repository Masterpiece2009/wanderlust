from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from database import db
from services.recommendation_service import generate_recommendations

router = APIRouter(tags=["Recommendations"])

@router.get("/recommendations/{user_id}")
async def get_recommendations(
    user_id: str,
    num: int = Query(10, ge=1, le=50),
    force_refresh: bool = Query(False)
):
    """
    Get recommendations for a user.
    Notice how we use `await` for database calls now!
    """
    try:
        # Example of async database query using Motor
        user = await db.users.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Generate recommendations (this service should also be refactored to be async)
        recs = await generate_recommendations(user_id, num, force_refresh)
        
        return {"success": True, "data": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
