# 🌿 My HRIS

Sistem Informasi Sumber Daya Manusia berbasis web untuk mengelola seluruh siklus hidup karyawan — dari rekrutmen hingga offboarding.

**Entry HRIS:** `/hris/`  
**Halaman Karir:** `/career/`

---

## 📋 Daftar Isi

1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur](#-arsitektur)
3. [Instalasi](#-instalasi)
4. [Struktur Database](#-struktur-database)
5. [Panduan Pengguna](#-panduan-pengguna)
6. [Panduan Developer](#-panduan-developer)
7. [Troubleshooting](#-troubleshooting)

---

## ✨ Fitur Utama

### 🏢 Core HR
- Data Karyawan (CRUD, filter, search, foto profil, import CSV)
- Departemen & Jabatan (relasional)
- Employee Detail View 10 tab (Overview, Employment, Absensi, Cuti, Payroll, Kinerja, Training, Movement, Dokumen, Audit)
- Kontrak kerja & riwayat promosi/mutasi

### ⏰ Time Management
- Absensi check-in/out dengan auto-detect keterlambatan
- Pengajuan cuti + approval + saldo otomatis
- Rekap absensi per tanggal

### 💰 Payroll
- Periode payroll (draft → processed)
- Komponen gaji fleksibel (fixed/percentage)
- **PPh 21 progresif** sesuai UU HPP 2024
- **BPJS lengkap**: Kesehatan (1%), JHT (2%), JP (1%)
- Cetak slip gaji (print-ready)

### 🎯 Rekrutmen
- Job posting dengan status open/closed
- Pipeline kandidat 6 tahap
- Halaman karir publik untuk pelamar eksternal
- Konversi candidate → employee

### 📈 Talent Management
- Siklus penilaian kinerja (KPI + feedback)
- Program training + enrollment
- Sertifikat & skill tracking

### 👤 Employee Self-Service
- Lihat profil sendiri (klik avatar sidebar)
- Absensi, cuti, slip gaji, klaim reimbursement
- Direktori karyawan
- Enroll training mandiri

### 🔒 Security & Governance
- Supabase Auth (email/password)
- Row Level Security (RLS) per tabel
- **Audit log** otomatis untuk perubahan penting
- Role-based access: Admin, HR, Manager, Employee
- **Laporan & Audit:** export Excel (.xlsx) dan cetak PDF untuk data karyawan, absensi + shift, cuti, saldo cuti, lembur, payroll, rekrutmen, kinerja, training, reimbursement, dan audit log

---

## 🏗️ Arsitektur

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Browser    │───→│  Supabase    │───→│  PostgreSQL  │
│  (SPA - JS)  │    │   Client     │    │   + RLS      │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ├──→ Auth (JWT)
                           ├──→ Storage (files)
                           └──→ REST API
```

**Tech Stack:**
| Layer | Teknologi |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Backend | Supabase (BaaS) |
| Database | PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Vercel / Netlify |

---

## 🚀 Instalasi

### Prasyarat
- Node.js (untuk local dev server, opsional)
- Akun [Supabase](https://supabase.com) (free tier cukup)
- Akun [Vercel](https://vercel.com) (untuk deploy, opsional)

### Langkah 1: Setup Supabase

1. **Buat project baru** di [Supabase Dashboard](https://app.supabase.com)
2. Catat **Project URL** dan **Anon Key** dari Settings → API

### Langkah 2: Setup Database

Buka **SQL Editor** di Supabase, jalankan skema berikut:

```sql
-- 1. Master data
CREATE TABLE departments (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT UNIQUE NOT NULL);
CREATE TABLE positions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, department_id UUID REFERENCES departments(id));

-- 2. Karyawan
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT, phone TEXT,
  department_id UUID REFERENCES departments(id),
  position_id UUID REFERENCES positions(id),
  join_date DATE DEFAULT CURRENT_DATE,
  basic_salary NUMERIC DEFAULT 0,
  employment_status TEXT DEFAULT 'active',
  ptkp_status TEXT DEFAULT 'TK/0',
  photo_url TEXT
);

-- 3. Profiles (user-role)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'employee',
  employee_id UUID REFERENCES employees(id)
);

-- 4. Absensi
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  check_in TIMESTAMPTZ, check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  UNIQUE(employee_id, work_date)
);

-- 5. Cuti
CREATE TABLE leave_types (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT, default_days_per_year INT DEFAULT 12);
CREATE TABLE leave_balances (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), employee_id UUID, leave_type_id UUID, year INT, total_days NUMERIC DEFAULT 0, used_days NUMERIC DEFAULT 0, UNIQUE(employee_id, leave_type_id, year));
CREATE TABLE leave_requests (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), employee_id UUID, leave_type_id UUID, start_date DATE, end_date DATE, total_days NUMERIC, reason TEXT, status TEXT DEFAULT 'pending', approved_by UUID, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());

