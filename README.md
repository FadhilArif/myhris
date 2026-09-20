# PeopleFlow HRIS — READY TO CONNECT

Project HRIS React + Vite + Supabase. UI mengikuti referensi: topbar hijau, sidebar, card putih, dense table, KPI, badge, dan mobile drawer.

## 1) Supabase: cukup 2 langkah

### A. SQL Editor
Buka:
Supabase -> SQL Editor -> New query

Copy seluruh isi:
`supabase/schema.sql`

Klik **Run**.

Script ini membuat tabel HRIS, RLS, policy development, department sample, employee sample, candidate sample, attendance, dan leave.

### B. Paste API ke `.env`

File `.env` sudah disediakan di root project:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Isi dari:
Supabase -> Project Settings -> API

Gunakan:
- Project URL
- Publishable key / anon key

JANGAN masukkan `service_role` / secret key ke frontend.

## 2) Jalankan

```bash
npm install
npm run dev
```

Buka URL Vite yang tampil di terminal.

Header akan menampilkan:
- `Supabase connected` = koneksi berhasil
- `Demo / Config missing` = .env belum benar
- `Supabase error` = koneksi ada tetapi query gagal

## 3) Arsitektur koneksi

```text
.env
  |
  v
src/lib/supabase.js     <- satu-satunya gateway Supabase
  |
  v
src/services/hris.js    <- fungsi query/insert/update/delete
  |
  v
src/main.jsx            <- UI HRIS
  |
  v
Supabase
```

Jadi kamu tidak perlu menempel API di banyak file.

## 4) Deploy Vercel

Push project ke GitHub.

Di Vercel:
Project -> Settings -> Environment Variables

Tambahkan:
`VITE_SUPABASE_URL`
`VITE_SUPABASE_ANON_KEY`

Lalu redeploy.

## 5) Keamanan

`schema.sql` memakai policy `dev_open_all` agar project latihan langsung hidup memakai publishable/anon key.

Untuk HRIS production, policy ini HARUS diganti menjadi:
- Supabase Auth
- authenticated-only access
- role-aware RLS
- audit log
- least privilege
- storage policies untuk dokumen

Jangan pernah menaruh service-role key di React/Vite frontend.

## Modul

Dashboard
Employees
Recruitment / ATS
Attendance
Leave & Permission
Overtime
Payroll
Contracts
Employee Movement
Performance
Training & Development
Offboarding
Reports & Analytics
Settings / Roles foundation
