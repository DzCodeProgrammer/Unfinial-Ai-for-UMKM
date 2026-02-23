from __future__ import annotations

from datetime import date
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Transaction, User
from app.schemas import TransactionCreate, TransactionCreateMe, TransactionRead, UploadResponse

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


def _read_upload_frame(raw: bytes, filename: str) -> pd.DataFrame:
    lower = (filename or "").lower()
    if lower.endswith(".csv"):
        return pd.read_csv(BytesIO(raw))
    if lower.endswith(".xlsx"):
        return pd.read_excel(BytesIO(raw))
    raise HTTPException(status_code=400, detail="File harus .csv atau .xlsx")


def _insert_from_frame(db: Session, user_id: int, frame: pd.DataFrame) -> tuple[int, int]:
    frame.columns = [str(col).strip().lower() for col in frame.columns]
    required = {"date", "type", "category", "amount"}
    if not required.issubset(set(frame.columns)):
        raise HTTPException(status_code=400, detail="Kolom wajib: date, type, category, amount")

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

    return inserted, skipped


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


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction_me(
    payload: TransactionCreateMe,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    tx = Transaction(
        user_id=current_user.id,
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


@router.get("", response_model=list[TransactionRead])
def list_transactions_me(
    limit: int = 50,
    offset: int = 0,
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Transaction]:
    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    stmt = select(Transaction).where(Transaction.user_id == current_user.id)
    if start_date:
        stmt = stmt.where(Transaction.date >= start_date)
    if end_date:
        stmt = stmt.where(Transaction.date <= end_date)

    stmt = stmt.order_by(Transaction.date.desc(), Transaction.id.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()


@router.post("/upload", response_model=UploadResponse)
async def upload_transactions(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> UploadResponse:
    _validate_user(db, user_id)

    raw = await file.read()
    try:
        frame = _read_upload_frame(raw, file.filename or "")
        inserted, skipped = _insert_from_frame(db, user_id=user_id, frame=frame)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal memproses file: {exc}") from exc

    return UploadResponse(
        inserted_rows=inserted,
        skipped_rows=skipped,
        message=f"Upload selesai. {inserted} baris masuk, {skipped} baris dilewati.",
    )


@router.post("/upload/me", response_model=UploadResponse)
async def upload_transactions_me(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UploadResponse:
    raw = await file.read()
    try:
        frame = _read_upload_frame(raw, file.filename or "")
        inserted, skipped = _insert_from_frame(db, user_id=current_user.id, frame=frame)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal memproses file: {exc}") from exc

    return UploadResponse(
        inserted_rows=inserted,
        skipped_rows=skipped,
        message=f"Upload selesai. {inserted} baris masuk, {skipped} baris dilewati.",
    )
