from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Transaction


def _to_month_start(ts: pd.Timestamp) -> date:
    return ts.to_period("M").to_timestamp().date()


def load_user_transactions_df(db: Session, user_id: int) -> pd.DataFrame:
    rows = db.scalars(
        select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.date.asc())
    ).all()

    if not rows:
        return pd.DataFrame(columns=["date", "type", "category", "amount"])

    records = [
        {
            "date": pd.Timestamp(row.date),
            "type": row.type,
            "category": row.category,
            "amount": float(row.amount),
        }
        for row in rows
    ]
    return pd.DataFrame(records)


def monthly_cash_flow(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["month", "revenue", "expense", "net_cash_flow"])

    data = df.copy()
    data["month"] = data["date"].dt.to_period("M").dt.to_timestamp()

    revenue = data[data["type"] == "income"].groupby("month", as_index=False)["amount"].sum()
    revenue = revenue.rename(columns={"amount": "revenue"})

    expense = data[data["type"] == "expense"].groupby("month", as_index=False)["amount"].sum()
    expense = expense.rename(columns={"amount": "expense"})

    out = revenue.merge(expense, on="month", how="outer").fillna(0.0).sort_values("month")
    out["net_cash_flow"] = out["revenue"] - out["expense"]
    return out


def dashboard_summary(df: pd.DataFrame, months: int = 12) -> dict[str, Any]:
    monthly = monthly_cash_flow(df)
    total_revenue = float(df.loc[df["type"] == "income", "amount"].sum()) if not df.empty else 0.0
    total_expense = float(df.loc[df["type"] == "expense", "amount"].sum()) if not df.empty else 0.0
    net_profit = total_revenue - total_expense
    margin_percent = (net_profit / total_revenue * 100.0) if total_revenue > 0 else 0.0

    trend = []
    if not monthly.empty:
        monthly_tail = monthly.tail(months)
        trend = [
            {
                "month": _to_month_start(row.month),
                "revenue": round(float(row.revenue), 2),
                "expense": round(float(row.expense), 2),
                "net_cash_flow": round(float(row.net_cash_flow), 2),
            }
            for row in monthly_tail.itertuples(index=False)
        ]

    insights = detect_basic_insights(monthly)
    return {
        "total_revenue": round(total_revenue, 2),
        "total_expense": round(total_expense, 2),
        "net_profit": round(net_profit, 2),
        "margin_percent": round(margin_percent, 2),
        "monthly_trend": trend,
        "insights": insights,
    }


def detect_basic_insights(monthly: pd.DataFrame) -> list[str]:
    if monthly.empty:
        return ["Belum ada data transaksi untuk dianalisis."]

    insights: list[str] = []

    if len(monthly) >= 3:
        recent = monthly.tail(3).copy()
        start_expense = float(recent.iloc[0]["expense"])
        end_expense = float(recent.iloc[-1]["expense"])
        if start_expense > 0:
            increase = ((end_expense - start_expense) / start_expense) * 100.0
            if increase >= 20:
                insights.append(
                    f"Biaya operasional meningkat sekitar {increase:.1f}% dalam 2 bulan terakhir."
                )

    negative_months = int((monthly["net_cash_flow"] < 0).sum())
    if negative_months > 0:
        insights.append(f"Terdapat {negative_months} bulan dengan cash flow negatif.")

    avg_margin = (monthly["net_cash_flow"].sum() / monthly["revenue"].sum() * 100.0) if monthly["revenue"].sum() > 0 else 0.0
    if avg_margin >= 20:
        insights.append("Margin bisnis tergolong sehat (>= 20%).")
    elif avg_margin < 10:
        insights.append("Margin masih tipis (< 10%), evaluasi biaya variabel direkomendasikan.")

    if not insights:
        insights.append("Kondisi cash flow relatif stabil berdasarkan data yang tersedia.")

    return insights


