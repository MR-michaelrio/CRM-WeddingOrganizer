# Deploy Eclipse (WebsiteEclipse + WhatsAppEclipse)

Panduan deploy ke 1 server Linux (Ubuntu 22.04 LTS) memakai **PM2** + **Nginx** +
**MySQL**. Dua aplikasi jalan di server yang sama:

| App              | Port  | Diekspos publik?            | Catatan                          |
| ---------------- | ----- | --------------------------- | -------------------------------- |
| WebsiteEclipse   | 3005  | Ya (lewat Nginx + HTTPS)    | Next.js                          |
| WhatsAppEclipse  | 3010  | **Tidak** (localhost saja)  | whatsapp-web.js + Chrome         |

Asumsi: punya VPS Ubuntu, domain (mis. `app.namamu.com`) yang sudah diarahkan ke IP
server, dan akses `sudo`. Ganti semua `app.namamu.com` dengan domainmu.

---

## 0. Persiapan server (sekali saja)

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Git, Nginx, MySQL
sudo apt install -y git nginx mysql-server

# Google Chrome (WAJIB untuk WhatsAppEclipse — render PDF & whatsapp-web.js)
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
google-chrome --version   # pastikan ter-install di /usr/bin/google-chrome

# PM2 (process manager) + serve di boot
sudo npm install -g pm2
```

---

## 1. Database MySQL

```bash
sudo mysql
```
```sql
CREATE DATABASE wo_premium CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'eclipse'@'localhost' IDENTIFIED BY 'PASSWORD_KUAT_DISINI';
GRANT ALL PRIVILEGES ON wo_premium.* TO 'eclipse'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 2. Clone kedua repo

```bash
cd /var/www        # atau folder pilihanmu
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
git clone <REMOTE_WEBSITEECLIPSE> WebsiteEclipse
git clone git@github.com:MR-michaelrio/WhatsAppEclipse.git WhatsAppEclipse
```

---

## 3. Deploy WhatsAppEclipse (deploy ini DULU)

```bash
cd /var/www/WhatsAppEclipse
npm install            # .puppeteerrc.cjs skip download Chromium, pakai Chrome sistem
cp .env.example .env
nano .env
```
Isi `.env`:
```env
PORT=3010
# Token rahasia — WAJIB di server. Buat string acak panjang:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WHATSAPP_API_TOKEN=token_acak_panjang_disini
# Chrome biasanya auto-detect; isi kalau perlu:
# WHATSAPP_CHROME_PATH=/usr/bin/google-chrome
```
Jalankan dengan PM2:
```bash
pm2 start src/server.js --name wa-service
pm2 logs wa-service        # lihat "listening on http://localhost:3010"
```

### Scan QR (sekali, sesi tersimpan di .wwebjs_auth/)
WhatsApp tidak punya UI di server. Dua cara lihat QR:

**A. Lewat halaman Settings website** (paling mudah, lakukan setelah Website jalan & domain HTTPS aktif): buka `https://app.namamu.com/settings` → kartu WhatsApp menampilkan QR → scan dari HP (**WhatsApp → Perangkat Tertaut → Tautkan Perangkat**).

**B. Lewat terminal** (ambil QR sebagai gambar):
```bash
curl -s -H "x-api-key: $WHATSAPP_API_TOKEN" http://localhost:3010/status
```
Field `qr` berisi data URL PNG; tempel ke browser untuk discan.

> Sesi disimpan di `/var/www/WhatsAppEclipse/.wwebjs_auth/`. **Jangan hapus folder
> ini** — kalau hilang harus scan QR ulang. Folder ini sudah di-`.gitignore`.

---

## 4. Deploy WebsiteEclipse

```bash
cd /var/www/WebsiteEclipse
npm install
nano .env
```
Isi `.env`:
```env
DATABASE_URL="mysql://eclipse:PASSWORD_KUAT_DISINI@localhost:3306/wo_premium"

# Google OAuth — lihat bagian "Setup Google Calendar" di bawah
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_REDIRECT_URI="https://app.namamu.com/api/auth/google/callback"

# Secret sesi login app (min 32 char). Buat dengan:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
AUTH_SECRET="..."

# WhatsApp service (sama-sama di server ini)
WHATSAPP_API_URL="http://localhost:3010"
WHATSAPP_API_TOKEN="token_acak_panjang_disini"   # SAMA dengan .env WhatsAppEclipse
```
Buat tabel database, build, lalu jalankan:
```bash
npx prisma generate
npx prisma db push        # buat skema sesuai prisma/schema.prisma
# (opsional) npm run db:seed   # data awal/admin, kalau seed disiapkan

npm run build
pm2 start npm --name website -- run start   # next start -p 3005
pm2 logs website
```

