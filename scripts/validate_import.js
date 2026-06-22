/* Dry-run import_2026.sql inside a transaction, then ROLLBACK. */
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const raw = fs.readFileSync('import_2026.sql', 'utf8');
const lines = raw.split('\n');
const stmts = [];
let buf = [];
for (const line of lines) {
  const t = line.trim();
  if (!buf.length && (t === '' || t.startsWith('--') || t === 'START TRANSACTION;' || t === 'COMMIT;')) continue;
  buf.push(line);
  const r = line.replace(/\s+$/, '');
  const isSet = buf[0].trim().startsWith('SET');
  if (r.endsWith(');') || (isSet && r.endsWith(';'))) {
    stmts.push(buf.join('\n'));
    buf = [];
  }
}
console.log('Statements parsed:', stmts.length);

const p = new PrismaClient();
(async () => {
  try {
    await p.$transaction(async (tx) => {
      for (const s of stmts) await tx.$executeRawUnsafe(s);
      const c = await tx.$queryRawUnsafe('SELECT COUNT(*) AS n FROM Client');
      const pay = await tx.$queryRawUnsafe('SELECT COUNT(*) AS n FROM Payment');
      const sum = await tx.$queryRawUnsafe("SELECT type, COUNT(*) AS n, SUM(amount) AS total FROM Payment GROUP BY type");
      console.log('Client total (incl existing):', Number(c[0].n));
      console.log('Payment total:', Number(pay[0].n));
      console.log('Payment by type:', sum.map(x => `${x.type}: ${Number(x.n)} = ${Number(x.total)}`).join(' | '));
      throw new Error('__ROLLBACK__');
    }, { timeout: 60000 });
  } catch (e) {
    if (e.message === '__ROLLBACK__') console.log('\n✅ Semua statement valid. Transaksi di-ROLLBACK (DB tidak berubah).');
    else { console.error('❌ ERROR:', e.message); process.exitCode = 1; }
  } finally {
    await p.$disconnect();
  }
})();
