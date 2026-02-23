from fastapi import FastAPI

from app.core.config import settings
from app.database import Base, engine
from app.routers import chat, dashboard, insights, predictions, transactions, users

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {"message": "Unfinial AI API is running"}


app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(insights.router)
app.include_router(predictions.router)
app.include_router(chat.router)
