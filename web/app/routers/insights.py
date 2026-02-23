from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import ExpenseIntelligenceResponse, HealthScoreResponse
from app.services.analytics import expense_intelligence, financial_health_score, load_user_transactions_df

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/health-score/{user_id}", response_model=HealthScoreResponse)
def get_health_score(user_id: int, db: Session = Depends(get_db)) -> HealthScoreResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    df = load_user_transactions_df(db, user_id)
    score = financial_health_score(df)
    return HealthScoreResponse(**score)


@router.get("/expense-intelligence/{user_id}", response_model=ExpenseIntelligenceResponse)
def get_expense_intelligence(user_id: int, db: Session = Depends(get_db)) -> ExpenseIntelligenceResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    df = load_user_transactions_df(db, user_id)
    result = expense_intelligence(df)
    return ExpenseIntelligenceResponse(**result)
