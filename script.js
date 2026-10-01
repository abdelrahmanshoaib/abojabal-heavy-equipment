/* أبو جبل — ربط كامل فرونت ↔ باك-إند (مع fallback ثابت) */
function resolveBases() {
  const saved = (window.ABOJABAL_API || localStorage.getItem('abojabal_api') || 'http://localhost:3001').replace(/\/$/, '');
  // جرّب نفس الأصل أولاً (عند تقديم الفرونت من الباك نفسه) ثم الرابط المحفوظ
  const bases = [];
  if (window.location.origin && window.location.origin.startsWith('http')) bases.push('');
  if (saved && !bases.includes(saved)) bases.push(saved);
  if (!bases.includes('http://localhost:3001')) bases.push('http://localhost:3001');
  return bases;
}
let API_BASE = '';
const IMG = (u) => (!u ? '' : /^https?:/.test(u) ? u : (API_BASE || '') + u);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- تفاعلات أساسية ----------
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#mainNav') || document.querySelector('.nav');
menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); menu.textContent = open ? '✕' : '☰'; });
nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); if (menu) menu.textContent = '☰'; }));
const observer = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
function bindFilters() {
  const filters = document.querySelectorAll('#filters .filter');
  const products = document.querySelectorAll('#productsGrid .product');
  filters.forEach((btn) => btn.addEventListener('click', () => {
    filters.forEach((b) => b.classList.remove('active')); btn.classList.add('active');
    const v = btn.dataset.filter;
    products.forEach((p) => { const show = v === 'all' || p.dataset.category === v; p.style.display = show ? 'block' : 'none'; if (show) { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = 'productIn .45s ease both'; } });
  }));
}
const glow = document.querySelector('.cursor-glow');
window.addEventListener('pointermove', (e) => { if (glow) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; } });
const tilt = document.querySelector('.tilt');
if (tilt && window.matchMedia('(pointer:fine)').matches) {
  tilt.addEventListener('pointermove', (e) => { const r = tilt.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5; tilt.style.transform = `rotate(${x * 4 + 2}deg) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`; });
  tilt.addEventListener('pointerleave', () => (tilt.style.transform = 'rotate(2deg)'));
}
document.getElementById('year').textContent = new Date().getFullYear();
function setStatus(online) {
  const el = document.getElementById('apiStatus');
  if (!el) return;
  el.textContent = online ? '● متصل بالباك-إند — المحتوى محدث مباشرة' : '● وضع ثابت — شغّل الباك-إند للربط المباشر';
  el.style.color = online ? 'var(--lime)' : '';
}

// ---------- الربط الكامل ----------
const KNOWN = { home: '#home', about: '#about', services: '#services', products: '#products', process: '#process', contact: '#contact' };

async function fetchSite() {
  for (const base of resolveBases()) {
    try {
      const r = await fetch(base + '/api/site');
      if (!r.ok) continue;
      const d = await r.json();
      API_BASE = base;
      try { localStorage.setItem('abojabal_api', base || window.location.origin); } catch {}
      return d;
    } catch {}
  }
  return null;
}

function buildNav(pages) {
  if (!nav || !Array.isArray(pages) || !pages.length) return;
  const sorted = [...pages].sort((a, b) => (a.order || 0) - (b.order || 0));
  const isContact = (p) => (p.slug === 'contact' || p.id === 'contact');
  const normal = sorted.filter((p) => !isContact(p));
  const contact = sorted.find(isContact);
  nav.innerHTML =
    normal.map((p) => `<a href="#${esc(p.slug || p.id)}">${esc(p.title)}</a>`).join('') +
    (contact ? `<a class="nav-button" href="#contact">${esc(contact.title)} <span>↗</span></a>` : '');
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); if (menu) menu.textContent = '☰'; }));
}

