const express = require('express');
const db = require('../db');
const { str, email } = require('../validate');

const router = express.Router();

// GET /api/site — المحتوى العام الكامل للموقع
router.get('/site', (req, res) => {
  const d = db.read();
  const visible = (arr) => (arr || []).filter((x) => x.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const byOrder = (arr) => [...(arr || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({
    settings: d.settings,
    pages: visible(d.pages),
    pagesAll: byOrder(d.pages || []),
    services: byOrder(d.services),
    products: byOrder(d.products),
    steps: byOrder(d.steps),
    points: byOrder(d.points)
  });
});

// POST /api/contact — استقبال رسائل الزوار (عام)
router.post('/contact', (req, res) => {
  const { name, email: em, service, message } = req.body || {};
  const n = str(name, 120);
  const e = email(em);
  const m = str(message, 3000);
  const s = str(service, 120);
  if (!n || !e || !m) return res.status(400).json({ error: 'الاسم والبريد والرسالة مطلوبة' });
  const d = db.read();
  d.messages = d.messages || [];
  d.messages.unshift({ id: db.uid('msg'), name: n, email: e, service: s, message: m, date: new Date().toISOString(), read: false });
  db.write(d);
  res.json({ ok: true, message: 'تم استلام طلبك بنجاح وسنتواصل معك قريباً.' });
});

module.exports = router;