-- 6. Payroll
CREATE TABLE payroll_components (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT, component_type TEXT, is_percentage BOOLEAN DEFAULT false, default_amount NUMERIC DEFAULT 0, calc_type TEXT DEFAULT 'fixed');
CREATE TABLE payroll_runs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), period_month INT, period_year INT, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(period_month, period_year));
CREATE TABLE payslips (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), payroll_run_id UUID REFERENCES payroll_runs(id), employee_id UUID REFERENCES employees(id), basic_salary NUMERIC, total_earnings NUMERIC, total_deductions NUMERIC, net_salary NUMERIC, details JSONB, UNIQUE(payroll_run_id, employee_id));

-- 7. Rekrutmen
CREATE TABLE job_postings (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), title TEXT, department_id UUID, description TEXT, status TEXT DEFAULT 'open', opened_date DATE DEFAULT CURRENT_DATE);
CREATE TABLE candidates (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), job_posting_id UUID, applicant_id UUID, full_name TEXT, email TEXT, phone TEXT, stage TEXT DEFAULT 'applied', applied_at TIMESTAMPTZ DEFAULT NOW());

-- 8. Kinerja & Training
CREATE TABLE performance_cycles (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT, start_date DATE, end_date DATE, status TEXT DEFAULT 'open');
CREATE TABLE performance_reviews (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), cycle_id UUID, employee_id UUID, score INT, strengths TEXT, improvements TEXT, status TEXT DEFAULT 'submitted', UNIQUE(cycle_id, employee_id));
CREATE TABLE training_programs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT, provider TEXT, start_date DATE, end_date DATE, description TEXT);
CREATE TABLE training_enrollments (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), program_id UUID, employee_id UUID, status TEXT DEFAULT 'enrolled', completion_date DATE, UNIQUE(program_id, employee_id));

-- 9. Reimbursement
CREATE TABLE reimbursement_claims (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), employee_id UUID, category TEXT, amount NUMERIC, description TEXT, status TEXT DEFAULT 'pending', submitted_at TIMESTAMPTZ DEFAULT NOW(), approved_by UUID, approved_at TIMESTAMPTZ);

-- 10. Employee Detail extras
CREATE TABLE contracts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), employee_id UUID, contract_number TEXT, contract_type TEXT, start_date DATE, end_date DATE, basic_salary NUMERIC, status TEXT DEFAULT 'active');
CREATE TABLE employee_movements (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), employee_id UUID, movement_type TEXT, effective_date DATE, from_department_id UUID, to_department_id UUID, from_position_id UUID, to_position_id UUID, from_salary NUMERIC, to_salary NUMERIC, reason TEXT);
CREATE TABLE employee_documents (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), employee_id UUID, document_type TEXT, file_name TEXT, file_url TEXT, file_size INT, file_type TEXT, expiry_date DATE, uploaded_by UUID, created_at TIMESTAMPTZ DEFAULT NOW());

-- 11. Audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Seed data awal
INSERT INTO leave_types (name, default_days_per_year) VALUES
  ('Cuti Tahunan', 12), ('Cuti Sakit', 12), ('Cuti Melahirkan', 90), ('Izin Tanpa Gaji', 0);

