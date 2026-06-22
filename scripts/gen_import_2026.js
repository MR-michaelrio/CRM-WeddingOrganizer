/* Generate import_2026.sql from 2026.xlsx */
const XLSX = require('xlsx');
const fs = require('fs');

const TODAY = new Date(Date.UTC(2026, 5, 17)); // 2026-06-17 (import date)

const wb = XLSX.readFile('2026.xlsx');
const ws = wb.Sheets['Data Clients 2026'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// column indexes
const C = {
  no: 0, bride: 1, groom: 2, wa: 3, ig: 4, tgl: 5, waktu: 6, venue: 7,
  meeting: 8, catatan: 9, paket: 10, transport: 11, baki: 12, standing: 13,
  status: 14, dp: 15, sisa: 16, pelunasan: 17, vendor: 18, eclipse: 19,
  total: 20, pic: 21, link: 22,
};

const MONTHS = {
  januari: 0, februari: 1, febuari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, nopember: 10, desember: 11,
};

function fromSerial(n) {
  return new Date(Math.round((n - 25569) * 86400000));
}

// returns {date: Date|null, flag: string|null}
function parseDate(v) {
  if (v === '' || v == null) return { date: null, flag: null };
  if (typeof v === 'number') {
    const d = fromSerial(v);
    const y = d.getUTCFullYear();
    if (y < 2023 || y > 2028) return { date: null, flag: `serial ${v} -> ${fmt(d)} (tahun rusak, dipakai placeholder!)` };
    if (y !== 2026) return { date: d, flag: `serial ${v} -> ${fmt(d)} (bukan 2026, mungkin typo)` };
    return { date: d, flag: null };
  }
  const s = String(v).toLowerCase().trim();
  // take first "dd <month> yyyy"
  const m = s.match(/(\d{1,2})[^a-z0-9]*([a-z]+)[^0-9]*(\d{4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = MONTHS[m[2]];
    const yr = parseInt(m[3], 10);
    if (mon != null) {
      const d = new Date(Date.UTC(yr, mon, day));
      return { date: d, flag: yr !== 2026 ? `"${v}" -> ${fmt(d)} (bukan 2026?)` : null };
    }
  }
  return { date: null, flag: `tanggal tidak terbaca: "${v}"` };
}

function fmt(d) {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}
const dt = (d) => `${fmt(d)} 00:00:00`;

function normPhone(v) {
  if (v === '' || v == null) return null;
  let s = String(v).replace(/[\s\n\r\-().]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) return s;
  if (s.startsWith('62')) return '0' + s.slice(2);
  if (s.startsWith('8')) return '0' + s;
  return s;
}

function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function eventType(catatan, paket) {
  const t = (catatan + ' ' + paket).toLowerCase();
  const sangjit = /sangjit|baki|wufu|wu fu|five harmony|spring|winter|new year|fantastic/.test(t);
  const wedding = /pemberkatan|resepsi|wedding/.test(t);
  const teapai = /tea ?pai/.test(t);
  if (wedding && sangjit) return 'Wedding + Sangjit';
  if (wedding) return 'Wedding';
  if (teapai && sangjit) return 'Sangjit + Tea Pai';
  return 'Sangjit';
}

function q(v) {
  if (v == null) return 'NULL';
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

const SKIP = new Set([5, 53]);   // dibatalkan
const NEAR = new Set([27, 28]);  // tanggal sudah dekat
const NO_DP = new Set([55]);     // belum bayar DP

const out = [];
const report = [];
const flags = [];

out.push('-- Import data Clients 2026 dari 2026.xlsx');
out.push('-- Dibuat ' + fmt(TODAY) + '. ID auto-increment (existing max id = 26).');
out.push('-- Dikecualikan (batal): No 5 (Evelyn Iskandar), No 53 (Eibel).');
out.push('START TRANSACTION;');
out.push('');

let inserted = 0, payments = 0;

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const no = r[C.no];
  if (typeof no !== 'number' || !r[C.bride]) continue;
  if (SKIP.has(no)) { report.push(`No ${no}: DILEWATI (batal)`); continue; }

  const bride = String(r[C.bride]).trim();
  const groom = String(r[C.groom]).trim();
  const names = groom ? `${bride} & ${groom}` : bride;
  const phone = normPhone(r[C.wa]);
  const ig = String(r[C.ig]).trim();
  const { date: ev, flag: dflag } = parseDate(r[C.tgl]);
  if (dflag) flags.push(`No ${no} (${names}): ${dflag}`);

  let eventDate = ev;
  if (!eventDate) {
    // fallback: tidak ada tanggal valid -> pakai 2026-12-31 sbg placeholder
    eventDate = new Date(Date.UTC(2026, 11, 31));
    flags.push(`No ${no} (${names}): TANGGAL KOSONG/INVALID -> placeholder ${fmt(eventDate)} (WAJIB dikonfirmasi)`);
  }

  const venue = String(r[C.venue]).trim() || null;
  const paket = String(r[C.paket]).trim() || null;
  const catatan = String(r[C.catatan]).trim();
  const status = String(r[C.status]).trim();
  const total = num(r[C.total]);
  const dp = num(r[C.dp]);
  const sisa = num(r[C.sisa]);
  const link = String(r[C.link]).trim() || null;

  // notes block
  const lines = [];
  if (catatan) lines.push(catatan);
  const detail = [];
  const waktu = String(r[C.waktu]).trim();
  if (waktu) detail.push(`Waktu: ${waktu}`);
  if (String(r[C.baki]).trim()) detail.push(`Warna Baki: ${String(r[C.baki]).trim()}`);
  if (String(r[C.standing]).trim()) detail.push(`Standing: ${String(r[C.standing]).trim()}`);
  if (String(r[C.transport]).trim()) detail.push(`Transport: ${String(r[C.transport]).trim()}`);
  if (String(r[C.pic]).trim()) detail.push(`PIC: ${String(r[C.pic]).trim()}`);
  if (ig) detail.push(`Instagram: ${ig}`);
  const meeting = String(r[C.meeting]).trim();
  if (meeting && meeting.toUpperCase() !== 'NO') detail.push(`Meeting Rundown: ${meeting}`);
  if (num(r[C.vendor]) != null || num(r[C.eclipse]) != null)
    detail.push(`Pembagian: Vendor ${r[C.vendor] || '-'} / Eclipse ${r[C.eclipse] || '-'}`);
  if (status === 'DP') detail.push(`Pembayaran: DP ${dp ?? '-'}, Sisa ${sisa ?? '-'}, Total ${total ?? '-'}`);
  if (detail.length) lines.push('— Detail —\n' + detail.join('\n'));

  let eventStatus = 'confirmed';
  if (NO_DP.has(no)) { eventStatus = 'pending'; lines.push('⚠️ Belum bayar DP.'); }
  else if (status !== 'DP' && status !== 'Done') eventStatus = 'pending';
  if (NEAR.has(no)) lines.push('⚠️ Ditandai: tanggal acara sudah dekat.');

  const notes = lines.join('\n\n') || null;

  const workflow = eventDate < TODAY ? 'completed' : 'active';
  const progress = status === 'Done' ? 100 : (status === 'DP' ? 50 : 25);
  const etype = eventType(catatan, paket || '');

  const cols = 'names,email,phone,eventType,eventDate,venue,package,contractValue,status,eventStatus,progress,notes,galleryUrl,createdAt,updatedAt';
  const vals = [
    q(names), 'NULL', q(phone), q(etype), q(dt(eventDate)), q(venue), q(paket),
    total != null ? total : 'NULL', q(workflow), q(eventStatus), progress,
    q(notes), q(link), 'NOW()', 'NOW()',
  ].join(', ');

  out.push(`-- No ${no}: ${names}`);
  out.push(`INSERT INTO Client (${cols}) VALUES (${vals});`);

  // payment
  if (!NO_DP.has(no)) {
    if (status === 'Done' && total != null) {
      // lunas: pakai tanggal pelunasan, fallback eventDate.
      // Jika pelunasan > eventDate (kemungkinan typo tahun), pakai eventDate.
      let pl = parseDate(r[C.pelunasan]).date || eventDate;
      if (pl > eventDate) pl = eventDate;
      out.push('SET @cid := LAST_INSERT_ID();');
      out.push(`INSERT INTO Payment (clientId,type,method,amount,paymentDate,reference,notes,createdAt) VALUES (@cid,'final','transfer',${total},${q(dt(pl))},'Import 2026.xlsx','Lunas',NOW());`);
      payments++;
    } else if (status === 'DP' && dp != null) {
      // DP: tdk ada tgl DP -> proxy min(today, eventDate)
      const pd = eventDate < TODAY ? eventDate : TODAY;
      out.push('SET @cid := LAST_INSERT_ID();');
      out.push(`INSERT INTO Payment (clientId,type,method,amount,paymentDate,reference,notes,createdAt) VALUES (@cid,'dp','transfer',${dp},${q(dt(pd))},'Import 2026.xlsx','Tanggal DP estimasi (cek)',NOW());`);
      payments++;
    }
  }
  out.push('');

  inserted++;
  report.push(`No ${no}: ${names} | ${fmt(eventDate)} | ${etype} | ${status || '-'} | Total ${total ?? '-'} | ${eventStatus}`);
}

out.push('COMMIT;');
fs.writeFileSync('import_2026.sql', out.join('\n'));

console.log('=== RINGKASAN ===');
report.forEach((l) => console.log(l));
console.log(`\nClient di-insert: ${inserted}, Payment: ${payments}`);
console.log('\n=== FLAG / PERLU DICEK ===');
if (!flags.length) console.log('(tidak ada)');
flags.forEach((f) => console.log('⚠️ ' + f));
