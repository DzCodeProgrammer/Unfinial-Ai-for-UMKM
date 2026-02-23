from __future__ import annotations

from app.core.config import settings
from app.services.llm import llm_finance_chat


def _generate_finance_answer_rule_based(
    question: str,
    summary: dict,
    health_score: dict,
    expense_insight: dict,
) -> str:
    q = question.lower()

    if "kondisi" in q or "keuangan" in q:
        return (
            f"Revenue Anda Rp{summary['total_revenue']:.2f}, expense Rp{summary['total_expense']:.2f}, "
            f"net profit Rp{summary['net_profit']:.2f} dengan margin {summary['margin_percent']:.2f}%. "
            f"Insight utama: {summary['insights'][0]}"
        )

    if "sehat" in q or "health" in q:
        return (
            f"Skor kesehatan keuangan saat ini {health_score['health_score']}/100 "
            f"({health_score['interpretation']}). Fokus perbaikan: "
            f"margin={health_score['profit_margin_component']}, "
            f"stabilitas cash flow={health_score['cash_flow_stability_component']}, "
            f"efisiensi biaya={health_score['expense_efficiency_component']}."
        )

    if "kurangi" in q or "hemat" in q or "biaya" in q:
        recs = expense_insight.get("recommendations", [])
        if recs:
            return f"Prioritas penghematan: {recs[0]}"
        return "Data belum cukup untuk rekomendasi penghematan yang spesifik."

    return (
        "Saya sudah membaca data keuangan Anda. Untuk jawaban paling presisi, "
        "tanyakan salah satu ini: kondisi keuangan, kesehatan bisnis, atau biaya yang harus dikurangi."
    )


def generate_finance_answer(
    question: str,
    summary: dict,
    health_score: dict,
    expense_insight: dict,
) -> str:
    api_key = (settings.openai_api_key or "").strip()
    if api_key:
        try:
            return llm_finance_chat(
                question=question,
                summary=summary,
                health_score=health_score,
                expense_insight=expense_insight,
            )
        except Exception:
            # Jangan fallback ke rule-based jika user sudah konfigurasi OpenAI.
            # Ini sengaja supaya error konfigurasi/akses cepat terlihat saat development.
            return (
                "Chat AI (OpenAI) sedang gagal dipakai. Cek `OPENAI_API_KEY`/`OPENAI_MODEL` "
                "di `.env`, pastikan server sudah direstart, lalu coba lagi."
            )

    # Jika OpenAI tidak dikonfigurasi, fallback ke rule-based.
    return _generate_finance_answer_rule_based(
        question=question,
        summary=summary,
        health_score=health_score,
        expense_insight=expense_insight,
    )
