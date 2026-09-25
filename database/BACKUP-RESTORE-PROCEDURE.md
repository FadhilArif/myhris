# MyHRIS Security Phase 2 — Backup & Restore Procedure

## Tujuan
Backup dan restore adalah bagian dari keamanan produksi. Browser tidak boleh membuat atau mengunduh database backup menggunakan service-role key.

## 1. Backup Strategy

### Production
- Aktifkan backup database pada platform/Supabase yang digunakan.
- Pertahankan backup otomatis sesuai retensi paket yang tersedia.
- Untuk data yang sangat penting, simpan salinan backup di lokasi terpisah dari project utama.
- Jangan menyimpan secret key di repository, frontend, atau file yang dikirim ke browser.
- Dokumentasikan tanggal backup terakhir dan siapa yang bertanggung jawab memverifikasinya.

### Sebelum migration besar
Sebelum menjalankan SQL yang mengubah schema/RLS/function:
1. Pastikan backup terbaru tersedia.
2. Catat commit/branch aplikasi yang sedang production.
3. Catat migration SQL yang akan dijalankan.
4. Jalankan migration terlebih dahulu di environment pengujian bila tersedia.

## 2. Restore Procedure

Restore tidak dilakukan dari halaman MyHRIS.

Urutan umum:
1. Hentikan sementara perubahan data jika restore production diperlukan.
2. Identifikasi waktu backup yang akan digunakan.
3. Restore database melalui platform/database administration.
4. Jalankan migration yang diperlukan sampai sesuai dengan versi aplikasi.
5. Verifikasi RLS dan function security.
6. Uji login untuk Admin, HR, Manager, dan Employee.
7. Uji modul kritis: employee, attendance, leave, payroll, claims.
8. Periksa audit log dan login history.
9. Setelah valid, buka kembali akses pengguna.

## 3. Restore Drill

Restore harus diuji secara berkala pada environment non-production.

Minimal cek:
- jumlah tabel dan struktur schema
- data karyawan
- profile/role
- RLS
- login
- payroll/payslip
- audit log
- login history

Tujuan restore drill adalah memastikan backup benar-benar dapat dipakai, bukan hanya memastikan file backup ada.

## 4. Incident Record

Setiap restore production sebaiknya dicatat:
- waktu kejadian
- alasan restore
- backup yang digunakan
- operator
- migration yang dijalankan setelah restore
- hasil pengujian
- waktu layanan kembali normal

## 5. Recovery Target

Tentukan dua angka untuk deployment production:
- **RPO (Recovery Point Objective):** berapa banyak data yang masih dapat hilang jika terjadi insiden.
- **RTO (Recovery Time Objective):** berapa lama layanan boleh tidak tersedia saat pemulihan.

Nilainya harus ditentukan berdasarkan kebutuhan perusahaan/klien, bukan dipaksakan dari aplikasi.

## Catatan
MyHRIS frontend tidak boleh memiliki akses database administratif. Service-role key hanya untuk lingkungan server/administrasi yang benar-benar membutuhkan hak tersebut.
