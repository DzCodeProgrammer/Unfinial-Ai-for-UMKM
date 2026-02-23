from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from app.services.analytics import monthly_cash_flow

try:
    from statsmodels.tsa.arima.model import ARIMA
except Exception:  # pragma: no cover - optional import at runtime
    ARIMA = None


def _month_starts(last_month: pd.Timestamp, horizon: int) -> list[date]:
    return [
        (last_month + pd.DateOffset(months=i)).to_period("M").to_timestamp().date()
        for i in range(1, horizon + 1)
    ]


def predict_cash_flow(
    transactions_df: pd.DataFrame,
    horizon_months: int = 6,
    model: str = "linear",
) -> tuple[str, list[dict[str, float | date]], int]:
    if horizon_months < 3 or horizon_months > 12:
        raise ValueError("horizon_months harus antara 3 dan 12.")

    monthly = monthly_cash_flow(transactions_df)
    if monthly.empty or len(monthly) < 2:
        raise ValueError("Data transaksi belum cukup untuk prediksi.")

    y = monthly["net_cash_flow"].astype(float).to_numpy()
    future_months = _month_starts(monthly.iloc[-1]["month"], horizon_months)

    used_model = "linear_regression"
    predictions: np.ndarray

    if model == "arima":
        if ARIMA is None or len(y) < 6:
            x = np.arange(len(y)).reshape(-1, 1)
            x_future = np.arange(len(y), len(y) + horizon_months).reshape(-1, 1)
            reg = LinearRegression()
            reg.fit(x, y)
            predictions = reg.predict(x_future)
        else:
            try:
                arima_model = ARIMA(y, order=(1, 1, 1))
                fit = arima_model.fit()
                predictions = fit.forecast(steps=horizon_months)
                used_model = "arima"
            except Exception:
                x = np.arange(len(y)).reshape(-1, 1)
                x_future = np.arange(len(y), len(y) + horizon_months).reshape(-1, 1)
                reg = LinearRegression()
                reg.fit(x, y)
                predictions = reg.predict(x_future)
    else:
        x = np.arange(len(y)).reshape(-1, 1)
        x_future = np.arange(len(y), len(y) + horizon_months).reshape(-1, 1)
        reg = LinearRegression()
        reg.fit(x, y)
        predictions = reg.predict(x_future)

    points = [
        {"month": m, "predicted_cash_flow": round(float(v), 2)}
        for m, v in zip(future_months, predictions.tolist(), strict=True)
    ]
    deficit_risk = int(sum(1 for point in points if point["predicted_cash_flow"] < 0))
    return used_model, points, deficit_risk
