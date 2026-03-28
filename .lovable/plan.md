

## Plan: Perbaikan Halaman Slip Gaji, Kehadiran, dan Tautan

### 1. Slip Gaji (Admin) — Tambah Filter

**Masalah**: Admin tidak bisa filter slip gaji berdasarkan bulan, tahun, atau karyawan.

**Solusi**: Tambahkan filter bar di halaman admin slip gaji:
- Filter Bulan (Januari-Desember), default bulan ini
- Filter Tahun, default tahun ini  
- Filter/Pencarian Karyawan berdasarkan nama
- Filter diterapkan secara client-side pada data yang sudah di-fetch

**File**: `src/pages/Payslip.tsx`

---

### 2. Kehadiran — Perbaikan Filter dan Tabs

**Masalah**: Filter kurang bagus, tidak ada tab "Tidak Hadir", alasan pakai dropdown.

**Solusi**:
- **2 Tabs**: "Daftar Kehadiran" (semua record) dan "Tidak Hadir" (karyawan yang belum ada record hari itu)
- **Stats cards**: Sudah benar pakai `todayStr` — tetap untuk hari ini saja
- **Ganti filter periode** (minggu/bulan/tahun) dengan **filter tanggal** (date picker) dan **filter bulan** (month picker)
- **Tambah pencarian nama** karyawan
- **Alasan di Edit**: Ganti dari `<Select>` dropdown menjadi `<Input>` text field (custom ketik sendiri)
- **Icon bukti**: Ganti `<Image>` icon menjadi `<FileText>` icon untuk PDF
- **Backend**: Update `attendanceController` — field `reason` sudah string bebas di model, hanya perlu ubah frontend

**File**: `src/pages/Attendance.tsx`, backend tidak perlu diubah (reason sudah free text di model)

---

### 3. Tautan (Vault) — Tampilkan Langsung Semua Tautan

**Masalah**: Halaman /vault langsung ke employee grid, bukan list tautan.

**Solusi**:
- Saat admin buka `/vault` (tanpa employeeId), tampilkan langsung **semua tautan** yang sudah dibuat
- Tombol "Tambah Tautan" langsung di halaman ini
- Di form tambah: pilihan "Semua Karyawan" atau "Pilih Karyawan" (multi-select)
- Bisa delete/cabut akses karyawan dari tautan
- Pencarian tetap ada

**File**: `src/pages/Vault.tsx`

---

### Ringkasan Perubahan File

| File | Perubahan |
|------|-----------|
| `src/pages/Payslip.tsx` | Tambah filter bulan, tahun, pencarian karyawan di admin view |
| `src/pages/Attendance.tsx` | 2 tabs, filter tanggal, pencarian nama, alasan jadi input text, icon PDF |
| `src/pages/Vault.tsx` | Admin view langsung tampilkan semua tautan, bukan employee grid |