INSERT INTO payroll_components (name, component_type, calc_type, default_amount) VALUES
  ('Gaji Pokok', 'earning', 'fixed', 0),
  ('Tunjangan Transport', 'earning', 'fixed', 300000),
  ('Tunjangan Makan', 'earning', 'fixed', 300000),
  ('BPJS Kesehatan', 'deduction', 'bpjs_kesehatan', 0),
  ('BPJS JHT', 'deduction', 'bpjs_jht', 0),
  ('BPJS JP', 'deduction', 'bpjs_jp', 0),
  ('PPh 21', 'deduction', 'pph21', 0);
```

### Langkah 3: Setup Storage Buckets

Jalankan juga di SQL Editor:

```sql
-- Bucket foto profil
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-photos', 'employee-photos', true);
CREATE POLICY "Public read photos" ON storage.objects FOR SELECT USING (bucket_id = 'employee-photos');
CREATE POLICY "Auth upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee-photos');

-- Bucket dokumen
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('employee-documents', 'employee-documents', true, 10485760);
CREATE POLICY "Public read docs" ON storage.objects FOR SELECT USING (bucket_id = 'employee-documents');
CREATE POLICY "Auth upload docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee-documents');
CREATE POLICY "Auth delete docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'employee-documents');
```

### Langkah 4: Setup RLS Policy

```sql
-- Helper function
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_hr_or_admin() RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('admin','hr');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Aktifkan RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- (ulangi untuk tabel lain)

-- Contoh policy employees
CREATE POLICY "read_all" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_hr" ON employees FOR ALL TO authenticated USING (is_hr_or_admin());
```

### Role & Akses MyHRIS

| Role | Fokus akses |
|---|---|
| **Admin** | Seluruh modul, Pengaturan, Pengguna & Role, Laporan & Audit |
| **HR** | Operasional HR: karyawan, absensi, shift, cuti, lembur, payroll, rekrutmen, kinerja, training, reimbursement, laporan |
| **Manager** | Tim/departemen sendiri: absensi, cuti, lembur, kinerja, training, laporan tim |
| **Employee** | Data dan transaksi pribadi: absensi, cuti, lembur, slip gaji, klaim, training, direktori |

Manager v1 menggunakan **departemen** sebagai lingkup tim. Ini sengaja kompatibel dengan schema lama yang belum memiliki `manager_id`. Setelah schema `manager_id` ditambahkan, scope dapat diperketat ke bawahan langsung.

### Laporan, Excel & PDF

Menu **Laporan & Audit** tersedia untuk Admin, HR, dan Manager. Laporan yang disediakan mencakup:
- Data Karyawan
- Absensi + keterangan shift (nama shift, jam kerja, toleransi)
- Pengajuan Cuti
- Saldo Cuti
- Lembur
- Payroll + rincian komponen slip
- Rekrutmen
- Kinerja
- Training
- Reimbursement
- Audit Log (Admin/HR)

Tombol **Excel** membuat file `.xlsx` menggunakan SheetJS. Tombol **Cetak PDF** membuka dialog print browser sehingga laporan dapat disimpan sebagai PDF.

**Untuk project existing, jalankan juga:** `database/ROLE-PERMISSIONS.sql` setelah schema dasar. RLS frontend dan route guard saja tidak cukup untuk keamanan data.

### Langkah 5: Trigger Auto-Create Profile

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'employee')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

### Langkah 6: Konfigurasi Frontend

Konfigurasi Supabase sekarang dipusatkan di:

```text
src/lib/supabase.js
```

File tersebut membuat Supabase client yang dipakai seluruh modul HRIS.

> Catatan: gunakan **publishable/anon key** di frontend. Jangan pernah menaruh service-role key di file yang dikirim ke browser.

### Langkah 7: Deploy (Opsional)

**Via Vercel:**
1. Push project ke GitHub
2. Import repo di [vercel.com/new](https://vercel.com/new)
3. Framework: **Other** → Deploy
4. Selesai! URL: `https://your-project.vercel.app`

**Via local:**
```bash
npx serve .
# Buka http://localhost:3000
```

---

## 📁 Struktur File

Setelah refactor, logic aplikasi tidak lagi berada di satu `app.js`. Entry point HRIS dan Career juga dipisahkan.

