import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Operation, AuditLog
from app.schemas import AdminStatsResponse, AdminUserItem, AdminUserStatusUpdate, AuditLogItem, OperationHistoryResponse
from app.services.auth_service import get_current_admin
from app.services.audit_service import log_audit

router = APIRouter(prefix="/admin", tags=["Administrator Dashboard"])

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Provides high-level system metrics and chart feeds for the admin dashboard."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    inactive_users = total_users - active_users

    total_encryptions = db.query(func.count(Operation.id)).filter(
        Operation.operation_type == "ENCRYPT", Operation.status == "SUCCESS"
    ).scalar() or 0

    total_decryptions = db.query(func.count(Operation.id)).filter(
        Operation.operation_type == "DECRYPT", Operation.status == "SUCCESS"
    ).scalar() or 0

    failed_operations = db.query(func.count(Operation.id)).filter(
        Operation.status == "FAILED"
    ).scalar() or 0

    total_success = total_encryptions + total_decryptions

    # Recent operations
    recent_ops = (
        db.query(Operation)
        .order_by(Operation.created_at.desc())
        .limit(10)
        .all()
    )

    # Activity chart data: past 7 days
    now = datetime.datetime.now(datetime.timezone.utc)
    chart_days = []
    for i in range(6, -1, -1):
        day_date = (now - datetime.timedelta(days=i)).date()
        day_label = day_date.strftime("%b %d")
        
        # Count encryptions and decryptions for that calendar date
        start_dt = datetime.datetime.combine(day_date, datetime.time.min, tzinfo=datetime.timezone.utc)
        end_dt = datetime.datetime.combine(day_date, datetime.time.max, tzinfo=datetime.timezone.utc)
        
        enc_count = db.query(func.count(Operation.id)).filter(
            Operation.operation_type == "ENCRYPT",
            Operation.created_at >= start_dt,
            Operation.created_at <= end_dt
        ).scalar() or 0

        dec_count = db.query(func.count(Operation.id)).filter(
            Operation.operation_type == "DECRYPT",
            Operation.created_at >= start_dt,
            Operation.created_at <= end_dt
        ).scalar() or 0

        fail_count = db.query(func.count(Operation.id)).filter(
            Operation.status == "FAILED",
            Operation.created_at >= start_dt,
            Operation.created_at <= end_dt
        ).scalar() or 0

        chart_days.append({
            "date": day_label,
            "encryptions": enc_count,
            "decryptions": dec_count,
            "failed": fail_count
        })

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        total_encryptions=total_encryptions,
        total_decryptions=total_decryptions,
        failed_operations=failed_operations,
        recent_operations=recent_ops,
        operations_ratio={
            "encryptions": total_encryptions,
            "decryptions": total_decryptions,
            "success": total_success,
            "failed": failed_operations
        },
        daily_chart=chart_days
    )

@router.get("/users", response_model=List[AdminUserItem])
def get_all_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returns list of all registered users with operation counts."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    user_list = []
    for u in users:
        op_count = db.query(func.count(Operation.id)).filter(Operation.user_id == u.id).scalar() or 0
        user_list.append(
            AdminUserItem(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                created_at=u.created_at,
                operations_count=op_count
            )
        )
    return user_list

@router.patch("/users/{user_id}/status", response_model=AdminUserItem)
def toggle_user_status(
    user_id: int,
    status_update: AdminUserStatusUpdate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activates or deactivates a user account."""
    client_ip = request.client.host if request.client else "unknown"

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Guard: admin cannot deactivate their own account
    if target_user.id == current_admin.id and not status_update.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own administrative account."
        )

    target_user.is_active = status_update.is_active
    db.commit()
    db.refresh(target_user)

    action_label = "USER_ACTIVATED" if status_update.is_active else "USER_DEACTIVATED"
    log_audit(
        db, action=action_label, status="SUCCESS",
        details=f"Admin {current_admin.email} set active={status_update.is_active} for {target_user.email}",
        user_id=current_admin.id, ip_address=client_ip
    )

    op_count = db.query(func.count(Operation.id)).filter(Operation.user_id == target_user.id).scalar() or 0
    return AdminUserItem(
        id=target_user.id,
        full_name=target_user.full_name,
        email=target_user.email,
        role=target_user.role,
        is_active=target_user.is_active,
        created_at=target_user.created_at,
        operations_count=op_count
    )

@router.get("/logs", response_model=List[AuditLogItem])
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (SUCCESS/FAILED)"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieves system audit logs with optional filtering."""
    query = db.query(AuditLog, User.email).outerjoin(User, AuditLog.user_id == User.id)

    if action and action.upper() != "ALL":
        query = query.filter(AuditLog.action == action.upper())

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(AuditLog.status == status_filter.upper())

    records = query.order_by(AuditLog.created_at.desc()).limit(200).all()

    items = []
    for log_record, user_email in records:
        items.append(
            AuditLogItem(
                id=log_record.id,
                user_id=log_record.user_id,
                user_email=user_email,
                action=log_record.action,
                status=log_record.status,
                ip_address=log_record.ip_address,
                details=log_record.details,
                created_at=log_record.created_at
            )
        )
    return items
