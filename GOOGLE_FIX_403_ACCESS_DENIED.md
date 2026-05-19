# Fix Error 403: access_denied (Google OAuth)

## Apa error ini artinya

```
Access blocked: Wedding Organizer System has not completed the Google verification process
eclipse.sangjit@gmail.com
The app is currently being tested, and can only be accessed by developer-approved testers.
```

**Translate:** App `Wedding Organizer System` di Google Cloud kamu masih status **"Testing"**. Status ini cuma allow login dari email yang **explicitly didaftarkan sebagai "Test user"**. Email `eclipse.sangjit@gmail.com` belum ada di list.

**Bukan bug app kita** — ini security feature Google. Wajib daftar test user dulu.

---

## ✅ Fix (~30 detik)

### Step 1 — Buka OAuth consent screen
1. Buka [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)
2. **Pastikan project di top bar adalah `wedding-organizer-system`**. Kalau bukan, klik dropdown project di atas dan pilih `wedding-organizer-system`.

### Step 2 — Scroll ke "Test users"
1. Setelah masuk OAuth consent screen, scroll ke bawah.
2. Ada section **"Test users"** dengan tombol **+ ADD USERS**.

### Step 3 — Tambahkan email
1. Klik **+ ADD USERS**.
2. Di pop-up, masukkan:
   ```
   eclipse.sangjit@gmail.com
   ```
3. Tekan **Enter** untuk konfirmasi chip-nya.
4. (Opsional) Tambahkan email tim lain yang akan pakai sistem juga.
5. Klik **SAVE**.

### Step 4 — Test lagi
1. Balik ke browser: [http://localhost:3000/settings](http://localhost:3000/settings)
2. Klik **"Connect Google Account"** lagi.
3. Login dengan `eclipse.sangjit@gmail.com`.
4. Sekarang yang muncul: warning **"Google hasn't verified this app"** (BUKAN error 403).
5. Klik **"Continue"** atau **"Advanced"** → **"Go to Wedding Organizer System (unsafe)"**.

   > ⚠ "Unsafe" cuma karena app belum di-verify Google secara publik. Untuk internal use ini OK — kamu yang develop, kamu yang authorize.

6. Layar consent muncul: "WO Premium wants to access Google Calendar".
7. Klik **Allow**.
8. Browser balik ke `/settings` → muncul **banner hijau ✓ Google account eclipse.sangjit@gmail.com connected**.

---

## Visualisasi alur

```
┌────────────────────────┐
│ Klik Connect Google    │
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│ Login Google           │
│ (eclipse.sangjit@...)  │
└──────────┬─────────────┘
           ▼
        SEBELUM fix:                SESUDAH fix:
┌────────────────────────┐    ┌────────────────────────┐
│ ❌ Error 403           │    │ ⚠ "Google hasn't       │
│ access_denied          │    │   verified this app"   │
│ (email not in test     │    │ → klik Advanced →      │
│  users)                │    │   Go to app (unsafe)   │
└────────────────────────┘    └──────────┬─────────────┘
                                         ▼
                              ┌────────────────────────┐
                              │ Consent screen         │
                              │ "Allow access?"        │
                              │ → klik Allow           │
                              └──────────┬─────────────┘
                                         ▼
                              ┌────────────────────────┐
                              │ ✅ Redirect ke         │
                              │ /settings?google_      │
                              │ connected=email        │
                              └────────────────────────┘
```

---

## Kalau masih error setelah Step 4

### Error 1: "Google hasn't verified this app" tapi nggak ada tombol Advanced
- Klik area kosong di halaman → klik **back** browser → coba klik **Connect Google Account** lagi.
- Atau gunakan Chrome Incognito window untuk fresh state.

### Error 2: `redirect_uri_mismatch`
Buka [Credentials](https://console.cloud.google.com/apis/credentials) → klik nama OAuth Client kamu → di **Authorized redirect URIs**, pastikan ada **persis**:
```
http://localhost:3000/api/auth/google/callback
```
Tidak ada trailing slash. Tidak ada `https`. Port harus `3000`. Klik **SAVE** di bawah kalau edit.

### Error 3: Login pakai email lain (bukan eclipse.sangjit@gmail.com)
Logout dari semua akun Google dulu:
1. Buka [accounts.google.com](https://accounts.google.com) di tab lain.
2. Klik avatar kanan atas → **Sign out of all accounts**.
3. Kembali ke `/settings` → klik Connect → login pakai `eclipse.sangjit@gmail.com`.

### Error 4: Masih dapat `access_denied` setelah daftar test user
- Tunggu 1–2 menit. Kadang Google butuh waktu propagate.
- Pastikan email yang didaftarkan **sama persis** dengan yang dipakai login (huruf, tanda titik, dll).
- Cek di Test users list — email-nya kah yang muncul di chip?

---

## (Opsional) Skip warning "Google hasn't verified this app"

Kalau warning itu mengganggu (muncul setiap login), ada 2 opsi:

### Opsi A — Publish app (recommended untuk internal use)
1. Buka [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent).
2. Status awal: **Testing**. Klik tombol **PUBLISH APP** di atas → **CONFIRM**.
3. Status berubah jadi **"In production"**.
4. **Result:** Siapapun yang login (bukan cuma test users) bisa pakai app. Tapi warning "unverified app" tetap muncul karena scope `calendar.events` adalah **sensitive scope**.

> Untuk hilangkan warning sama sekali butuh Google verification: kirim form, upload privacy policy, video demo, dll. Proses 4–6 minggu. **Tidak perlu untuk internal WO**.

### Opsi B — Tetap di Testing mode (token expire setelah 7 hari)
- Lebih aman, tapi setiap 7 hari refresh token expire → harus reconnect.
- Cocok untuk dev / staging.
- App kita sekarang otomatis handle refresh, jadi selama refresh token belum expire user nggak perlu re-login.

**Rekomendasi:** untuk WO internal (kamu + tim kecil), **biarkan di Testing mode**. Tambah semua email tim ke Test users. Cukup.

---

## Tambah lebih banyak test users sekaligus

Kalau tim kamu banyak (misal: Sarah, Linda, David admin), daftarkan semua email mereka di Test users:

1. Buka [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent).
2. **Test users** section → **+ ADD USERS**.
3. Masukkan satu per satu:
   ```
   sarah@wopremium.com
   linda@wopremium.com
   david@wopremium.com
   eclipse.sangjit@gmail.com
   ```
4. **SAVE**.

Max 100 test users di mode Testing. Lebih dari cukup untuk WO internal.

---

## Checklist setelah fix

- [ ] `eclipse.sangjit@gmail.com` masuk di Test users list (cek chip-nya muncul)
- [ ] Klik **SAVE** di Test users section
- [ ] Refresh `/settings` di browser
- [ ] Klik **Connect Google Account** lagi
- [ ] Lewati warning "Google hasn't verified" → Advanced → Go to app
- [ ] Allow consent
- [ ] Banner hijau muncul di Settings dengan email yang connected

Setelah connected, test bikin Meeting di Calendar dengan checkbox **"Create Google Meet automatically"** centang — Meet link beneran akan ter-generate dari Google API. 🎉