```
myhris/
├── index.html                # Redirect ke /hris/
├── hris/
│   └── index.html            # Aplikasi HRIS (HR + Karyawan)
├── career/
│   └── index.html            # Halaman karir publik
├── style.css                 # CSS legacy/shared
├── src/
│   ├── main.js               # Entry point HRIS + wiring module
│   ├── lib/
│   │   └── supabase.js       # Supabase client
│   ├── config/
│   │   ├── constants.js      # Konstanta pajak, role, status, dll
│   │   └── icons.js          # SVG icons
│   ├── utils/
│   │   ├── format.js         # Format uang/tanggal/file
│   │   ├── dom.js            # Helper DOM, modal, toast, badge
│   │   └── tax.js             # Kalkulasi PPh 21
│   ├── state/
│   │   └── store.js          # State aplikasi + cache
│   ├── services/
│   │   ├── db.js             # Helper query Supabase
│   │   ├── auth.js           # Login, logout, boot, preload
│   │   └── audit.js          # Audit log
│   ├── routes/
│   │   ├── navigation.js     # Sidebar/navigation
│   │   └── router.js         # Route + access control
│   └── modules/
│       ├── auth.js
│       ├── dashboard.js
│       ├── employees.js
│       ├── attendance.js
│       ├── leave.js
│       ├── shifts.js
│       ├── overtime.js
│       ├── payroll.js
│       ├── recruitment.js
│       ├── performance.js
│       ├── onboarding.js
│       ├── training.js
│       ├── claims.js
│       ├── directory.js
│       ├── settings.js
│       └── employeeDetail.js
└── PANDUAN.md
```

**Entry point deployment:**
- HRIS: `/hris/`
- Career: `/career/`
- Root `/`: redirect ke `/hris/`

---

## 👥 Panduan Pengguna

### 🔐 Login

1. Buka aplikasi → masukkan **email + password**
2. Klik **Masuk**
3. Anda akan diarahkan ke Dashboard sesuai role

### 👑 Untuk Admin / HR

**Dashboard**
- Lihat statistik: total karyawan, kehadiran, cuti pending, klaim pending
- Grafik distribusi karyawan per departemen

**Data Karyawan**
- **Tambah**: klik `+ Tambah Karyawan`, isi form, upload foto, simpan
- **Edit**: klik tombol Edit di baris karyawan
- **Detail**: klik nama karyawan → 10 tab profil lengkap
- **Filter**: pilih unit + jabatan untuk mempersempit
- **Import CSV**: upload file CSV dengan header Indonesia (lihat template)
- **Hapus**: belum tersedia (soft delete via status)

**Absensi**
- Pilih tanggal → lihat siapa hadir/terlambat/absen
- Deteksi keterlambatan otomatis (≥ 09:00)

**Cuti & Izin**
- **Tab Pengajuan**: lihat semua pengajuan, klik Setujui/Tolak
- **Tab Saldo Cuti**: set saldo per karyawan

**Payroll**
- Buat periode (misal: 09/2026)
- Klik **Generate Slip** → otomatis hitung semua karyawan aktif
- PPh 21 + BPJS dihitung otomatis
- Klik **Lihat Slip** untuk preview

**Rekrutmen**
- **Buka Lowongan**: isi posisi, departemen, deskripsi
- **Salin Link Halaman Karir**: share ke pelamar
- **Lihat Kandidat**: update tahap per kandidat

**Pengaturan**
- Kelola Departemen, Jabatan, Jenis Cuti, Komponen Payroll
- **Pengguna & Role**: tautkan akun ke karyawan + atur role

### 👤 Untuk Employee

- **Dashboard**: ringkasan pribadi
- **Absensi Saya**: Check In / Check Out
- **Cuti Saya**: ajukan cuti, lihat saldo & riwayat
- **Slip Gaji**: lihat + cetak slip gaji sendiri
- **Klaim Saya**: ajukan reimbursement
- **Direktori Karyawan**: lihat rekan kerja
- **Training**: ikut program training
- **Klik Avatar**: buka profil sendiri

---

## 🛠️ Panduan Developer

