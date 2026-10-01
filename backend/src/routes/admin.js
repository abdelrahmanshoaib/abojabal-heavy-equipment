const express = require('express');
const db = require('../db');
const { login, requireAdmin } = require('../auth');
const { str, url, link } = require('../validate');

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

// إرسال موحد لنتيجة mutate: {ok, deployed, ...out} أو خطأ واضح
async function send(res, p) {
  try {
    const r = await p;
    const { mode, ...out } = r || {};
    res.json({ ok: true, deployed: mode, ...out });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: e.message });
    const code = e.code || (/GITHUB_TOKEN|Vercel/.test(e.message) ? 'PERSIST_UNAVAILABLE' : 'SAVE_FAILED');
    res.status(code === 'PERSIST_UNAVAILABLE' ? 503 : 500).json({ error: e.message, code });
  }
}

// ---- SETTINGS ----
router.get('/settings', (req, res) => res.json(db.read().settings));
router.put('/settings', async (req, res) => {
  const b = req.body || {};
  await send(res, db.mutate((d) => {
  const keys = ['siteName', 'siteSub', 'logoIcon', 'navCta', 'siteTitle', 'metaDesc', 'heroEyebrow', 'heroTitleA', 'heroTitleHL', 'heroTitleB', 'heroDesc', 'heroCaptionSmall', 'heroCaptionBig', 'heroPrimary', 'heroSecondary', 'heroPrimaryUrl', 'heroSecondaryUrl', 'floatingSmall', 'floatingBig', 'aboutNo', 'aboutTitleA', 'aboutTitleHL', 'aboutDesc', 'aboutTag', 'aboutTagBig', 'servicesNo', 'servicesTitleA', 'servicesTitleHL', 'servicesDesc', 'productsNo', 'productsTitleA', 'productsTitleHL', 'processNo', 'processTitleA', 'processTitleHL', 'processDesc', 'contactNo', 'contactTitleA', 'contactTitleHL', 'contactDesc', 'email', 'phone', 'address', 'footerNote'];
  keys.forEach((k) => { if (b[k] !== undefined) d.settings[k] = str(b[k], 2000); });
  ['heroImage', 'aboutImage', 'logoImage', 'favicon'].forEach((k) => { if (b[k] !== undefined) d.settings[k] = url(b[k]) || ''; });
  ['heroPrimaryUrl', 'heroSecondaryUrl', 'navCtaUrl'].forEach((k) => { if (b[k] !== undefined) d.settings[k] = link(b[k]); });
    if (Array.isArray(b.ticker)) d.settings.ticker = b.ticker.map((t) => str(t, 100)).filter(Boolean).slice(0, 12);
    if (Array.isArray(b.trust)) d.settings.trust = b.trust.map((t) => ({ n: str(t.n || t.num || '', 10), t: str(t.t || t.label || t.title || '', 100) })).filter((x) => x.t).slice(0, 6);
    return { settings: d.settings };
  }));
});

// ---- generic CRUD helper (ذري: يعيد القراءة قبل كل كتابة) ----
// التعديل الجزئي آمن: الحقول الغائبة عن الطلب لا تُمس (تُحذف من الـ patch)
function stripUndef(o) {
  const r = {};
  for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k];
  return r;
}
// G: قيمة الحقل — الافتراضي يُستخدم عند الإنشاء فقط، وعند التعديل يُترك الحقل كما هو
const G = (b, k, fn, dflt, partial) => (b[k] !== undefined ? fn(b[k]) : (partial ? undefined : dflt));
function crud(key, map) {
  return {
    list: (req, res) => res.json(db.read()[key] || []),
    create: async (req, res) => {
      const body = req.body || {};
      await send(res, db.mutate((d) => {
        const item = { id: db.uid(key), ...stripUndef(map(body, false)) };
        d[key] = d[key] || [];
        d[key].push(item);
        return { item };
      }));
    },
    update: async (req, res) => {
      const body = req.body || {};
      const id = req.params.id;
      await send(res, db.mutate((d) => {
        const i = (d[key] || []).findIndex((x) => x.id === id);
        if (i < 0) throw Object.assign(new Error('غير موجود'), { code: 'NOT_FOUND' });
        d[key][i] = { ...d[key][i], ...stripUndef(map(body, true)) };
        return { item: d[key][i] };
      }));
    },
    remove: async (req, res) => {
      const id = req.params.id;
      await send(res, db.mutate((d) => {
        d[key] = (d[key] || []).filter((x) => x.id !== id);
        return {};
      }));
    }
  };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const bool = (v, dflt = true) => (v === undefined ? dflt : !!v);

const pages = crud('pages', (b, p) => ({
  title: G(b, 'title', (v) => str(v, 200), '', p),
  slug: G(b, 'slug', (v) => str(v, 100).replace(/\s+/g, '-') || 'page', 'page', p),
  content: G(b, 'content', (v) => str(v, 20000), '', p),
  visible: G(b, 'visible', (v) => bool(v, true), true, p),
  order: G(b, 'order', (v) => num(v), 0, p)
}));
const services = crud('services', (b, p) => ({
  icon: G(b, 'icon', (v) => str(v, 10), '↗', p),
  num: G(b, 'num', (v) => str(v, 10), '', p),
  title: G(b, 'title', (v) => str(v, 200), '', p),
  desc: G(b, 'desc', (v) => str(v, 2000), '', p),
  link: G(b, 'link', (v) => str(v, 200), 'اطلب التفاصيل ↗', p),
  linkUrl: G(b, 'linkUrl', (v) => link(v), '#contact', p),
  order: G(b, 'order', (v) => num(v), 0, p)
}));
const products = crud('products', (b, p) => ({
  category: G(b, 'category', (v) => str(v, 50) || 'earth', 'earth', p),
  catLabel: G(b, 'catLabel', (v) => str(v, 100), '', p),
  num: G(b, 'num', (v) => str(v, 10), '', p),
  title: G(b, 'title', (v) => str(v, 200), '', p),
  desc: G(b, 'desc', (v) => str(v, 2000), '', p),
  image: G(b, 'image', (v) => url(v), '', p),
  order: G(b, 'order', (v) => num(v), 0, p)
}));
const steps = crud('steps', (b, p) => ({
  num: G(b, 'num', (v) => str(v, 10), '', p),
  title: G(b, 'title', (v) => str(v, 200), '', p),
  desc: G(b, 'desc', (v) => str(v, 2000), '', p),
  order: G(b, 'order', (v) => num(v), 0, p)
}));
const points = crud('points', (b, p) => ({
  num: G(b, 'num', (v) => str(v, 10), '', p),
  title: G(b, 'title', (v) => str(v, 200), '', p),
  desc: G(b, 'desc', (v) => str(v, 2000), '', p),
  order: G(b, 'order', (v) => num(v), 0, p)
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
  const id = req.params.id;
  await send(res, db.mutate((d) => {
    const m = (d.messages || []).find((x) => x.id === id);
    if (m) m.read = true;
    return {};
  }));
});
router.delete('/messages/:id', async (req, res) => {
  const id = req.params.id;
  await send(res, db.mutate((d) => {
    d.messages = (d.messages || []).filter((x) => x.id !== id);
    return {};
  }));
});

module.exports = router;
