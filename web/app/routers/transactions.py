from __future__ import annotations

from datetime import date
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction, User
from app.schemas import TransactionCreate, TransactionRead, UploadResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])

TYPE_ALIAS = {
    "income": "income",
    "expense": "expense",
    "pendapatan": "income",
    "pemasukan": "income",
    "pengeluaran": "expense",
    "beban": "expense",
}


def _normalize_type(raw: str) -> str | None:
    if raw is None:
        return None
    return TYPE_ALIAS.get(str(raw).strip().lower())


def _validate_user(db: Session, user_id: int) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")


@router.post("/manual", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)) -> Transaction:
    _validate_user(db, payload.user_id)

    tx = Transaction(
        user_id=payload.user_id,
        type=payload.type,
        category=payload.category,
        amount=payload.amount,
        date=payload.date,
        note=payload.note,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.post("/upload", response_model=UploadResponse)
async def upload_transactions(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> UploadResponse:
    _validate_user(db, user_id)

    raw = await file.read()
    filename = file.filename or ""
    lower = filename.lower()

    try:
        if lower.endswith(".csv"):
            frame = pd.read_csv(BytesIO(raw))
        elif lower.endswith(".xlsx"):
            frame = pd.read_excel(BytesIO(raw))
        else:
            raise HTTPException(status_code=400, detail="File harus .csv atau .xlsx")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {exc}") from exc

    frame.columns = [str(col).strip().lower() for col in frame.columns]
    required = {"date", "type", "category", "amount"}
    if not required.issubset(set(frame.columns)):
        raise HTTPException(
            status_code=400,
            detail="Kolom wajib: date, type, category, amount",
        )

    inserted = 0
    skipped = 0
    objects: list[Transaction] = []

    for row in frame.to_dict(orient="records"):
        normalized = _normalize_type(row.get("type"))
        if normalized not in {"income", "expense"}:
            skipped += 1
            continue

        try:
            amount = float(row.get("amount"))
            tx_date = pd.to_datetime(row.get("date")).date()
            category = str(row.get("category")).strip()

            if amount <= 0 or not category:
                skipped += 1
                continue
        except Exception:
            skipped += 1
            continue

        note = row.get("note")
        objects.append(
            Transaction(
                user_id=user_id,
                type=normalized,
                category=category,
                amount=amount,
                date=date(tx_date.year, tx_date.month, tx_date.day),
                note=str(note) if note is not None else None,
            )
        )
        inserted += 1

    if objects:
        db.add_all(objects)
        db.commit()

    return UploadResponse(
        inserted_rows=inserted,
        skipped_rows=skipped,
        message=f"Upload selesai. {inserted} baris masuk, {skipped} baris dilewati.",
    )
