const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UP_DIR = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR, { recursive: true });
} catch {
  // بيئات القراءة فقط (Vercel): الرفع مرفوض برسالة واضحة من الـ route
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 5) || '.jpg';
    cb(null, 'img-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7) + ext);
  }
});

function fileFilter(req, file, cb) {
  const ok = /^(image\/(jpeg|png|webp|gif|svg\+xml)|image\/.*)$/.test(file.mimetype);
  if (!ok) return cb(new Error('يسمح بملفات الصور فقط'));
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
module.exports = { upload, UP_DIR };
