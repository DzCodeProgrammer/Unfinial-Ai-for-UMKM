from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import SummaryResponse
from app.services.analytics import dashboard_summary, load_user_transactions_df

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary/{user_id}", response_model=SummaryResponse)
def get_summary(user_id: int, months: int = 12, db: Session = Depends(get_db)) -> SummaryResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    months = max(1, min(months, 24))
    df = load_user_transactions_df(db, user_id)
    summary = dashboard_summary(df, months=months)
    return SummaryResponse(**summary)
