from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=255)
    role: str = "owner"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class TransactionCreate(BaseModel):
    user_id: int
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=120)
    amount: float = Field(gt=0)
    date: date
    note: str | None = None


class TransactionCreateMe(BaseModel):
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=120)
    amount: float = Field(gt=0)
    date: date
    note: str | None = None


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: str
    category: str
    amount: float
    date: date
    note: str | None = None


class MonthlyTrendPoint(BaseModel):
    month: date
    revenue: float
    expense: float
    net_cash_flow: float


class SummaryResponse(BaseModel):
    total_revenue: float
    total_expense: float
    net_profit: float
    margin_percent: float
    monthly_trend: list[MonthlyTrendPoint]
    insights: list[str]


class HealthScoreResponse(BaseModel):
    health_score: float
    profit_margin_component: float
    cash_flow_stability_component: float
    expense_efficiency_component: float
    interpretation: str


class RecurringExpenseItem(BaseModel):
    category: str
    average_monthly_amount: float
    active_months: int


class ExpenseIntelligenceResponse(BaseModel):
    recurring_expenses: list[RecurringExpenseItem]
    recommendations: list[str]


class PredictionPoint(BaseModel):
    month: date
    predicted_cash_flow: float


class PredictionResponse(BaseModel):
    model_used: str
    horizon_months: int
    deficit_risk_months: int
    points: list[PredictionPoint]


class UploadResponse(BaseModel):
    inserted_rows: int
    skipped_rows: int
    message: str


class ChatRequest(BaseModel):
    user_id: int
    question: str = Field(min_length=3, max_length=500)


class ChatRequestMe(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class ChatResponse(BaseModel):
    answer: str
