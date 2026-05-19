# Google Meet + Google Calendar Integration Setup

Panduan setup integrasi otomatis ke Google Calendar & Google Meet untuk **WO Premium**. Setelah selesai, tombol "Create Event" di Calendar otomatis bikin event di Google Calendar kamu **plus** Google Meet link real (bukan placeholder lagi).

---

## Apa yang akan kita bangun

**Sebelum:**
- Saat klik "New Event" → event hanya tersimpan di MySQL kita.
- "Generate Meet" → bikin link placeholder `meet.google.com/xxx-xxxx-xxx` yang nggak valid.

**Sesudah:**
1. User klik "Connect Google Account" di Settings → consent screen Google muncul → izinkan akses Calendar.
2. Saat bikin event baru dengan tipe `meeting`, centang "Create Google Meet" → backend kita panggil Google Calendar API → event tercipta di Calendar **dan** Meet link otomatis ter-generate.
3. Link Meet beneran works, attendees dapat email invitation otomatis.

**Arsitektur:** OAuth 2.0 Authorization Code Flow dengan refresh token tersimpan di MySQL. Server-side semua, credentials nggak pernah masuk browser.

---

## Apa yang kamu butuhkan

- [ ] Akun Google (Gmail biasa cukup — nggak harus Workspace)
- [ ] ~20–30 menit waktu setup
- [ ] Akses ke browser yang bisa buka `console.cloud.google.com`

> **⚠ Penting:** Akun Google yang kamu pakai di sini adalah yang akan dipakai sebagai **calendar owner**. Semua event yang dibuat WO Premium akan masuk ke calendar akun ini, dan Meet link akan terikat ke akun ini. Pakai akun bisnis kalau ada (misal `wopremium@gmail.com`), bukan akun pribadi.

---

## STEP 1 — Bikin Google Cloud Project

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Login pakai akun Google yang akan dipakai.
3. Di **top bar**, klik dropdown project (di sebelah logo "Google Cloud"). Kalau pertama kali, dropdown tulisannya "Select a project".
4. Di pop-up yang muncul, klik tombol **"NEW PROJECT"** (kanan atas).
5. Isi form:
   - **Project name:** `WO Premium` (atau bebas)
   - **Organization:** biarkan default (No organization) kalau kamu pakai Gmail pribadi
   - **Location:** biarkan default
6. Klik **CREATE**.
7. Tunggu ~10 detik, ada notif "Project created" di atas.
8. Klik notifnya atau **SELECT PROJECT** untuk masuk ke project baru.

✅ Sekarang kamu di dashboard project `WO Premium`.

---

## STEP 2 — Enable Google Calendar API

1. Di sidebar kiri, klik menu hamburger (☰) → **APIs & Services** → **Library**.
2. Di search box, ketik: `Google Calendar API`
3. Klik hasil pertama yang muncul (logo calendar biru).
4. Klik tombol biru **ENABLE**.
5. Tunggu ~5 detik. Tombol berubah jadi "MANAGE" = sukses.

✅ Google Calendar API sudah aktif. Ini sekaligus mengaktifkan Google Meet karena Meet adalah fitur built-in dari Calendar.

> **Catatan:** Kita **tidak** perlu enable "Google Meet REST API" terpisah. Meet link otomatis dibuat saat kita create Calendar event dengan field `conferenceData`.

---

## STEP 3 — Konfigurasi OAuth Consent Screen

Ini layar yang muncul ke user saat mereka login Google pertama kali. Kita harus daftarkan dulu.

1. Sidebar kiri → **APIs & Services** → **OAuth consent screen**.
2. Pilih **User Type**:
   - Pilih **External** (kecuali kamu pakai Google Workspace dan mau internal-only).
   - Klik **CREATE**.
3. **App information:**
   - **App name:** `WO Premium`
   - **User support email:** email Google kamu
   - **App logo:** opsional (skip dulu)
4. **App domain:** kosongkan dulu semua. Untuk dev di localhost, nggak wajib.
5. **Developer contact information:**
   - **Email addresses:** email kamu (boleh sama dengan support email)
6. Klik **SAVE AND CONTINUE**.

### Scopes

7. Klik **ADD OR REMOVE SCOPES**.
8. Di search bar pop-up, ketik: `calendar`
9. Centang scope berikut:
   - ✅ `https://www.googleapis.com/auth/calendar.events` — *Manage your Calendar events*

   > Cukup 1 scope ini saja. **Jangan** centang `.../calendar` (akses penuh) karena tidak perlu.