def financial_health_score(df: pd.DataFrame) -> dict[str, float | str]:
    monthly = monthly_cash_flow(df)
    if monthly.empty:
        return {
            "health_score": 0.0,
            "profit_margin_component": 0.0,
            "cash_flow_stability_component": 0.0,
            "expense_efficiency_component": 0.0,
            "interpretation": "Data belum cukup untuk menghitung skor kesehatan keuangan.",
        }

    total_revenue = float(monthly["revenue"].sum())
    total_expense = float(monthly["expense"].sum())
    total_net = total_revenue - total_expense

    margin_pct = (total_net / total_revenue * 100.0) if total_revenue > 0 else 0.0
    profit_margin_component = max(0.0, min(100.0, margin_pct))

    net_series = monthly["net_cash_flow"]
    mean_abs = max(abs(float(net_series.mean())), 1.0)
    cv = float(net_series.std(ddof=0)) / mean_abs
    cash_flow_stability_component = max(0.0, min(100.0, 100.0 - (cv * 100.0)))

    expense_ratio = (total_expense / total_revenue) if total_revenue > 0 else 1.0
    expense_efficiency_component = max(0.0, min(100.0, 100.0 - (expense_ratio * 100.0)))

    score = (
        (profit_margin_component * 0.4)
        + (cash_flow_stability_component * 0.3)
        + (expense_efficiency_component * 0.3)
    )

    if score >= 80:
        label = "Sangat sehat"
    elif score >= 60:
        label = "Cukup sehat"
    elif score >= 40:
        label = "Perlu perhatian"
    else:
        label = "Berisiko"

    return {
        "health_score": round(score, 2),
        "profit_margin_component": round(profit_margin_component, 2),
        "cash_flow_stability_component": round(cash_flow_stability_component, 2),
        "expense_efficiency_component": round(expense_efficiency_component, 2),
        "interpretation": label,
    }


@dataclass
class RecurringExpense:
    category: str
    average_monthly_amount: float
    active_months: int


def expense_intelligence(df: pd.DataFrame) -> dict[str, Any]:
    if df.empty:
        return {"recurring_expenses": [], "recommendations": ["Belum ada data pengeluaran."]}

    expenses = df[df["type"] == "expense"].copy()
    if expenses.empty:
        return {"recurring_expenses": [], "recommendations": ["Belum ada data expense."]}

    expenses["month"] = expenses["date"].dt.to_period("M").dt.to_timestamp()
    monthly_cat = (
        expenses.groupby(["category", "month"], as_index=False)["amount"].sum().sort_values(["category", "month"])
    )

    recurring_items: list[RecurringExpense] = []
    recommendations: list[str] = []

    for category, group in monthly_cat.groupby("category"):
        months_active = int(group["month"].nunique())
        avg_amount = float(group["amount"].mean())
        std_amount = float(group["amount"].std(ddof=0)) if len(group) > 1 else 0.0
        cv = std_amount / max(avg_amount, 1.0)

        if months_active >= 3 and cv <= 0.5:
            recurring_items.append(
                RecurringExpense(
                    category=category,
                    average_monthly_amount=round(avg_amount, 2),
                    active_months=months_active,
                )
            )

        if months_active >= 3:
            recent = group.sort_values("month")
            latest = float(recent.iloc[-1]["amount"])
            previous_avg = float(recent.iloc[:-1]["amount"].mean()) if len(recent) > 1 else latest
            if previous_avg > 0:
                jump_pct = ((latest - previous_avg) / previous_avg) * 100.0
                if jump_pct >= 25:
                    recommendations.append(
                        f"Biaya kategori '{category}' naik {jump_pct:.1f}% dibanding rata-rata sebelumnya. Evaluasi kebutuhan kategori ini."
                    )

    recurring_items.sort(key=lambda x: x.average_monthly_amount, reverse=True)
    top_recurring = recurring_items[:5]

    if top_recurring:
        recommendations.append(
            f"Ada {len(top_recurring)} pengeluaran berulang dominan. Prioritaskan negosiasi vendor/langganan pada kategori dengan nilai terbesar."
        )

    if not recommendations:
        recommendations.append("Struktur biaya cukup stabil, pertahankan monitoring bulanan.")

    return {
        "recurring_expenses": [item.__dict__ for item in top_recurring],
        "recommendations": recommendations[:5],
    }