---

## 5. Nginx + HTTPS

```bash
sudo nano /etc/nginx/sites-available/eclipse
```
```nginx
server {
    listen 80;
    server_name app.namamu.com;

    client_max_body_size 30m;   # invoice/PDF bisa besar

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
> Catatan: port **3010 (WhatsApp) sengaja TIDAK dimasukkan ke Nginx** — biarkan
> internal. Website mengaksesnya via `http://localhost:3010`.

```bash
sudo ln -s /etc/nginx/sites-available/eclipse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS gratis (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.namamu.com
```

### Firewall (tutup port internal)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'      # 80 + 443
sudo ufw enable
# 3005 & 3010 tidak dibuka -> hanya bisa diakses dari dalam server
```

---

## 6. Auto-start saat reboot
```bash
pm2 save
pm2 startup        # jalankan perintah yang ditampilkannya (pakai sudo)
```

---

## 7. Setup Google Calendar (bisa pakai akun berbeda)

Aplikasi memakai 2 "akun" yang **boleh berbeda**:
1. **Akun pemilik kredensial OAuth** — akun Google Cloud Console tempat Client
   ID/Secret dibuat.
2. **Akun kalender yang terhubung** — akun yang kamu pilih saat klik *Connect* di
   Settings. Event & Google Meet masuk ke kalender **primary** akun ini.

Kamu bebas memakai akun mana pun di langkah 1, dan akun mana pun di langkah 2.

### Langkah di Google Cloud Console
1. Login ke <https://console.cloud.google.com> (akun bebas).
2. **Buat project baru**, mis. `Eclipse WO`.
3. **APIs & Services → Library** → cari **Google Calendar API** → **Enable**.
4. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - Isi App name, User support email, Developer contact email.
   - **Scopes** → Add → tambahkan dua ini:
     - `.../auth/calendar.events`
     - `.../auth/userinfo.email`
   - **Test users** → tambahkan email **akun kalender** yang akan di-connect
     (langkah no.2 di atas). Selama app berstatus *Testing*, hanya test user yang
     boleh connect.
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: `https://app.namamu.com`
   - **Authorized redirect URIs**: `https://app.namamu.com/api/auth/google/callback`
     (untuk dev lokal tambahkan juga `http://localhost:3005/api/auth/google/callback`)
   - Create → salin **Client ID** & **Client secret**.
6. Tempel ke `.env` WebsiteEclipse (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`) lalu restart:
   ```bash
   pm2 restart website
   ```
7. Buka `https://app.namamu.com/settings` → kartu **Google** → **Connect** →
   login dengan **akun kalender yang diinginkan** → setujui izin. Selesai.

### ⚠️ Penting: refresh token kedaluwarsa di mode "Testing"
App OAuth yang masih berstatus **Testing** membuat refresh token Google
**kedaluwarsa setelah 7 hari** → koneksi kalender putus tiap minggu (harus
*Connect* ulang). Agar permanen:
- **OAuth consent screen → Publish app** (status jadi *In production*).
- Untuk pemakaian internal/sendiri, ini cukup. Google mungkin menampilkan layar
  "unverified app" (klik *Advanced → Go to ...*), atau minta verifikasi bila
  dipakai banyak user eksternal. Untuk Google Workspace internal, pilih user type
  **Internal** supaya tanpa verifikasi.

---

## 8. Update / redeploy (setiap ada perubahan)

```bash
# Website
cd /var/www/WebsiteEclipse && git pull && npm install \
  && npx prisma generate && npx prisma db push \
  && npm run build && pm2 restart website

# WhatsApp service
cd /var/www/WhatsAppEclipse && git pull && npm install && pm2 restart wa-service
```

## Troubleshooting cepat
- **Website "WhatsApp service tidak dapat dihubungi"** → `pm2 status` cek
  `wa-service`; pastikan `WHATSAPP_API_TOKEN` sama di kedua `.env`.
- **WA status `auth_failure` / Chrome error** → cek `pm2 logs wa-service`; pastikan
  `google-chrome` ada di `/usr/bin/google-chrome` atau set `WHATSAPP_CHROME_PATH`.
- **Kalender putus tiap minggu** → app OAuth masih *Testing*, lihat bagian ⚠️ di atas.
- **PDF invoice kosong/aset hilang** → pastikan domain HTTPS aktif; service merender
  PDF dengan mengambil aset dari `https://app.namamu.com` (origin website).
```
