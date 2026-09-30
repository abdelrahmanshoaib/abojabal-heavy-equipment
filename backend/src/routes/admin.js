const express = require('express');
const db = require('../db');
const { login, requireAdmin } = require('../auth');
const { str, url } = require('../validate');

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const token = await login(str(username, 100), String(password || ''));
    if (!token) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    res.json({ ok: true, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.use(requireAdmin);

// حفظ موحد: يرجع deployed=file|github أو خطأ واضح
async function persist(res, data, okPayload) {
  try {
    const r = await db.writeAsync(data);
    res.json({ ...okPayload, deployed: r.mode });
  } catch (e) {
    const code = e.code || (/GITHUB_TOKEN|Vercel/.test(e.message) ? 'PERSIST_UNAVAILABLE' : 'SAVE_FAILED');
    res.status(code === 'PERSIST_UNAVAILABLE' ? 503 : 500).json({ error: e.message, code });
  }
}

// ---- SETTINGS ----
router.get('/settings', (req, res) => res.json(db.read().settings));
router.put('/settings', async (req, res) => {
  const d = db.read();
  const b = req.body || {};
  const keys = ['siteName', 'siteSub', 'logoIcon', 'siteTitle', 'metaDesc', 'heroEyebrow', 'heroTitleA', 'heroTitleHL', 'heroTitleB', 'heroDesc', 'heroCaptionSmall', 'heroCaptionBig', 'heroPrimary', 'heroSecondary', 'floatingSmall', 'floatingBig', 'aboutNo', 'aboutTitleA', 'aboutTitleHL', 'aboutDesc', 'aboutTag', 'aboutTagBig', 'servicesNo', 'servicesTitleA', 'servicesTitleHL', 'servicesDesc', 'productsNo', 'productsTitleA', 'productsTitleHL', 'processNo', 'processTitleA', 'processTitleHL', 'processDesc', 'contactNo', 'contactTitleA', 'contactTitleHL', 'contactDesc', 'email', 'phone', 'address', 'footerNote'];
  keys.forEach((k) => { if (b[k] !== undefined) d.settings[k] = str(b[k], 2000); });
  ['heroImage', 'aboutImage'].forEach((k) => { if (b[k] !== undefined) d.settings[k] = url(b[k]) || d.settings[k]; });
  if (Array.isArray(b.ticker)) d.settings.ticker = b.ticker.map((t) => str(t, 100)).filter(Boolean).slice(0, 12);
  if (Array.isArray(b.trust)) d.settings.trust = b.trust.map((t) => ({ n: str(t.n || t.num || '', 10), t: str(t.t || t.label || t.title || '', 100) })).filter((x) => x.t).slice(0, 6);
  await persist(res, d, { ok: true, settings: d.settings });
});

// ---- generic CRUD helper ----
function crud(key, map) {
  return {
    list: (req, res) => res.json(db.read()[key] || []),
    create: async (req, res) => {
      const d = db.read();
      const item = { id: db.uid(key), ...map(req.body || {}) };
      d[key] = d[key] || [];
      d[key].push(item);
      await persist(res, d, { ok: true, item });
    },
    update: async (req, res) => {
      const d = db.read();
      const i = (d[key] || []).findIndex((x) => x.id === req.params.id);
      if (i < 0) return res.status(404).json({ error: 'غير موجود' });
      d[key][i] = { ...d[key][i], ...map(req.body || {}) };
      await persist(res, d, { ok: true, item: d[key][i] });
    },
    remove: async (req, res) => {
      const d = db.read();
      d[key] = (d[key] || []).filter((x) => x.id !== req.params.id);
      await persist(res, d, { ok: true });
    }
  };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const bool = (v, dflt = true) => (v === undefined ? dflt : !!v);

const pages = crud('pages', (b) => ({
  title: str(b.title, 200), slug: str(b.slug, 100).replace(/\s+/g, '-') || 'page',
  content: str(b.content, 20000), visible: bool(b.visible, true), order: num(b.order)
}));
const services = crud('services', (b) => ({
  icon: str(b.icon, 10), num: str(b.num, 10), title: str(b.title, 200),
  desc: str(b.desc, 2000), link: str(b.link, 200), order: num(b.order)
}));
const products = crud('products', (b) => ({
  category: str(b.category, 50) || 'earth', catLabel: str(b.catLabel, 100),
  num: str(b.num, 10), title: str(b.title, 200), desc: str(b.desc, 2000),
  image: url(b.image), order: num(b.order)
}));
const steps = crud('steps', (b) => ({
  num: str(b.num, 10), title: str(b.title, 200), desc: str(b.desc, 2000), order: num(b.order)
}));
const points = crud('points', (b) => ({
  num: str(b.num, 10), title: str(b.title, 200), desc: str(b.desc, 2000), order: num(b.order)
}));

router.get('/pages', pages.list); router.post('/pages', pages.create);
router.put('/pages/:id', pages.update); router.delete('/pages/:id', pages.remove);

router.get('/services', services.list); router.post('/services', services.create);
router.put('/services/:id', services.update); router.delete('/services/:id', services.remove);

router.get('/products', products.list); router.post('/products', products.create);
router.put('/products/:id', products.update); router.delete('/products/:id', products.remove);

router.get('/steps', steps.list); router.post('/steps', steps.create);
router.put('/steps/:id', steps.update); router.delete('/steps/:id', steps.remove);

router.get('/points', points.list); router.post('/points', points.create);
router.put('/points/:id', points.update); router.delete('/points/:id', points.remove);

// ---- MESSAGES inbox (محلياً فقط — على Vercel تُرفض حمايةً لخصوصية الزوار) ----
router.get('/messages', (req, res) => res.json(db.read().messages || []));
router.put('/messages/:id/read', async (req, res) => {
  const d = db.read();
  const m = (d.messages || []).find((x) => x.id === req.params.id);
  if (m) m.read = true;
  await persist(res, d, { ok: true });
});
router.delete('/messages/:id', async (req, res) => {
  const d = db.read();
  d.messages = (d.messages || []).filter((x) => x.id !== req.params.id);
  await persist(res, d, { ok: true });
});

module.exports = router;