function buildFilters(products) {
  const box = document.getElementById('filters');
  if (!box) return;
  const seen = new Map();
  (products || []).forEach((p) => { if (p.category && !seen.has(p.category)) seen.set(p.category, p.catLabel || p.category); });
  box.innerHTML = `<button class="filter active" data-filter="all">الكل</button>` +
    [...seen.entries()].map(([k, v]) => `<button class="filter" data-filter="${esc(k)}">${esc(v)}</button>`).join('');
}

function buildCustomPages(pages) {
  const box = document.getElementById('customPages');
  if (!box) return;
  const custom = (pages || []).filter((p) => !KNOWN[p.slug] && !KNOWN[p.id] && p.content);
  box.innerHTML = custom.map((p) => `<section id="${esc(p.slug || p.id)}" class="section wrap"><div class="section-top reveal visible"><div><span class="section-no">${esc(p.title)}</span><h2>${esc(p.title)}</h2></div></div><div class="card" style="padding:24px;border-radius:20px"><p style="white-space:pre-wrap;margin:0">${esc(p.content)}</p></div></section>`).join('');
}

async function loadSite() {
  const d = await fetchSite();
  if (!d) { setStatus(false); document.dispatchEvent(new CustomEvent('site-loaded', { detail: null })); return; }
  setStatus(true);
  window.__SITE__ = d;
  const s = d.settings || {};

  // SEO + لوجو (نص أو صورة) + فوتر + favicon
  if (s.siteTitle) document.title = s.siteTitle;
  const md = document.getElementById('metaDesc');
  if (md && s.metaDesc) md.setAttribute('content', s.metaDesc);
  if (s.favicon) {
    let l = document.querySelector('link[rel="icon"]');
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.href = IMG(s.favicon);
  }
  document.querySelectorAll('.logo b').forEach((el) => { if (s.siteName) el.textContent = s.siteName; });
  document.querySelectorAll('.logo small').forEach((el) => { if (s.siteSub) el.textContent = s.siteSub; });
  document.querySelectorAll('.logo-icon').forEach((el) => {
    if (s.logoImage) el.innerHTML = `<img src="${esc(IMG(s.logoImage))}" alt="logo">`;
    else if (s.logoIcon) el.textContent = s.logoIcon;
  });
  if (s.siteName) { const fn = document.getElementById('footerName'); if (fn) fn.textContent = s.siteName; }
  if (s.footerNote) { const fn = document.getElementById('footerNote'); if (fn) fn.textContent = s.footerNote; }

  // نافبار + إظهار/إخفاء الأقسام + صفحات مخصصة
  const pagesAll = d.pagesAll || d.pages || [];
  buildNav(d.pages && d.pages.length ? d.pages : pagesAll);
  Object.values(KNOWN).forEach((sel) => { const el = document.querySelector(sel); if (el) el.style.display = ''; });
  (pagesAll || []).forEach((p) => {
    const sel = KNOWN[p.slug] || KNOWN[p.id];
    if (sel && p.visible === false) { const el = document.querySelector(sel); if (el) el.style.display = 'none'; }
  });
  buildCustomPages(pagesAll);

  // هيرو
  const eyebrow = document.querySelector('.hero-content .eyebrow');
  if (eyebrow && s.heroEyebrow) eyebrow.innerHTML = '<i></i> ' + esc(s.heroEyebrow);
  const h1 = document.getElementById('heroTitle');
  if (h1 && (s.heroTitleA || s.heroTitleHL || s.heroTitleB)) h1.innerHTML = `${esc(s.heroTitleA || '')}<br><span>${esc(s.heroTitleHL || '')}</span> ${esc(s.heroTitleB || '')}`;
  if (s.heroDesc) { const hd = document.getElementById('heroDesc'); if (hd) hd.textContent = s.heroDesc; }
  if (s.heroImage) { const hi = document.getElementById('heroImage'); if (hi) hi.src = IMG(s.heroImage); }
  const cs = document.querySelector('.image-caption span'); if (cs && s.heroCaptionSmall) cs.textContent = s.heroCaptionSmall;
  const cb = document.querySelector('.image-caption b'); if (cb && s.heroCaptionBig) cb.textContent = s.heroCaptionBig;
  if (s.floatingSmall) { const f = document.getElementById('floatingSmall'); if (f) f.textContent = s.floatingSmall; }
  if (s.floatingBig) { const f = document.getElementById('floatingBig'); if (f) f.textContent = s.floatingBig; }
  if (s.heroPrimary || s.heroSecondary || s.heroPrimaryUrl || s.heroSecondaryUrl) {
    const acts = document.getElementById('heroActions');
    if (acts) {
      const btns = acts.querySelectorAll('a');
      if (btns[0]) {
        if (s.heroPrimary) btns[0].innerHTML = esc(s.heroPrimary) + ' <b>↗</b>';
        if (s.heroPrimaryUrl) btns[0].setAttribute('href', s.heroPrimaryUrl);
      }
      if (btns[1]) {
        if (s.heroSecondary) btns[1].innerHTML = esc(s.heroSecondary) + ' <b>↗</b>';
        if (s.heroSecondaryUrl) btns[1].setAttribute('href', s.heroSecondaryUrl);
      }
    }
  }
  if (Array.isArray(s.trust) && s.trust.length) {
    const tr = document.getElementById('trustRow');
    if (tr) tr.innerHTML = s.trust.map((x) => `<span><b>${esc(x.n || '')}</b> ${esc(x.t || '')}</span>`).join('');
  }

  // تيكر
  if (Array.isArray(s.ticker) && s.ticker.length) {
    const t = document.getElementById('tickerInner');
    if (t) t.innerHTML = s.ticker.map((x) => `${esc(x)} <span>✦</span> `).join(' ');
  }

  // عن الشركة
  if (s.aboutNo) { const el = document.getElementById('aboutNo'); if (el) el.textContent = s.aboutNo; }
  if (s.aboutTitleA || s.aboutTitleHL) { const el = document.getElementById('aboutTitle'); if (el) el.innerHTML = `${esc(s.aboutTitleA || '')}<br><span>${esc(s.aboutTitleHL || '')}</span>`; }
  if (s.aboutDesc) { const el = document.getElementById('aboutDesc'); if (el) el.textContent = s.aboutDesc; }
  if (s.aboutImage) { const el = document.getElementById('aboutImage'); if (el) el.src = IMG(s.aboutImage); }
  if (s.aboutTag) { const el = document.getElementById('aboutTag'); if (el) el.textContent = s.aboutTag; }
  if (s.aboutTagBig) { const el = document.getElementById('aboutTagBig'); if (el) el.textContent = s.aboutTagBig; }
  if (Array.isArray(d.points) && d.points.length) {
    const box = document.getElementById('aboutPoints');
    if (box) box.innerHTML = d.points.map((x) => `<article class="point reveal visible" data-col="points" data-id="${esc(x.id)}"><span>${esc(x.num || '')}</span><div><h3 data-field="title">${esc(x.title)}</h3><p data-field="desc">${esc(x.desc || '')}</p></div></article>`).join('');
  }

  // عناوين الأقسام
  const setPair = (noId, titleId, descId, no, a, hl, desc) => {
    if (no) { const el = document.getElementById(noId); if (el) el.textContent = no; }
    if (a || hl) { const el = document.getElementById(titleId); if (el) el.innerHTML = `${esc(a || '')}<br><span>${esc(hl || '')}</span>`; }
    if (desc) { const el = document.getElementById(descId); if (el) el.textContent = desc; }
  };
  setPair('servicesNo', 'servicesTitle', 'servicesDesc', s.servicesNo, s.servicesTitleA, s.servicesTitleHL, s.servicesDesc);
  setPair('productsNo', 'productsTitle', null, s.productsNo, s.productsTitleA, s.productsTitleHL, null);
  setPair('processNo', 'processTitle', 'processDesc', s.processNo, s.processTitleA, s.processTitleHL, s.processDesc);
  setPair('contactNo', 'contactTitle', 'contactDesc', s.contactNo, s.contactTitleA, s.contactTitleHL, s.contactDesc);

  // خدمات
  if (Array.isArray(d.services)) {
    const g = document.getElementById('servicesGrid');
    if (g) g.innerHTML = d.services.length
      ? d.services.map((x) => `<article class="service glass reveal visible" data-col="services" data-id="${esc(x.id)}"><div class="service-icon">${esc(x.icon || '↗')}</div><small>${esc(x.num || '')}</small><h3 data-field="title">${esc(x.title)}</h3><p data-field="desc">${esc(x.desc || '')}</p><a href="${esc(x.linkUrl || '#contact')}" data-field="link" data-urlfield="linkUrl">${esc(x.link || 'اطلب التفاصيل ↗')}</a></article>`).join('')
      : '<p>لا توجد خدمات حالياً.</p>';
    const sel = document.getElementById('serviceSelect');
    if (sel && d.services.length) sel.innerHTML = d.services.map((x) => `<option>${esc(x.title)}</option>`).join('');
  }

  // منتجات + فلاتر ديناميكية
  if (Array.isArray(d.products)) {
    buildFilters(d.products);
    const g = document.getElementById('productsGrid');
    if (g) g.innerHTML = d.products.length
      ? d.products.map((x) => `<article class="product glass reveal visible" data-col="products" data-id="${esc(x.id)}" data-category="${esc(x.category || 'earth')}"><div class="product-media"><img loading="lazy" data-field="image" src="${esc(IMG(x.image))}" alt="${esc(x.title)}"><span>${esc(x.num || '')} / ${esc(x.catLabel || x.category || '')}</span><b>↗</b></div><div class="product-body"><h3 data-field="title">${esc(x.title)}</h3><p data-field="desc">${esc(x.desc || '')}</p><a href="#contact">اطلب عرض سعر ↗</a></div></article>`).join('')
      : '<p>لا توجد معدات حالياً.</p>';
    bindFilters();
  }

  // خطوات
  if (Array.isArray(d.steps)) {
    const g = document.getElementById('processGrid');
    if (g) g.innerHTML = d.steps.length
      ? d.steps.map((x) => `<div class="process-step reveal visible" data-col="steps" data-id="${esc(x.id)}"><span>${esc(x.num || '')}</span><h3 data-field="title">${esc(x.title)}</h3><p data-field="desc">${esc(x.desc || '')}</p></div>`).join('')
      : '<p>لا خطوات بعد.</p>';
  }

  // تواصل
  const lines = document.querySelectorAll('.contact-lines span');
  if (lines[0] && s.email) lines[0].textContent = '✉ ' + s.email;
  if (lines[1] && s.phone) lines[1].textContent = '☎ ' + s.phone;
  if (lines[2] && s.address) lines[2].textContent = '⌖ ' + s.address;
  document.dispatchEvent(new CustomEvent('site-loaded', { detail: d }));
}
loadSite();

// ---------- فورم التواصل ----------
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const status = f.querySelector('.form-status');
  const data = { name: f.name.value, email: f.email.value, service: f.service.value, message: f.message.value };
  status.textContent = 'جارٍ الإرسال...';
  let direct = null;
  for (const base of resolveBases()) {
    try {
      const r = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const dd = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (dd && dd.code === 'PERSIST_UNAVAILABLE' && dd.contact) direct = dd.contact;
        throw new Error(dd.error || 'فشل');
      }
      API_BASE = base;
      setStatus(true);
      status.textContent = dd.message || 'تم الإرسال بنجاح ✅';
      status.style.color = 'var(--lime)';
      f.reset();
      return;
    } catch {}
  }
  setStatus(false);
  status.textContent = direct && (direct.email || direct.phone)
    ? `تواصل معنا مباشرة: ${direct.email || ''} ${direct.phone || ''}`.trim()
    : 'تعذر الاتصال بالسيرفر — تحقق أنه يعمل على ' + (window.ABOJABAL_API || 'http://localhost:3001');
  status.style.color = '#ff9c9c';
});