10. Klik **UPDATE** di bawah pop-up, lalu **SAVE AND CONTINUE**.

### Test users (PENTING)

11. Di section **Test users**, klik **ADD USERS**.
12. Masukkan email Google kamu sendiri (dan email akun lain yang akan pakai sistem).
13. Klik **ADD** → **SAVE AND CONTINUE**.

> **⚠ Wajib step ini.** Saat app status masih **"Testing"** (default), hanya email yang terdaftar di test users yang bisa OAuth login. Kalau di-skip, kamu akan dapat error `403: access_denied` saat coba connect.

14. Review halaman summary → **BACK TO DASHBOARD**.

✅ Consent screen siap.

---

## STEP 4 — Bikin OAuth 2.0 Credentials

1. Sidebar kiri → **APIs & Services** → **Credentials**.
2. Klik **+ CREATE CREDENTIALS** (atas) → **OAuth client ID**.
3. **Application type:** pilih **Web application**.
4. **Name:** `WO Premium Web Client` (bebas — cuma label di dashboard)
5. **Authorized JavaScript origins:** klik **+ ADD URI** → masukkan:
   ```
   http://localhost:3000
   ```
   Kalau dev kamu di port 3001:
   ```
   http://localhost:3001
   ```
   Tambah keduanya kalau perlu (klik + ADD URI lagi).

6. **Authorized redirect URIs:** klik **+ ADD URI** → masukkan:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   Tambah variasi port:
   ```
   http://localhost:3001/api/auth/google/callback
   ```

   > **PENTING:** URI harus persis. Jangan ada trailing slash. `/api/auth/google/callback` — ini path yang nanti saya buat di kode.

7. Klik **CREATE**.

8. Pop-up muncul dengan **Client ID** dan **Client secret**. **Copy keduanya** — atau klik tombol "DOWNLOAD JSON" untuk simpan file.

   - **Your Client ID:** `xxxxxx-yyyyyy.apps.googleusercontent.com`
   - **Your Client Secret:** `GOCSPX-xxxxxxxxxxxxx`

   > **⚠ Client Secret cuma muncul sekali!** Kalau ke-close, kamu harus buat OAuth client baru. Bisa juga lihat lagi di Credentials list (klik nama client → bagian Client Secrets → klik download icon).

✅ Selesai dari Google Cloud Console.

---

## STEP 5 — Kasih credentials ke saya

Setelah dapat Client ID + Client Secret dari step 4 nomor 8, balas chat ke saya dengan format:

```
GOOGLE_CLIENT_ID=xxxxxx-yyyyyy.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

Atau kalau kamu mau coba sendiri set up dulu, simpan di file [.env](.env) project ini, di bawah `DATABASE_URL`:

```env
DATABASE_URL="mysql://root@localhost:3306/wo_premium"

# Google OAuth
GOOGLE_CLIENT_ID="paste-client-id-disini"
GOOGLE_CLIENT_SECRET="paste-client-secret-disini"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

> Pastikan `GOOGLE_REDIRECT_URI` sama persis dengan yang kamu daftarkan di Authorized redirect URIs di Step 4.

---

## STEP 6 — Apa yang saya akan bangun di kode (after kamu kasih credentials)

Setelah kamu kasih credentials, saya akan tambahkan di sisi kode:

