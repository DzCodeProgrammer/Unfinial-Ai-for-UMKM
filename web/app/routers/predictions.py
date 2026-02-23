from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Prediction, User
from app.schemas import PredictionPoint, PredictionResponse
from app.services.analytics import load_user_transactions_df
from app.services.prediction import predict_cash_flow

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("/cash-flow/{user_id}", response_model=PredictionResponse)
def cash_flow_prediction(
    user_id: int,
    months: int = 6,
    model: str = "linear",
    db: Session = Depends(get_db),
) -> PredictionResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    if model not in {"linear", "arima"}:
        raise HTTPException(status_code=400, detail="Model harus 'linear' atau 'arima'.")

    df = load_user_transactions_df(db, user_id)
    try:
        used_model, points, deficit_risk = predict_cash_flow(df, horizon_months=months, model=model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Simpan history prediksi per request.
    rows = [
        Prediction(
            user_id=user_id,
            month=point["month"],
            predicted_value=point["predicted_cash_flow"],
            model_type=used_model,
        )
        for point in points
    ]
    db.add_all(rows)
    db.commit()

    return PredictionResponse(
        model_used=used_model,
        horizon_months=months,
        deficit_risk_months=deficit_risk,
        points=[PredictionPoint(**point) for point in points],
    )
