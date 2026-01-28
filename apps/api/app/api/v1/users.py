from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_users():
    """List all users (admin only)"""
    return {"message": "Not implemented"}


@router.get("/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    return {"message": "Not implemented"}
