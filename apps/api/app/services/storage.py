"""
AWS S3 File Upload Service for BookACleaner.ai
Handles profile photos, verification documents, portfolio images, and job photos
"""
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
import uuid
from datetime import datetime, timezone
from typing import Optional, BinaryIO
import mimetypes
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region,
    config=Config(signature_version='s3v4')
)

BUCKET_NAME = settings.aws_s3_bucket
CDN_URL = settings.cdn_url or f"https://{BUCKET_NAME}.s3.{settings.aws_region}.amazonaws.com"

# Allowed file types per category
ALLOWED_TYPES = {
    'image': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    'document': ['application/pdf', 'image/jpeg', 'image/png'],
}

MAX_FILE_SIZES = {
    'profile_photo': 5 * 1024 * 1024,      # 5MB
    'portfolio': 10 * 1024 * 1024,          # 10MB
    'verification': 20 * 1024 * 1024,       # 20MB
    'job_photo': 10 * 1024 * 1024,          # 10MB
    'message_attachment': 25 * 1024 * 1024, # 25MB
}


class FileUploadService:
    """Service for uploading files to AWS S3"""
    
    def __init__(self):
        self.client = s3_client
        self.bucket = BUCKET_NAME
        self.cdn_url = CDN_URL
    
    def _generate_key(self, category: str, user_id: str, filename: str) -> str:
        """Generate a unique S3 key for the file"""
        ext = filename.split('.')[-1] if '.' in filename else 'jpg'
        unique_id = uuid.uuid4().hex[:12]
        date_path = datetime.now(timezone.utc).strftime('%Y/%m')
        return f"{category}/{user_id}/{date_path}/{unique_id}.{ext}"
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type from filename"""
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or 'application/octet-stream'
    
    async def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        category: str,
        user_id: str,
        content_type: Optional[str] = None
    ) -> dict:
        """
        Upload a file to S3
        
        Args:
            file: File-like object to upload
            filename: Original filename
            category: One of 'profile_photo', 'portfolio', 'verification', 'job_photo', 'message_attachment'
            user_id: ID of the user uploading
            content_type: Optional content type override
        
        Returns:
            dict with 'success', 'url', 'key'
        """
        try:
            # Validate category
            if category not in MAX_FILE_SIZES:
                return {"success": False, "error": f"Invalid category: {category}"}
            
            # Get content type
            ct = content_type or self._get_content_type(filename)
            
            # Validate file type
            is_image_category = category in ['profile_photo', 'portfolio', 'job_photo']
            allowed = ALLOWED_TYPES['image'] if is_image_category else ALLOWED_TYPES['document']
            
            if ct not in allowed:
                return {"success": False, "error": f"File type {ct} not allowed for {category}"}
            
            # Generate S3 key
            key = self._generate_key(category, user_id, filename)
            
            # Upload to S3
            self.client.upload_fileobj(
                file,
                self.bucket,
                key,
                ExtraArgs={
                    'ContentType': ct,
                    'CacheControl': 'max-age=31536000',  # 1 year cache
                }
            )
            
            url = f"{self.cdn_url}/{key}"
            logger.info(f"File uploaded: {key}")
            
            return {
                "success": True,
                "url": url,
                "key": key,
                "content_type": ct,
            }
            
        except ClientError as e:
            logger.error(f"S3 upload error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_file(self, key: str) -> dict:
        """Delete a file from S3"""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"File deleted: {key}")
            return {"success": True}
        except ClientError as e:
            logger.error(f"S3 delete error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> dict:
        """Generate a presigned URL for temporary access"""
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            return {"success": True, "url": url}
        except ClientError as e:
            logger.error(f"Presigned URL error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_presigned_upload_url(
        self,
        filename: str,
        category: str,
        user_id: str,
        content_type: str,
        expires_in: int = 3600
    ) -> dict:
        """Generate a presigned URL for direct upload from frontend"""
        try:
            key = self._generate_key(category, user_id, filename)
            
            url = self.client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key,
                    'ContentType': content_type,
                },
                ExpiresIn=expires_in
            )
            
            return {
                "success": True,
                "upload_url": url,
                "key": key,
                "final_url": f"{self.cdn_url}/{key}",
            }
        except ClientError as e:
            logger.error(f"Presigned upload URL error: {e}")
            return {"success": False, "error": str(e)}


# Create singleton instance  
file_upload_service = FileUploadService()
