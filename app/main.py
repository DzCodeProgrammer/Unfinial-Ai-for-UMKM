from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine
from app.routers import auth, chat, dashboard, insights, predictions, transactions, users

app = FastAPI(title=settings.app_name, version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
origin_regex = (settings.cors_origin_regex or "").strip() or None
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {"message": "Unfinial AI API is running"}


app.include_router(users.router)
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(insights.router)
app.include_router(predictions.router)
app.include_router(chat.router)
