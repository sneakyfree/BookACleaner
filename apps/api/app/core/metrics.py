"""
Prometheus Metrics and Observability Module
Exposes application metrics for monitoring
"""

from fastapi import APIRouter, Response
from datetime import datetime
from typing import Dict, Any

router = APIRouter(prefix="/metrics", tags=["Observability"])

# In-memory metrics storage
_metrics: Dict[str, Any] = {
    "requests_total": 0,
    "requests_by_endpoint": {},
    "requests_by_status": {},
    "response_time_seconds": [],
    "active_users": 0,
    "active_cleaners": 0,
    "jobs_created_total": 0,
    "jobs_completed_total": 0,
    "jobs_cancelled_total": 0,
    "payments_processed_total": 0,
    "payments_amount_total": 0.0,
    "payments_failed_total": 0,
    "messages_sent_total": 0,
    "sms_sent_total": 0,
    "sms_failed_total": 0,
    "ai_chat_total": 0,
    "ai_chat_failed_total": 0,
    "webhook_received_total": 0,
    "webhook_failed_total": 0,
    "errors_total": 0,
    "startup_time": datetime.now().isoformat(),
}


def record_request(endpoint: str, status_code: int, response_time: float):
    """Record a request for metrics"""
    _metrics["requests_total"] += 1
    
    if endpoint not in _metrics["requests_by_endpoint"]:
        _metrics["requests_by_endpoint"][endpoint] = 0
    _metrics["requests_by_endpoint"][endpoint] += 1
    
    status_group = f"{status_code // 100}xx"
    if status_group not in _metrics["requests_by_status"]:
        _metrics["requests_by_status"][status_group] = 0
    _metrics["requests_by_status"][status_group] += 1
    
    _metrics["response_time_seconds"].append(response_time)
    if len(_metrics["response_time_seconds"]) > 1000:
        _metrics["response_time_seconds"] = _metrics["response_time_seconds"][-1000:]
    
    if status_code >= 500:
        _metrics["errors_total"] += 1


def record_job_created():
    """Record a job creation"""
    _metrics["jobs_created_total"] += 1


def record_job_completed():
    """Record a job completion"""
    _metrics["jobs_completed_total"] += 1


def record_job_cancelled():
    """Record a job cancellation"""
    _metrics["jobs_cancelled_total"] += 1


def record_payment(amount: float):
    """Record a payment"""
    _metrics["payments_processed_total"] += 1
    _metrics["payments_amount_total"] += amount


def record_message():
    """Record a message sent"""
    _metrics["messages_sent_total"] += 1


def set_active_users(count: int):
    """Set active users count"""
    _metrics["active_users"] = count


def set_active_cleaners(count: int):
    """Set active cleaners count"""
    _metrics["active_cleaners"] = count


def record_sms_sent(success: bool = True):
    """Record an SMS send attempt"""
    if success:
        _metrics["sms_sent_total"] += 1
    else:
        _metrics["sms_failed_total"] += 1


def record_ai_chat(success: bool = True):
    """Record an AI chat attempt"""
    _metrics["ai_chat_total"] += 1
    if not success:
        _metrics["ai_chat_failed_total"] += 1


def record_payment_result(success: bool, amount: float = 0.0):
    """Record a payment result"""
    if success:
        _metrics["payments_processed_total"] += 1
        _metrics["payments_amount_total"] += amount
    else:
        _metrics["payments_failed_total"] += 1


def record_webhook(success: bool = True):
    """Record a webhook event"""
    _metrics["webhook_received_total"] += 1
    if not success:
        _metrics["webhook_failed_total"] += 1


