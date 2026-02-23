# Unfinial AI - MVP Backend

Backend MVP untuk Unfinial AI, asisten keuangan berbasis AI untuk UMKM.

## Fitur yang sudah tersedia

- Manajemen user sederhana
- Login + JWT (opsional untuk endpoint `*/me`)
- Input transaksi:
  - Manual via API
  - Upload CSV/XLSX
- Dashboard ringkas:
  - Total revenue
  - Total expense
  - Net profit
  - Margin
  - Tren bulanan
- AI Insights:
  - Financial health score (0-100)
  - Expense intelligence (deteksi biaya berulang + rekomendasi)
- Prediksi cash flow 3-12 bulan:
  - Linear Regression
  - ARIMA (otomatis fallback ke linear jika data tidak cukup / gagal fit)
- Endpoint chat keuangan berbasis data user

## Stack

- FastAPI
- SQLAlchemy
- PostgreSQL (default), SQLite (opsional lokal)
- Pandas + Scikit-Learn + Statsmodels

## Menjalankan lokal

1. Buat virtual environment lalu install dependency:

```bash
python -m pip install -r requirements.txt
```

2. Salin env:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Jalankan API:

```bash
uvicorn app.main:app --reload
```

4. Buka docs:

- Swagger UI: `http://127.0.0.1:8000/docs`

## Autentikasi (JWT)

1. Buat user: `POST /users`
2. Login: `POST /auth/login` (email + password) -> dapat `access_token`
3. Panggil endpoint berbasis user login dengan header:

```text
Authorization: Bearer <access_token>
```

Contoh endpoint:

- `GET /dashboard/summary`
- `GET /insights/health-score`
- `GET /predictions/cash-flow`
- `POST /transactions` dan `POST /transactions/upload/me`
- `POST /chat/me`

## OpenAI (opsional)

Jika `OPENAI_API_KEY` diset, endpoint chat akan menggunakan LLM. Jika tidak, chat akan fallback ke rule-based.

## Menjalankan dengan Docker

```bash
docker compose up --build
```

API akan tersedia di `http://127.0.0.1:8000`.

## Frontend (Next.js)

Project web ada di folder `web/`.

1. Siapkan env:

```powershell
Copy-Item web/.env.example web/.env.local
```

2. Jalankan:

```powershell
cd web
npm install
npm run dev
```

Frontend akan tersedia di `http://127.0.0.1:3000`.

## Struktur ringkas

```text
app/
  main.py
  core/config.py
  database.py
  models.py
  schemas.py
  routers/
  services/
```

## Catatan penting

- Rumus health score:
  - `(Profit Margin * 40%) + (Cash Flow Stability * 30%) + (Expense Efficiency * 30%)`
- Endpoint prediksi menyimpan histori ke tabel `predictions`.
- Upload file menerima kolom minimal: `date`, `type`, `category`, `amount`.
