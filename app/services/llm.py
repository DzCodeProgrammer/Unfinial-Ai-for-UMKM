from __future__ import annotations

import json

from openai import OpenAI

from app.core.config import settings


def _redact_none(obj: object) -> object:
    if isinstance(obj, dict):
        return {k: _redact_none(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [_redact_none(v) for v in obj]
    return obj


def llm_finance_chat(
    question: str,
    summary: dict,
    health_score: dict,
    expense_insight: dict,
) -> str:
    api_key = (settings.openai_api_key or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY belum diset.")

    model = (settings.openai_model or "").strip() or "gpt-4o-mini"
    client = OpenAI(api_key=api_key)

    system = (
        "Anda adalah Unfinial AI, asisten keuangan untuk UMKM di Indonesia.\n"
        "Jawab dalam Bahasa Indonesia yang jelas dan ringkas.\n"
        "Gunakan data yang diberikan; jangan mengarang angka.\n"
        "Jika data kurang, sebutkan data apa yang dibutuhkan.\n"
        "Jika user bertanya kemampuan/cara pakai, jelaskan fitur dan contoh pertanyaan.\n"
        "Berikan 3-5 rekomendasi tindakan yang konkret bila relevan.\n"
    )

    context = {
        "summary": summary,
        "health_score": health_score,
        "expense_intelligence": expense_insight,
    }
    context = _redact_none(context)
    user = (
        "Berikut ringkasan data keuangan user (JSON):\n"
        f"{json.dumps(context, ensure_ascii=False)}\n\n"
        f"Pertanyaan user: {question}"
    )

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )

    content = (resp.choices[0].message.content or "").strip()
    if not content:
        raise RuntimeError("LLM mengembalikan jawaban kosong.")
    return content
