const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = process.env.JWT_SECRET || 'abojabal-super-secret-change-me';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
// كلمة المرور الافتراضية admin123 — غيّرها من .env
const ADMIN_PASS_PLAIN = process.env.ADMIN_PASS || 'admin123';

// نولّد هاش مرة واحدة عند الإقلاع (bcrypt salt عشوائي)
let adminHash = null;
async function getHash() {
  if (!adminHash) adminHash = await bcrypt.hash(ADMIN_PASS_PLAIN, 10);
  return adminHash;
}

async function login(user, pass) {
  if (user !== ADMIN_USER) return null;
  const h = await getHash();
  const ok = await bcrypt.compare(String(pass || ''), h);
  if (!ok) return null;
  return jwt.sign({ user, role: 'admin' }, SECRET, { expiresIn: '12h' });
}

function requireAdmin(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'غير مصرح — سجل الدخول أولاً' });
  try {
    const d = jwt.verify(token, SECRET);
    if (d.role !== 'admin') throw new Error('role');
    req.admin = d;
    next();
  } catch {
    return res.status(401).json({ error: 'جلسة منتهية — سجل الدخول مجدداً' });
  }
}

module.exports = { login, requireAdmin };