@router.get("")
async def get_metrics():
    """Get application metrics in Prometheus format"""
    response_times = sorted(_metrics["response_time_seconds"]) if _metrics["response_time_seconds"] else [0]
    p50_idx = int(len(response_times) * 0.5)
    p95_idx = int(len(response_times) * 0.95)
    p99_idx = int(len(response_times) * 0.99)
    
    lines = []
    lines.append("# HELP bookacleaner_requests_total Total number of HTTP requests")
    lines.append("# TYPE bookacleaner_requests_total counter")
    lines.append(f"bookacleaner_requests_total {_metrics['requests_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_requests_by_status HTTP requests by status code group")
    lines.append("# TYPE bookacleaner_requests_by_status counter")
    
    for status, count in _metrics["requests_by_status"].items():
        lines.append(f'bookacleaner_requests_by_status{{status="{status}"}} {count}')
    
    lines.append("")
    lines.append("# HELP bookacleaner_response_time_seconds Response time in seconds")
    lines.append("# TYPE bookacleaner_response_time_seconds summary")
    lines.append(f'bookacleaner_response_time_seconds{{quantile="0.5"}} {response_times[p50_idx]:.4f}')
    lines.append(f'bookacleaner_response_time_seconds{{quantile="0.95"}} {response_times[p95_idx]:.4f}')
    lines.append(f'bookacleaner_response_time_seconds{{quantile="0.99"}} {response_times[p99_idx]:.4f}')
    lines.append("")
    lines.append("# HELP bookacleaner_active_users Currently active users")
    lines.append("# TYPE bookacleaner_active_users gauge")
    lines.append(f"bookacleaner_active_users {_metrics['active_users']}")
    lines.append("")
    lines.append("# HELP bookacleaner_jobs_created_total Total jobs created")
    lines.append("# TYPE bookacleaner_jobs_created_total counter")
    lines.append(f"bookacleaner_jobs_created_total {_metrics['jobs_created_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_jobs_completed_total Total jobs completed")
    lines.append("# TYPE bookacleaner_jobs_completed_total counter")
    lines.append(f"bookacleaner_jobs_completed_total {_metrics['jobs_completed_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_errors_total Total server errors")
    lines.append("# TYPE bookacleaner_errors_total counter")
    lines.append(f"bookacleaner_errors_total {_metrics['errors_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_sms_sent_total Total SMS sent successfully")
    lines.append("# TYPE bookacleaner_sms_sent_total counter")
    lines.append(f"bookacleaner_sms_sent_total {_metrics['sms_sent_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_sms_failed_total Total SMS send failures")
    lines.append("# TYPE bookacleaner_sms_failed_total counter")
    lines.append(f"bookacleaner_sms_failed_total {_metrics['sms_failed_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_ai_chat_failed_total Total AI chat failures")
    lines.append("# TYPE bookacleaner_ai_chat_failed_total counter")
    lines.append(f"bookacleaner_ai_chat_failed_total {_metrics['ai_chat_failed_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_payments_failed_total Total payment failures")
    lines.append("# TYPE bookacleaner_payments_failed_total counter")
    lines.append(f"bookacleaner_payments_failed_total {_metrics['payments_failed_total']}")
    lines.append("")
    lines.append("# HELP bookacleaner_webhook_failed_total Total webhook processing failures")
    lines.append("# TYPE bookacleaner_webhook_failed_total counter")
    lines.append(f"bookacleaner_webhook_failed_total {_metrics['webhook_failed_total']}")
    
    return Response(content="\n".join(lines), media_type="text/plain")


@router.get("/json")
async def get_metrics_json():
    """Get application metrics in JSON format"""
    response_times = sorted(_metrics["response_time_seconds"]) if _metrics["response_time_seconds"] else [0]
    
    return {
        "requests": {
            "total": _metrics["requests_total"],
            "by_status": _metrics["requests_by_status"],
        },
        "response_time": {
            "p50_seconds": response_times[int(len(response_times) * 0.5)] if response_times else 0,
            "p95_seconds": response_times[int(len(response_times) * 0.95)] if response_times else 0,
            "avg_seconds": sum(response_times) / len(response_times) if response_times else 0,
        },
        "users": {
            "active_users": _metrics["active_users"],
            "active_cleaners": _metrics["active_cleaners"],
        },
        "jobs": {
            "created": _metrics["jobs_created_total"],
            "completed": _metrics["jobs_completed_total"],
            "cancelled": _metrics["jobs_cancelled_total"],
        },
        "payments": {
            "total_count": _metrics["payments_processed_total"],
            "total_amount_usd": _metrics["payments_amount_total"],
        },
        "errors": {
            "total": _metrics["errors_total"],
        },
        "system": {
            "startup_time": _metrics["startup_time"],
        },
    }