### Arsitektur Modul

`src/main.js` adalah entry point utama HRIS. File ini menghubungkan:
- shared utilities
- state
- service Supabase
- authentication
- routing
- seluruh feature module

Feature module berada di `src/modules/` dan masing-masing bertanggung jawab atas area fitur tertentu.

### Menambah Modul Baru

1. Buat file baru di `src/modules/`, misalnya `src/modules/example.js`.
2. Export renderer/function yang dibutuhkan.
3. Import module tersebut di `src/main.js`.
4. Tambahkan global binding melalui spread module atau binding eksplisit bila dibutuhkan oleh inline handler.
5. Daftarkan route dengan `registerRoute()`.
6. Tambahkan item navigasi di `src/routes/navigation.js` bila halaman perlu muncul di sidebar.

Contoh:

```javascript
// src/modules/example.js
export async function renderExample(){
  // render halaman
}

// src/main.js
import * as ExampleMod from './modules/example.js';

registerRoute('example', ExampleMod.renderExample);

Object.assign(window, {
  ...ExampleMod
});
```

### Koneksi ke Tabel Baru

Gunakan helper di `src/services/db.js`:

```javascript
const data = await sbAll('nama_tabel', {
  select: '*, foreign_table(name)',
  eq: { status: 'active' },
  order: { col: 'created_at', asc: false }
});
```

### Inline Handler

HTML lama masih menggunakan pola seperti:

```html
<button onclick="openEmployeeForm()">Tambah</button>
```

Karena itu fungsi yang dipanggil langsung dari HTML harus tersedia di `window`. `src/main.js` menangani binding global ini.

### Struktur Auth

- `src/modules/auth.js`: binding fungsi auth ke `window` + listener sesi.
- `src/services/auth.js`: login, signup, logout, boot user, preload master data.

### Refactor Rule

Jangan mengembalikan semua logic ke satu file besar. Fitur baru sebaiknya ditempatkan di module/service yang sesuai dan dihubungkan melalui `main.js`, `router.js`, dan `navigation.js`.

---

## 🐛 Troubleshooting

### ❌ "Gagal membuat profil. Pastikan policy RLS sudah diperbaiki"

**Penyebab**: RLS memblokir INSERT ke tabel profiles
**Solusi**: Jalankan SQL di Langkah 5 (trigger auto-create profile)

### ❌ "Rate limit exceeded" / 429

**Penyebab**: Terlalu banyak request dalam waktu singkat
**Solusi**: 
- Tunggu 30-60 menit
- Hapus refresh loop (pastikan `safeBoot` sudah dipasang)
- Gunakan **batch upsert** bukan loop untuk operasi massal

### ❌ Sidebar footer hilang

**Penyebab**: CSS sidebar tidak fix height
**Solusi**: Pastikan `.sidebar { height:100vh; overflow:hidden }` dan `#nav-container { flex:1; overflow-y:auto }`

### ❌ Foto tidak muncul di sidebar

**Penyebab**: Akun tidak tertaut ke data karyawan
**Solusi**: Pengaturan → Pengguna & Role → Kelola → Tautkan ke Karyawan

### ❌ Login berhasil tapi blank

**Penyebab umum**:
- Module JS gagal dimuat
- Path `src/main.js` salah
- Ada import module yang tidak ditemukan
- Ada exception saat boot/auth

**Solusi**:
1. Buka Console (F12).
2. Cari error `404`, `Failed to load module`, `SyntaxError`, atau `ReferenceError`.
3. Pastikan entry HRIS menggunakan:
   ```html
   <script type="module" src="../src/main.js"></script>
   ```
4. Pastikan path relative benar bila entry point dipindahkan ke folder lain.

---

## 📝 Lisensi

MIT License — bebas digunakan untuk komersial dengan atribusi.

---

## 📞 Kontak

- Developer: Fadhil Muhammad Arief Juliansyah
- Email: fadhilarif406@gmail.com
- GitHub: [@fadhilarif](https://github.com/fadhilarif)

---

**Versi:** 1.1.0 (modular refactor)  
**Terakhir update:** September 2026
