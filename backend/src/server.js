require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { requireAdmin } = require('./auth');
const { upload } = require('./upload');

const app = express();
const PORT = process.env.PORT || 3001;

// ضروري خلف البروكسي (Vercel/Nginx) حتى يعمل الـ rate-limit بعنوان IP الصحيح
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// حماية من السبام على الفورم وتسجيل الدخول
app.use('/api/contact', rateLimit({ windowMs: 60 * 1000, max: 10 }));
app.use('/api/admin/login', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// رفع الصور (أدمن فقط) → يرجع رابط /uploads/xxx
// محلياً: مجلد backend/uploads — على Vercel: commit في مجلد uploads/ بالريبو (يُنشر مع الموقع)
app.post('/api/admin/upload', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'اختر صورة أولاً' });
    if (!process.env.VERCEL) {
      return res.json({ ok: true, url: '/uploads/' + req.file.filename, deployed: 'file' });
    }
    if (!process.env.GITHUB_TOKEN) {
      return res.status(503).json({ error: 'الرفع على Vercel يحتاج GITHUB_TOKEN — أو استخدم رابط صورة خارجي', code: 'PERSIST_UNAVAILABLE' });
    }
    const { putFile } = require('./githubStore');
    const buf = fs.readFileSync(req.file.path);
    const repoPath = 'uploads/' + req.file.filename;
    await putFile(repoPath, buf.toString('base64'), `رفع صورة عبر اللوحة — ${req.file.filename}`, true);
    try { fs.unlinkSync(req.file.path); } catch {}
    res.json({ ok: true, url: '/' + repoPath, deployed: 'github' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ملفات الصور المرفوعة
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// تقديم الفرونت مباشرة من نفس السيرفر (ربط كامل بسيرفر واحد)
// frontend root = v4/ (index.html, admin.html, styles.css, script.js ...)
const FRONT_DIR = path.join(__dirname, '..', '..');
app.use(express.static(FRONT_DIR, { extensions: ['html'] }));

app.get('/health', (req, res) => res.json({ ok: true, service: 'abojabal-backend', time: new Date().toISOString() }));

// معالج أخطاء موحد
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || 'خطأ غير متوقع' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log('AboJabal backend on http://localhost:' + PORT));
}
module.exports = app;