### a. Database
Model `GoogleAccount` baru di Prisma untuk simpan refresh token:
```prisma
model GoogleAccount {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  accessToken  String   @db.Text
  refreshToken String   @db.Text
  expiry       DateTime
  scope        String   @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Plus tambah `googleEventId` di `CalendarEvent` untuk lacak event mana di Google Calendar.

### b. Library
```bash
npm install googleapis
```

### c. Routes baru
- **`GET /api/auth/google/start`** — redirect user ke Google consent URL.
- **`GET /api/auth/google/callback`** — terima authorization code, tukar ke access + refresh token, simpan ke DB.
- **`POST /api/auth/google/disconnect`** — hapus token (revoke akses).

### d. Update endpoint event
- **`POST /api/events`** — kalau body include `createGoogleMeet: true`, panggil Google Calendar API:
  ```ts
  calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary: title,
      start: { dateTime: startAt },
      end: { dateTime: endAt },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
    conferenceDataVersion: 1,
  })
  ```
  Response include `hangoutLink` (Meet URL) yang langsung kita simpan ke `event.meetLink`.

### e. UI
- **Settings page** — tambah card "Google Account" dengan tombol "Connect Google Account" / "Disconnect". Tampilkan email akun yang terhubung.
- **NewEventDialog** — kalau Google connected, ganti tombol "Generate" jadi checkbox "**Create Google Meet automatically**". Saat dicentang, backend bikin Meet beneran.

---

## STEP 7 — Test flow (setelah implementasi)

1. Buka [http://localhost:3000/settings](http://localhost:3000/settings) → klik **"Connect Google Account"**.
2. Browser redirect ke `accounts.google.com` → login → ada layar consent: "WO Premium wants to access your Google Calendar".
3. Klik **Allow**.
4. Browser redirect balik ke Settings → muncul badge hijau: `✓ Connected as your.email@gmail.com`.
5. Buka [/calendar](/calendar) → klik **"New Event"** → pilih tipe **Meeting** → checkbox **"Create Google Meet automatically"** muncul → centang.
6. Submit → buka [calendar.google.com](https://calendar.google.com) di tab baru → event muncul di sana **dengan Meet link**. 🎉

---

## Troubleshooting

### `403: access_denied` saat login Google
**Penyebab:** Email kamu belum di-list di "Test users" (Step 3 nomor 11–13).
**Fix:** Balik ke OAuth consent screen → Test users → tambahkan email.

### `400: redirect_uri_mismatch`
**Penyebab:** URL callback di kode tidak sama dengan yang didaftarkan di Step 4.
**Fix:**
- Cek port dev server (kalau 3001 bukan 3000, tambahkan ke Authorized redirect URIs).
- Cek nggak ada trailing slash.
- Cek `GOOGLE_REDIRECT_URI` di `.env` sama persis dengan yang di Google Cloud.

### `invalid_client` / `unauthorized_client`
**Penyebab:** Client Secret salah atau di-rotate.
**Fix:** Buka [Credentials](https://console.cloud.google.com/apis/credentials) → klik nama OAuth client → di bagian Client Secrets, klik download icon untuk lihat secret lagi. Update di `.env`.

### Refresh token tidak muncul
**Penyebab:** Google cuma kasih refresh token saat **pertama kali** user grant access. Kalau user sudah pernah grant sebelumnya, hanya access token yang dikasih (refresh token cuma keluar saat consent baru).
**Fix:** Di kode, force consent dengan parameter `prompt: 'consent'` saat redirect ke Google. Saya akan handle ini di implementasi.

### Mau pindah dari Testing ke Production (Publishing)
Saat masih **Testing**, hanya 100 test users yang bisa pakai dan tokens expire setelah 7 hari.
Untuk production:
1. OAuth consent screen → klik **PUBLISH APP** → **CONFIRM**.
2. Status berubah jadi **"In production"**.
3. Untuk scope sensitif (`calendar.events` termasuk sensitif), kamu mungkin perlu **Google verification** kalau user > 100. Untuk WO internal, biasanya nggak perlu — Google cuma show warning "unverified app", user bisa klik "Advanced → Go to WO Premium (unsafe)".

> **Untuk pemakaian internal WO (kamu + tim), tetap di mode Testing saja sudah cukup.** Tambahkan email tim kamu ke Test users. 7 hari token expiry juga bisa di-refresh otomatis selama akun masih authorized.

---

## Security notes

- **Client Secret jangan commit ke git.** [.env](.env) sudah di-gitignore. Verify dengan `git status` — `.env` jangan muncul.
- **Scope minimal.** Kita cuma minta `calendar.events` (bisa lihat & create event), bukan `calendar` (full access ke calendar settings). Prinsip least privilege.
- **Refresh token** disimpan encrypted-at-rest di MySQL. Kalau MySQL compromised, attacker bisa pakai token. Untuk production, encrypt token kolom di DB (saya bisa tambahkan AES-256 encryption pakai env var key).
- **Revoke kapan saja:** user bisa cabut akses di [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

---

## Checklist sebelum balas ke saya

- [ ] Project `WO Premium` ke-create di Google Cloud Console
- [ ] Google Calendar API enabled (Library → search → ENABLE)
- [ ] OAuth consent screen configured (External, scope `calendar.events`, email kamu di Test users)
- [ ] OAuth Client ID created (Web application, redirect URI `http://localhost:3000/api/auth/google/callback`)
- [ ] Client ID + Client Secret di-copy ke text file/note

Balas chat dengan dua string itu, dan saya langsung jalankan **Step 6** (implementasi). Estimasi 20–30 menit selesai dan kamu bisa langsung pakai Meet link beneran. ✨
