/**
 * مراقب تلقائي: أي تعديل في الملفات → commit + push على GitHub
 * التشغيل: npm run autopush
 * للإيقاف: Ctrl+C
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IGNORE = ['.git', 'node_modules', 'backend/data', 'backend/uploads', 'backend/node_modules'];
let timer = null;
let pushing = false;

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: ROOT, timeout: 60000 }, (err, stdout, stderr) => {
      if (err) console.error('⚠️', (stderr || err.message).trim().split('\n').pop());
      else if (stdout.trim()) console.log(stdout.trim().split('\n').pop());
      resolve(!err);
    });
  });
}

async function pushNow(reason) {
  if (pushing) return;
  pushing = true;
  console.log(`\n📦 تغيير (${reason}) — جارٍ الرفع...`);
  const status = await new Promise((res) =>
    exec('git status --porcelain', { cwd: ROOT }, (e, out) => res(out || ''))
  );
  if (!status.trim()) { console.log('✅ لا جديد للرفع'); pushing = false; return; }
  await run('git add -A');
  const msg = `تحديث تلقائي — ${new Date().toLocaleString('ar-EG')} (${reason})`;
  await run(`git commit -m "${msg}"`);
  const ok = await run('git push origin main');
  console.log(ok ? '🚀 اترفع على GitHub ✅' : '❌ فشل الرفع — تحقق من النت');
  pushing = false;
}

function watch(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.watch(dir, { recursive: true }, (ev, file) => {
      const rel = path.relative(ROOT, path.join(dir, file || ''));
      if (IGNORE.some((ig) => rel.startsWith(ig))) return;
      if (!/\.(html|css|js|json|md|yml|yaml|env\.example)$/.test(rel)) return;
      clearTimeout(timer);
      timer = setTimeout(() => pushNow(rel), 3000); // انتظار 3 ثواني تجميعاً للتعديلات
    });
  } catch {}
}

console.log('👀 المراقبة التلقائية شغالة على:', ROOT);
console.log('أي حفظ في html/css/js → commit + push تلقائي بعد 3 ثواني');
watch(ROOT);
process.on('SIGINT', () => { console.log('\n⏹ توقفت المراقبة'); process.exit(0); });
