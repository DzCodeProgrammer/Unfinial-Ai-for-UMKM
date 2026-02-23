from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import ChatRequest, ChatRequestMe, ChatResponse
from app.services.analytics import (
    dashboard_summary,
    expense_intelligence,
    financial_health_score,
    load_user_transactions_df,
)
from app.services.chatbot import generate_finance_answer

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def finance_chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    df = load_user_transactions_df(db, payload.user_id)
    summary = dashboard_summary(df)
    score = financial_health_score(df)
    expense = expense_intelligence(df)

    answer = generate_finance_answer(
        question=payload.question,
        summary=summary,
        health_score=score,
        expense_insight=expense,
    )
    return ChatResponse(answer=answer)


@router.post("/me", response_model=ChatResponse)
def finance_chat_me(
    payload: ChatRequestMe,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    df = load_user_transactions_df(db, current_user.id)
    summary = dashboard_summary(df)
    score = financial_health_score(df)
    expense = expense_intelligence(df)

    answer = generate_finance_answer(
        question=payload.question,
        summary=summary,
        health_score=score,
        expense_insight=expense,
    )
    return ChatResponse(answer=answer)
