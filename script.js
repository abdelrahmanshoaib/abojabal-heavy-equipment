/* أبو جبل — منطق الموقع + ربط اختياري بالباك-إند */
const API_BASE = (window.ABOJABAL_API || localStorage.getItem('abojabal_api') || 'http://localhost:3001').replace(/\/$/, '');
const IMG = (u) => (!u ? '' : /^https?:/.test(u) ? u : API_BASE + u);

const menu = document.querySelector('.menu-toggle'); const nav = document.querySelector('.nav');
menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); menu.textContent = open ? '✕' : '☰'; });
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); if (menu) menu.textContent = '☰'; }));
const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }), { threshold: .12 }); document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
function bindFilters() {
  const filters = document.querySelectorAll('.filter'); const products = document.querySelectorAll('.product');
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const value = btn.dataset.filter;
    products.forEach((p) => { const show = value === 'all' || p.dataset.category === value; p.style.display = show ? 'block' : 'none'; if (show) { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = 'productIn .45s ease both'; } });
  }));
}
bindFilters();
const glow = document.querySelector('.cursor-glow'); window.addEventListener('pointermove', e => { if (glow) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; } });
const tilt = document.querySelector('.tilt'); if (tilt && window.matchMedia('(pointer:fine)').matches) { tilt.addEventListener('pointermove', e => { const r = tilt.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5; const y = (e.clientY - r.top) / r.height - .5; tilt.style.transform = `rotate(${x * 4 + 2}deg) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`; }); tilt.addEventListener('pointerleave', () => tilt.style.transform = 'rotate(2deg)'); }
document.getElementById('year').textContent = new Date().getFullYear();

// ---- تحميل المحتوى الديناميكي من الباك (مع fallback للمحتوى الثابت) ----
async function loadSite() {
  try {
    const r = await fetch(API_BASE + '/api/site');
    if (!r.ok) throw new Error('no api');
    const d = await r.json();
    const s = d.settings || {};
    // لوجو
    document.querySelectorAll('.logo b').forEach(el => { if (s.siteName) el.textContent = s.siteName; });
    document.querySelectorAll('.logo small').forEach(el => { if (s.siteSub) el.textContent = s.siteSub; });
    document.querySelectorAll('.logo-icon').forEach(el => { if (s.logoIcon) el.textContent = s.logoIcon; });
    // هيرو
    const eyebrow = document.querySelector('.hero-content .eyebrow');
    if (eyebrow && s.heroEyebrow) eyebrow.innerHTML = '<i></i> ' + escapeHtml(s.heroEyebrow);
    const h1 = document.querySelector('.hero-content h1');
    if (h1 && (s.heroTitleA || s.heroTitleHL)) h1.innerHTML = `${escapeHtml(s.heroTitleA || '')}<br><span>${escapeHtml(s.heroTitleHL || '')}</span> ${escapeHtml(s.heroTitleB || '')}`;
    const hd = document.querySelector('.hero-content > p');
    if (hd && s.heroDesc) hd.textContent = s.heroDesc;
    const hi = document.querySelector('.hero-image-wrap img');
    if (hi && s.heroImage) { hi.src = IMG(s.heroImage); }
    const cs = document.querySelector('.image-caption span'); if (cs && s.heroCaptionSmall) cs.textContent = s.heroCaptionSmall;
    const cb = document.querySelector('.image-caption b'); if (cb && s.heroCaptionBig) cb.textContent = s.heroCaptionBig;
    // عن الشركة
    const aboutH2 = document.querySelector('#about h2');
    if (aboutH2 && s.aboutTitleA) aboutH2.innerHTML = `${escapeHtml(s.aboutTitleA)}<br><span>${escapeHtml(s.aboutTitleHL || '')}</span>`;
    const aboutP = document.querySelector('#about .section-top > p');
    if (aboutP && s.aboutDesc) aboutP.textContent = s.aboutDesc;
    const aboutImg = document.querySelector('.about-photo img');
    if (aboutImg && s.aboutImage) aboutImg.src = IMG(s.aboutImage);
    // شريط متحرك
    if (Array.isArray(s.ticker) && s.ticker.length) {
      const t = document.querySelector('.ticker div');
      if (t) t.innerHTML = s.ticker.map(x => `${escapeHtml(x)} <span>✦</span> `).join(' ');
    }
    // تواصل
    const lines = document.querySelectorAll('.contact-lines span');
    if (lines[0] && s.email) lines[0].textContent = '✉ ' + s.email;
    if (lines[1] && s.phone) lines[1].textContent = '☎ ' + s.phone;
    if (lines[2] && s.address) lines[2].textContent = '⌖ ' + s.address;
    // خدمات
    if (Array.isArray(d.services) && d.services.length) {
      const g = document.querySelector('.services-grid');
      if (g) g.innerHTML = d.services.map(x => `<article class="service glass reveal visible"><div class="service-icon">${escapeHtml(x.icon || '↗')}</div><small>${escapeHtml(x.num || '')}</small><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.desc || '')}</p><a href="#contact">${escapeHtml(x.link || 'اطلب التفاصيل ↗')}</a></article>`).join('');
    }
    // منتجات
    if (Array.isArray(d.products) && d.products.length) {
      const g = document.querySelector('.products-grid');
      if (g) g.innerHTML = d.products.map(x => `<article class="product glass reveal visible" data-category="${escapeHtml(x.category || 'earth')}"><div class="product-media"><img src="${IMG(x.image)}" alt="${escapeHtml(x.title)}"><span>${escapeHtml(x.num || '')} / ${escapeHtml(x.catLabel || '')}</span><b>↗</b></div><div class="product-body"><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.desc || '')}</p><a href="#contact">اطلب عرض سعر ↗</a></div></article>`).join('');
      bindFilters();
    }
    // خطوات
    if (Array.isArray(d.steps) && d.steps.length) {
      const g = document.querySelector('.process-grid');
      if (g) g.innerHTML = d.steps.map(x => `<div class="process-step reveal visible"><span>${escapeHtml(x.num || '')}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.desc || '')}</p></div>`).join('');
    }
    // صفحات → إخفاء/إظهار الأقسام + إعادة بناء النافبار
    if (Array.isArray(d.pages) && d.pages.length) {
      const map = { home: '#home', about: '#about', services: '#services', products: '#products', process: '#process', contact: '#contact' };
      d.pages.forEach(p => {
        const sel = map[p.slug] || map[p.id];
        if (sel && p.visible === false) { const el = document.querySelector(sel); if (el) el.style.display = 'none'; }
      });
    }
  } catch { /* يبقى المحتوى الثابت — يعمل بدون باك-إند */ }
}
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
loadSite();

// ---- فورم التواصل: يحاول الباك أولاً ثم fallback ----
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const status = f.querySelector('.form-status');
  const data = { name: f.name.value, email: f.email.value, service: f.service.value, message: f.message.value };
  try {
    const r = await fetch(API_BASE + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'فشل الإرسال');
    status.textContent = d.message || 'تم الإرسال بنجاح ✅';
    status.style.color = 'var(--lime)';
    f.reset();
  } catch {
    status.textContent = 'تم استلام بياناتك بشكل تجريبي. شغّل الباك-إند لاستقبال الطلبات فعليًا.';
    status.style.color = 'var(--lime)';
  }
});
