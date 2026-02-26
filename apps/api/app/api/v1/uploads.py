from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import io

from app.services.storage import file_upload_service, MAX_FILE_SIZES
from app.api.deps import get_current_user

router = APIRouter()


class PresignedUploadRequest(BaseModel):
    filename: str
    category: str
    content_type: str


class PresignedUploadResponse(BaseModel):
    upload_url: str
    key: str
    final_url: str


@router.post("/upload/{category}")
async def upload_file(
    category: str,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """
    Upload a file directly to S3
    
    Categories:
    - profile_photo: User profile photos (5MB max)
    - portfolio: Cleaner portfolio images (10MB max)
    - verification: Verification documents (20MB max)
    - job_photo: Before/after job photos (10MB max)
    - message_attachment: Message attachments (25MB max)
    """
    user_id = user["id"]

    # Validate category
    if category not in MAX_FILE_SIZES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {list(MAX_FILE_SIZES.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZES[category]:
        max_mb = MAX_FILE_SIZES[category] / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size for {category} is {max_mb}MB"
        )
    
    # Upload to S3
    result = await file_upload_service.upload_file(
        file=io.BytesIO(content),
        filename=file.filename or "upload",
        category=category,
        user_id=user_id,
        content_type=file.content_type
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Upload failed"))
    
    return {
        "url": result["url"],
        "key": result["key"],
    }


@router.post("/presigned-upload", response_model=PresignedUploadResponse)
async def get_presigned_upload_url(
    data: PresignedUploadRequest,
    user=Depends(get_current_user),
):
    """
    Get a presigned URL for direct upload from the frontend.
    This is more efficient for large files as they go directly to S3.
    """
    user_id = user["id"]

    if data.category not in MAX_FILE_SIZES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {list(MAX_FILE_SIZES.keys())}"
        )
    
    result = await file_upload_service.get_presigned_upload_url(
        filename=data.filename,
        category=data.category,
        user_id=user_id,
        content_type=data.content_type
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate URL"))
    
    return PresignedUploadResponse(
        upload_url=result["upload_url"],
        key=result["key"],
        final_url=result["final_url"]
    )


@router.delete("/{key:path}")
async def delete_file(
    key: str,
    user=Depends(get_current_user),
):
    """Delete a file from S3"""
    user_id = user["id"]

    # Verify user owns this file
    if f"/{user_id}/" not in key:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")

    result = await file_upload_service.delete_file(key)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Delete failed"))
    
    return {"success": True}


@router.get("/presigned/{key:path}")
async def get_presigned_download_url(
    key: str,
    expires_in: int = 3600,
    user=Depends(get_current_user),
):
    """Get a temporary presigned URL for downloading a private file"""
    # Verify user owns this file
    user_id = user["id"]
    if f"/{user_id}/" not in key:
        raise HTTPException(status_code=403, detail="Not authorized to access this file")

    result = await file_upload_service.get_presigned_url(key, expires_in)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate URL"))
    
    return {"url": result["url"]}
