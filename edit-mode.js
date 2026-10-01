/* وضع التعديل المرئي — عدّل النصوص والصور على الموقع مباشرة ثم اضغط (تم وحفظ) */
(function () {
  'use strict';
  // زر التعديل يظهر فقط للقادم من الداشبورد (?edit=1) — الزائر الطبيعي لا يرى شيئاً
  const _params = new URLSearchParams(window.location.search);
  let _allowEdit = _params.get('edit') === '1';
  try {
    if (!_allowEdit && localStorage.getItem('abojabal_edit') === '1') _allowEdit = true;
  } catch {}
  if (!_allowEdit) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // نصوص مفردة: [selector, settingsKey, تنظيف عند الحفظ]
  const stripArrow = (v) => v.replace(/\s*[↗↑]\s*$/u, '').trim();
  const TEXTS = [
    ['.hero-content .eyebrow', 'heroEyebrow', (v) => v.trim()],
    ['#heroDesc', 'heroDesc', (v) => v.trim()],
    ['.image-caption span', 'heroCaptionSmall', (v) => v.trim()],
    ['.image-caption b', 'heroCaptionBig', (v) => v.trim()],
    ['#floatingSmall', 'floatingSmall', (v) => v.trim()],
    ['#floatingBig', 'floatingBig', (v) => v.trim()],
    ['#aboutDesc', 'aboutDesc', (v) => v.trim()],
    ['#aboutTag', 'aboutTag', (v) => v.trim()],
    ['#aboutTagBig', 'aboutTagBig', (v) => v.trim()],
    ['#aboutNo', 'aboutNo', (v) => v.trim()],
    ['#servicesNo', 'servicesNo', (v) => v.trim()],
    ['#servicesDesc', 'servicesDesc', (v) => v.trim()],
    ['#productsNo', 'productsNo', (v) => v.trim()],
    ['#processNo', 'processNo', (v) => v.trim()],
    ['#processDesc', 'processDesc', (v) => v.trim()],
    ['#contactNo', 'contactNo', (v) => v.trim()],
    ['#contactDesc', 'contactDesc', (v) => v.trim()],
    ['.logo b', 'siteName', (v) => v.trim()],
    ['.logo small', 'siteSub', (v) => v.trim()],
    ['.logo-icon', 'logoIcon', (v) => v.trim().slice(0, 4)],
    ['#footerName', 'siteName', (v) => v.trim()],
    ['#footerNote', 'footerNote', (v) => v.trim()]
  ];
  // عناوين مركبة (عادي + مميز بلون): selector -> [A, HL, B?]
  const TITLES = {
    '#heroTitle': ['heroTitleA', 'heroTitleHL', 'heroTitleB'],
    '#aboutTitle': ['aboutTitleA', 'aboutTitleHL', null],
    '#servicesTitle': ['servicesTitleA', 'servicesTitleHL', null],
    '#productsTitle': ['productsTitleA', 'productsTitleHL', null],
    '#processTitle': ['processTitleA', 'processTitleHL', null],
    '#contactTitle': ['contactTitleA', 'contactTitleHL', null]
  };
  const IMAGES = { '#heroImage': 'heroImage', '#aboutImage': 'aboutImage' };
  const LOGO_SEL = '.logo-icon';
  // روابط الأزرار: selector-index -> {textKey, urlKey}
  const pendingUrls = {}; // settingsKey -> url (تُدمج عند الحفظ)

  let API = '', TOKEN = localStorage.getItem('abojabal_token') || '';
  let editing = false, siteReady = !!window.__SITE__;
  const dirtySettings = new Set();
  const dirtyTrustTicker = { trust: false, ticker: false };
  const itemEdits = new Map(); // `${col}:${id}` -> {col,id,fields:{},els:[]}
  const pendingSettingValues = {}; // قيم إعدادات من النوافذ (تُدمج عند الحفظ)
  const pendingNavEdits = new Map(); // pageId -> {title, slug}
  const pendingCustomEdits = new Map(); // pageId -> {content} لصفحات مخصصة

  document.addEventListener('site-loaded', () => { siteReady = true; });
  // تعليم العنصر المعدّل فعلياً — عند تكرار نفس الحقل (لوجو الهيدر/الفوتر) تُعتمد نسخة المستخدم
  document.addEventListener('input', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-editable]') : null;
    if (t && editing) t.dataset.dirty = '1';
  });

  function bases() {
    const s = (window.ABOJABAL_API || localStorage.getItem('abojabal_api') || '').replace(/\/$/, '');
    const c = [];
    if (window.location.origin && window.location.origin.startsWith('http')) c.push('');
    if (s && !c.includes(s)) c.push(s);
    if (!c.includes('http://localhost:3001')) c.push('http://localhost:3001');
    return c;
  }
  async function api(path, opts = {}) {
    let lastErr = new Error('تعذر الاتصال');
    for (const b of bases()) {
      try {
        const r = await fetch(b + path, opts);
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { lastErr = new Error(d.error || ('خطأ ' + r.status)); continue; }
        API = b;
        return d;
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }
  const IMG = (u) => (!u ? '' : /^https?:/.test(u) ? u : API + u);
  const authH = (json = true) => {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
    return h;
  };

  // ---------- واجهة ----------
  const fab = document.createElement('button');
  fab.id = 'editFab';
  fab.textContent = '✏️ تعديل الموقع';
  document.body.appendChild(fab);
  fab.onclick = ensureAuthThenEnable;

  const bar = document.createElement('div');
  bar.id = 'editBar';
  bar.style.display = 'none';
  bar.innerHTML = `<span class="dot"></span><b>تعديل</b><span id="editStatus"></span><button id="editSave">💾 حفظ</button><button id="editCancel">✖</button>`;
  document.body.appendChild(bar);
  const toast = document.createElement('div');
  toast.id = 'editToast';
  document.body.appendChild(toast);
  let toastTimer = null;

  function status(t, ok = true) {
    const el = document.getElementById('editStatus');
    const short = String(t || '');
    if (el) { el.textContent = short.length > 26 ? short.slice(0, 26) + '…' : short; el.style.color = ok ? '#c6f36a' : '#ff9c9c'; }
    toast.textContent = String(t || '');
    toast.style.borderColor = ok ? 'rgba(198,243,106,.45)' : 'rgba(255,120,120,.5)';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), ok ? 3500 : 6000);
  }

  async function ensureAuthThenEnable() {
    status('جارٍ التحقق...');
    TOKEN = localStorage.getItem('abojabal_token') || '';
    try {
      if (TOKEN) await api('/api/admin/settings', { headers: authH(false) });
      else throw new Error('no token');
      enable();
    } catch {
      openLoginModal();
    }
  }

  function openLoginModal() {
    openModal({
      title: 'دخول الإدارة أولاً',
      fields: [
        { name: 'username', label: 'اسم المستخدم', value: 'admin' },
        { name: 'password', label: 'كلمة المرور', value: '', password: true }
      ],
      okText: 'دخول وتفعيل التعديل',
      onOk: async (vals, setErr) => {
        try {
          const d = await api('/api/admin/login', {
            method: 'POST', headers: authH(),
            body: JSON.stringify({ username: vals.username, password: vals.password })
          });
          TOKEN = d.token;
          localStorage.setItem('abojabal_token', TOKEN);
          closeModal();
          enable();
        } catch (e) { setErr(e.message); }
      }
    });
  }

  // نافذة عامة: حقول نصية + (وضع صورة اختياري)
  let modalWrap = null;
  function openModal({ title, fields, okText = 'تم', onOk, imageMode = null, extraButtons = [] }) {
    closeModal();
    modalWrap = document.createElement('div');
    modalWrap.id = 'editModalWrap';
    modalWrap.innerHTML = `<div id="editModal"><h3>${esc(title)}</h3>
      ${imageMode ? `<img id="editPreview" src="${esc(imageMode.current)}"><label>رابط الصورة<input name="__url" dir="ltr" value="${/^https?:/.test(imageMode.current || '') ? esc(imageMode.current) : ''}" placeholder="https://..."></label><label>أو ارفع من جهازك<input name="__file" type="file" accept="image/*"></label>` : ''}
      ${(fields || []).map((f) => {
        if (f.textarea) return `<label>${esc(f.label)}<textarea name="${f.name}" rows="4">${esc(f.value || '')}</textarea></label>`;
        if (f.select) return `<label>${esc(f.label)}<select name="${f.name}">${f.options.map((o) => `<option value="${esc(o[0])}"${String(f.value) === String(o[0]) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
        return `<label>${esc(f.label)}<input name="${f.name}" ${f.password ? 'type="password"' : ''} value="${esc(f.value || '')}"></label>`;
      }).join('')}
      <p id="editModalErr" style="color:#ff9c9c;font-size:12px;margin:0;min-height:18px"></p>
      <div class="row"><button id="editOk">${esc(okText)}</button>${extraButtons.map((b, i) => `<button id="editX${i}" type="button">${esc(b.label)}</button>`).join('')}<button id="editNo">إلغاء</button></div></div>`;
    document.body.appendChild(modalWrap);
    modalWrap.querySelector('#editNo').onclick = closeModal;
    extraButtons.forEach((b, i) => { modalWrap.querySelector('#editX' + i).onclick = b.onClick; });
    modalWrap.addEventListener('click', (e) => { if (e.target === modalWrap) closeModal(); });
    const fileInp = modalWrap.querySelector('input[name=__file]');
    if (fileInp) fileInp.onchange = () => {
      const f = fileInp.files[0];
      if (f) modalWrap.querySelector('#editPreview').src = URL.createObjectURL(f);
    };
    modalWrap.querySelector('#editOk').onclick = async () => {
      const vals = {};
      modalWrap.querySelectorAll('input[name],textarea[name]').forEach((el) => {
        if (el.name === '__file') return;
        vals[el.name] = el.value;
      });
      const setErr = (t) => (modalWrap.querySelector('#editModalErr').textContent = t);
      if (imageMode) {
        const f = fileInp && fileInp.files[0];
        let url = (vals.__url || '').trim();
        if (f) {
          setErr('جارٍ رفع الصورة...');
          try {
            const fd = new FormData();
            fd.append('image', f);
            let done = false;
            for (const b of bases()) {
              try {
                const r = await fetch(b + '/api/admin/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: fd });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                API = b; url = d.url; done = true; break;
              } catch (e) { setErr(e.message); }
            }
            if (!done) return;
          } catch (e) { setErr(e.message); return; }
        }
        if (!url) { setErr('ضع رابط صورة أو اختر ملفاً'); return; }
        onOk(url);
        return;
      }
      onOk(vals, setErr);
    };
  }
  function closeModal() { modalWrap?.remove(); modalWrap = null; }

  // ---------- التفعيل ----------
  function enable() {
    if (!siteReady) {
      status('انتظر تحميل المحتوى...');
      document.addEventListener('site-loaded', enable, { once: true });
      return;
    }
    editing = true;
    document.body.classList.add('editing');
    fab.style.display = 'none';
    bar.style.display = 'flex';
    assignFallbackIds();
    markTexts();
    markTitles();
    markImages();
    markLogo();
    markLinks();
    markNav();
    markCustomPages();
    ensureAddPageButton();
    markTrustTicker();
    markItems();
    status('اضغط على أي نص أو صورة لتعديلها');
  }

  // عناصر الكروت في وضع fallback (بدون data-id) تُربط بترتيبها مع بيانات الـ API
  function assignFallbackIds() {
    const d = window.__SITE__;
    if (!d) return;
    const map = [
      ['#servicesGrid .service, .services-grid .service', d.services],
      ['#productsGrid .product, .products-grid .product', d.products],
      ['#processGrid .process-step, .process-grid .process-step', d.steps],
      ['#aboutPoints .point, .about-points .point', d.points]
    ];
    const cols = ['services', 'products', 'steps', 'points'];
    map.forEach(([sel, arr], i) => {
      if (!Array.isArray(arr)) return;
      document.querySelectorAll(sel).forEach((card, idx) => {
        if (card.dataset.id || !arr[idx]) return;
        card.dataset.col = cols[i];
        card.dataset.id = arr[idx].id;
        const h = card.querySelector('h3'), p = card.querySelector('p');
        if (h && !h.dataset.field) h.dataset.field = 'title';
        if (p && !p.dataset.field) p.dataset.field = 'desc';
        const img = card.querySelector('img');
        if (img && !img.dataset.field) img.dataset.field = 'image';
      });
    });
  }

  function markEditable(el, kind) {
    if (!el || el.dataset.editable) return;
    el.dataset.editable = kind;
    el.dataset.orig = kind === 'img' ? el.src : el.textContent;
  }

  function markTexts() {
    TEXTS.forEach(([sel, key, clean]) => {
      document.querySelectorAll(sel).forEach((el) => {
        markEditable(el, 'text');
        el.dataset.skey = key;
        el.contentEditable = 'true';
        el.spellcheck = false;
        el.addEventListener('input', () => { dirtySettings.add(key); el.dataset.clean = '1'; });
      });
    });
    // سطور التواصل (تحتاج تنظيف خاص)
    const lines = document.querySelectorAll('.contact-lines span');
    const lkeys = ['email', 'phone', 'address'];
    lines.forEach((el, i) => {
      if (!lkeys[i]) return;
      markEditable(el, 'text');
      el.dataset.skey = lkeys[i];
      el.dataset.stripSym = '1';
      el.contentEditable = 'true';
      el.addEventListener('input', () => dirtySettings.add(lkeys[i]));
    });
  }

  function markLogo() {
    document.querySelectorAll(LOGO_SEL).forEach((el) => {
      markEditable(el, 'img');
      el.dataset.imgkey = 'logoImage';
      el.style.cursor = 'pointer';
      el.title = 'اضغط لتبديل صورة اللوجو';
      el.addEventListener('click', (e) => {
        if (!editing) return;
        e.preventDefault();
        e.stopPropagation();
        const s = (window.__SITE__?.settings) || {};
        const cur = el.querySelector('img')?.src || '';
        openImageModal(cur, (url) => {
          el.innerHTML = `<img src="${esc(url)}" alt="logo">`;
          el.dataset.pending = url;
          window.__LOGO_REMOVED = false;
          dirtySettings.add('logoImage');
          closeModal();
          status('تم تبديل اللوجو — اضغط (تم وحفظ)');
        }, true, () => {
          el.innerHTML = '';
          el.textContent = s.logoIcon || 'AJ';
          window.__LOGO_REMOVED = true;
          dirtySettings.add('logoImage');
          closeModal();
          status('تمت إزالة صورة اللوجو — اضغط (تم وحفظ)');
        });
      });
    });
  }

  // أزرار الهيرو: نص + رابط عبر نافذة (بدل التعديل المباشر حتى لا يتعارض مع التنقل)
  function markLinks() {
    const defs = [
      { textKey: 'heroPrimary', urlKey: 'heroPrimaryUrl' },
      { textKey: 'heroSecondary', urlKey: 'heroSecondaryUrl' }
    ];
    document.querySelectorAll('#heroActions a, .hero-content .actions a').forEach((el, i) => {
      const def = defs[i];
      if (!def) return;
      markEditable(el, 'link');
      el.dataset.linkmodal = '1';
      el.style.cursor = 'pointer';
      el.title = 'اضغط لتعديل النص والرابط';
      el.addEventListener('click', (e) => {
        if (!editing) return;
        e.preventDefault();
        const s = (window.__SITE__?.settings) || {};
        openModal({
          title: 'تعديل الزر',
          fields: [
            { name: 'text', label: 'النص', value: stripArrow(el.textContent) },
            { name: 'url', label: 'الرابط (مثال #products أو https://...)', value: pendingUrls[def.urlKey] ?? s[def.urlKey] ?? el.getAttribute('href') ?? '#contact' }
          ],
          onOk: (vals) => {
            el.innerHTML = `${esc(vals.text)} <b>↗</b>`;
            el.setAttribute('href', vals.url || '#contact');
            el.dataset.newText = vals.text;
            pendingUrls[def.urlKey] = vals.url || '#contact';
            dirtySettings.add(def.textKey);
            dirtySettings.add(def.urlKey);
            closeModal();
            status('تم تعديل الزر — اضغط (تم وحفظ)');
          }
        });
      });
    });
    // روابط كروت الخدمات: نص + رابط لكل عنصر
    document.querySelectorAll('[data-col="services"][data-id] a[href]').forEach((el) => {
      markEditable(el, 'link');
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        if (!editing) return;
        e.preventDefault();
        const card = el.closest('[data-col][data-id]');
        openModal({
          title: 'تعديل رابط الخدمة',
          fields: [
            { name: 'text', label: 'النص', value: stripArrow(el.textContent) },
            { name: 'url', label: 'الرابط', value: el.getAttribute('href') || '#contact' }
          ],
          onOk: (vals) => {
            el.textContent = vals.text;
            el.setAttribute('href', vals.url || '#contact');
            const k = card.dataset.col + ':' + card.dataset.id;
            if (!itemEdits.has(k)) itemEdits.set(k, { col: card.dataset.col, id: card.dataset.id, fields: {} });
            Object.assign(itemEdits.get(k).fields, { link: vals.text, linkUrl: vals.url || '#contact' });
            closeModal();
            status('تم تعديل الرابط — اضغط (تم وحفظ)');
          }
        });
      });
    });
  }

  // روابط القائمة الرئيسية: تعديل النص (والزر: نص + رابط)
  function markNav() {
    const navEl = document.querySelector('#mainNav') || document.querySelector('.nav');
    if (!navEl) return;
    const pagesAll = window.__SITE__?.pagesAll || window.__SITE__?.pages || [];
    navEl.querySelectorAll('a[href]').forEach((el) => {
      if (el.dataset.editable) return;
      const isCta = el.classList.contains('nav-button');
      markEditable(el, 'link');
      el.style.cursor = 'pointer';
      el.title = 'اضغط لتعديل هذا الرابط';
      el.addEventListener('click', (e) => {
        if (!editing) return;
        e.preventDefault();
        if (isCta) {
          const s = window.__SITE__?.settings || {};
          openModal({
            title: 'تعديل زر الهيدر',
            fields: [
              { name: 'text', label: 'النص', value: stripArrow(el.textContent) },
              { name: 'url', label: 'الرابط', value: pendingSettingValues.navCtaUrl ?? s.navCtaUrl ?? el.getAttribute('href') ?? '#contact' }
            ],
            onOk: (vals) => {
              el.innerHTML = `${esc(vals.text)} <span>↗</span>`;
              el.setAttribute('href', vals.url || '#contact');
              pendingSettingValues.navCta = vals.text;
              pendingSettingValues.navCtaUrl = vals.url || '#contact';
              dirtySettings.add('navCta');
              dirtySettings.add('navCtaUrl');
              closeModal();
              status('تم تعديل زر الهيدر — اضغط حفظ');
            }
          });
          return;
        }
        const slug = (el.getAttribute('href') || '').replace(/^#/, '');
        const page = pagesAll.find((p) => (p.slug || p.id) === slug);
        if (!page) return;
        openModal({
          title: 'تعديل رابط القائمة',
          fields: [
            { name: 'text', label: 'النص', value: stripArrow(el.textContent) || page.title },
            { name: 'slug', label: 'الرابط (بدون #)', value: slug }
          ],
          onOk: (vals) => {
            const newSlug = (vals.slug || '').trim().replace(/^#+/, '').replace(/\s+/g, '-') || slug;
            el.textContent = vals.text;
            el.setAttribute('href', '#' + newSlug);
            const sec = document.getElementById(slug);
            if (sec && newSlug !== slug) sec.id = newSlug;
            pendingNavEdits.set(page.id, { title: vals.text, slug: newSlug });
            closeModal();
            status('تم تعديل الرابط — اضغط حفظ');
          }
        });
      });
    });
  }

  // ربط الأقسام المخصصة الموجودة: نص مباشر أو نافذة كود حسب النوع
  function markCustomPages() {
    const pagesAll = window.__SITE__?.pagesAll || [];
    const box = document.getElementById('customPages');
    if (!box) return;
    box.querySelectorAll('section[id]').forEach((sec) => {
      const page = pagesAll.find((p) => (p.slug || p.id) === sec.id);
      if (!page || page._bound) return;
      page._bound = true;
      const card = sec.querySelector('.card');
      if (!card) return;
      if (page.contentType === 'html') {
        card.style.cursor = 'pointer';
        card.title = 'اضغط لتعديل الكود';
        card.addEventListener('click', () => {
          if (!editing) return;
          openModal({
            title: 'تعديل كود الصفحة: ' + page.title,
            fields: [{ name: 'code', label: 'كود HTML', value: page.content || '', textarea: true }],
            okText: 'حفظ الكود',
            onOk: (vals) => {
              card.innerHTML = vals.code;
              page.content = vals.code;
              pendingCustomEdits.set(page.id, { content: vals.code, contentType: 'html' });
              closeModal();
              status('تم تعديل الكود — اضغط حفظ');
            }
          });
        });
      } else {
        const p = card.querySelector('p');
        if (!p) return;
        markEditable(p, 'text');
        p.contentEditable = 'true';
        p.addEventListener('input', () => pendingCustomEdits.set(page.id, { content: p.innerText }));
      }
    });
  }

  // زر + صفحة من الوضع المرئي مباشرة
  function ensureAddPageButton() {
    if (document.getElementById('editAddPage')) return;
    const b = document.createElement('button');
    b.id = 'editAddPage';
    b.type = 'button';
    b.textContent = '+ صفحة';
    b.title = 'إضافة صفحة جديدة';
    b.onclick = openAddPageModal;
    bar.insertBefore(b, bar.querySelector('#editSave'));
  }

  function openAddPageModal() {
    openModal({
      title: 'صفحة جديدة',
      okText: 'إضافة',
      fields: [
        { name: 'title', label: 'العنوان', value: '' },
        { name: 'slug', label: 'الرابط (حروف انجليزية بدون مسافات)', value: '' },
        { name: 'contentType', label: 'نوع المحتوى', value: 'text', select: true, options: [['text', 'نص عادي'], ['html', 'كود HTML (خرائط، فيديو، تصميم مخصص)']] },
        { name: 'content', label: 'المحتوى / الكود', value: '', textarea: true }
      ],
      onOk: async (vals, setErr) => {
        const slug = (vals.slug || '').trim().replace(/^#+/, '').replace(/\s+/g, '-');
        if (!slug) { setErr('اكتب رابطاً للصفحة'); return; }
        if (!/^[A-Za-z0-9_-]+$/.test(slug)) { setErr('الرابط حروف انجليزية وأرقام و - _ فقط'); return; }
        try {
          const r = await api('/api/admin/pages', {
            method: 'POST', headers: authH(),
            body: JSON.stringify({ title: vals.title || 'صفحة جديدة', slug, content: vals.content || '', contentType: vals.contentType === 'html' ? 'html' : 'text', order: 99, visible: true })
          });
          closeModal();
          const pagesAll = window.__SITE__?.pagesAll;
          if (Array.isArray(pagesAll)) pagesAll.push(r.item);
          appendNavLink(r.item);
          appendCustomSection(r.item);
          markNav();
          status('تمت إضافة الصفحة ✅ وتظهر بعد دقيقة النشر');
        } catch (e) { setErr(e.message); }
      }
    });
  }

  function appendNavLink(page) {
    const navEl = document.querySelector('#mainNav') || document.querySelector('.nav');
    if (!navEl) return;
    const a = document.createElement('a');
    a.href = '#' + page.slug;
    a.textContent = page.title;
    const cta = navEl.querySelector('.nav-button');
    if (cta) navEl.insertBefore(a, cta);
    else navEl.appendChild(a);
  }

  function appendCustomSection(page) {
    let box = document.getElementById('customPages');
    if (!box) return;
    const isHtml = page.contentType === 'html';
    const sec = document.createElement('section');
    sec.id = page.slug;
    sec.className = 'section wrap';
    sec.innerHTML = `<div class="section-top reveal visible"><div><span class="section-no">${esc(page.title)}</span><h2>${esc(page.title)}</h2></div></div><div class="card" style="padding:24px;border-radius:20px">${isHtml ? (page.content || '') : `<p data-custompage="${esc(page.id)}" style="white-space:pre-wrap;margin:0">${esc(page.content || '')}</p>`}</div>`;
    box.appendChild(sec);
    if (isHtml) {
      sec.querySelector('.card').dataset.customhtml = page.id;
      sec.querySelector('.card').style.cursor = 'pointer';
      sec.querySelector('.card').title = 'اضغط لتعديل الكود';
      sec.querySelector('.card').addEventListener('click', (e) => {
        if (!editing) return;
        e.stopPropagation();
        const pagesAll = window.__SITE__?.pagesAll || [];
        const cur = pagesAll.find((x) => x.id === page.id);
        openModal({
          title: 'تعديل كود الصفحة',
          fields: [{ name: 'code', label: 'كود HTML', value: cur?.content ?? page.content ?? '', textarea: true }],
          okText: 'حفظ الكود',
          onOk: (vals) => {
            sec.querySelector('.card').innerHTML = vals.code;
            if (cur) cur.content = vals.code;
            pendingCustomEdits.set(page.id, { content: vals.code, contentType: 'html' });
            closeModal();
            status('تم تعديل الكود — اضغط حفظ');
          }
        });
      });
      return;
    }
    const p = sec.querySelector('[data-custompage]');
    markEditable(p, 'text');
    p.contentEditable = 'true';
    p.addEventListener('input', () => pendingCustomEdits.set(page.id, { content: p.innerText }));
  }

  function markTitles() {
    Object.entries(TITLES).forEach(([sel, keys]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      markEditable(el, 'title');
      el.style.cursor = 'pointer';
      el.title = 'اضغط لتعديل العنوان بأجزائه';
      el.addEventListener('click', () => {
        if (!editing) return;
        const s = (window.__SITE__?.settings) || {};
        openModal({
          title: 'تعديل العنوان',
          fields: [
            { name: 'a', label: 'الجزء الأول', value: s[keys[0]] || '' },
            { name: 'hl', label: 'الجزء المميز (بلون)', value: s[keys[1]] || '' },
            ...(keys[2] ? [{ name: 'b', label: 'الجزء الأخير', value: s[keys[2]] || '' }] : [])
          ],
          onOk: (vals, setErr) => {
            el.innerHTML = `${esc(vals.a)}<br><span>${esc(vals.hl)}</span>${keys[2] ? ' ' + esc(vals.b || '') : ''}`;
            dirtySettings.add(keys[0]); dirtySettings.add(keys[1]);
            if (keys[2]) dirtySettings.add(keys[2]);
            el.dataset.newA = vals.a; el.dataset.newHl = vals.hl; el.dataset.newB = vals.b || '';
            closeModal();
            status('تم تعديل العنوان — اضغط (تم وحفظ)');
          }
        });
      });
    });
  }

  function markImages() {
    Object.entries(IMAGES).forEach(([sel, key]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      markEditable(el, 'img');
      el.dataset.imgkey = key;
      el.addEventListener('click', (e) => {
        if (!editing) return;
        e.preventDefault();
        openImageModal(el.src, (url) => {
          el.src = url;
          el.dataset.pending = url;
          dirtySettings.add(key);
          closeModal();
          status('تم تبديل الصورة — اضغط (تم وحفظ)');
        });
      });
    });
  }

  function openImageModal(current, onOk, allowRemove, onRemove) {
    openModal({
      title: 'تبديل الصورة', fields: [], okText: 'استخدام هذه الصورة',
      imageMode: { current }, onOk,
      extraButtons: allowRemove ? [{ label: '🗑 إزالة الصورة', onClick: onRemove }] : []
    });
  }

  function markTrustTicker() {
    document.querySelectorAll('#trustRow span, .trust-row span').forEach((el) => {
      markEditable(el, 'text');
      el.contentEditable = 'true';
      el.addEventListener('input', () => (dirtyTrustTicker.trust = true));
    });
    const t = document.querySelector('#tickerInner, .ticker div');
    if (t) {
      markEditable(t, 'text');
      t.contentEditable = 'true';
      t.addEventListener('input', () => (dirtyTrustTicker.ticker = true));
    }
  }

  function markItems() {
    document.querySelectorAll('[data-col][data-id]').forEach((card) => {
      card.querySelectorAll('[data-field="title"],[data-field="desc"]').forEach((el) => {
        markEditable(el, 'text');
        el.contentEditable = 'true';
        el.addEventListener('input', () => {
          const k = card.dataset.col + ':' + card.dataset.id;
          if (!itemEdits.has(k)) itemEdits.set(k, { col: card.dataset.col, id: card.dataset.id, fields: {} });
          itemEdits.get(k).fields[el.dataset.field] = el.textContent.trim();
        });
      });
      const img = card.querySelector('img[data-field="image"]');
      if (img) {
        markEditable(img, 'img');
        img.addEventListener('click', (e) => {
          if (!editing) return;
          e.preventDefault();
          openImageModal(img.src, (url) => {
            img.src = url;
            const k = card.dataset.col + ':' + card.dataset.id;
            if (!itemEdits.has(k)) itemEdits.set(k, { col: card.dataset.col, id: card.dataset.id, fields: {} });
            itemEdits.get(k).fields.image = url;
            closeModal();
            status('تم تبديل الصورة — اضغط (تم وحفظ)');
          });
        });
      }
    });
  }

  // ---------- الحفظ ----------
  bar.querySelector('#editSave').onclick = saveAll;
  bar.querySelector('#editCancel').onclick = () => location.reload();

  function collectSettings() {
    const body = {};
    // نصوص مفردة من الـ DOM — المعدّل فعلياً (dirty) له الأولوية عند تكرار الحقل
    const els = [...document.querySelectorAll('[data-skey]')]
      .filter((el) => dirtySettings.has(el.dataset.skey));
    els.sort((a, b) => ((b.dataset.dirty ? 1 : 0) - (a.dataset.dirty ? 1 : 0)));
    els.forEach((el) => {
      const key = el.dataset.skey;
      if (key in body) return;
      let v = el.textContent.replace(/\s+/g, ' ').trim();
      if (el.dataset.stripSym) v = v.replace(/^[✉☎⌖]\s*/u, '');
      if (key === 'heroPrimary' || key === 'heroSecondary') v = stripArrow(v);
      if (key === 'logoIcon') v = v.slice(0, 4);
      if (!(key in body)) body[key] = v;
    });
    // عناوين مركبة من النوافذ
    Object.entries(TITLES).forEach(([sel, keys]) => {
      const el = document.querySelector(sel);
      if (el && el.dataset.newA !== undefined) {
        body[keys[0]] = el.dataset.newA;
        body[keys[1]] = el.dataset.newHl;
        if (keys[2]) body[keys[2]] = el.dataset.newB || '';
      }
    });
    // صور الإعدادات المعلقة (تشمل اللوجو)
    document.querySelectorAll('[data-pending]').forEach((el) => {
      if (el.dataset.imgkey) body[el.dataset.imgkey] = el.dataset.pending;
    });
    // إزالة صورة اللوجو
    if (window.__LOGO_REMOVED) body.logoImage = '';
    // أزرار الهيرو (نص + رابط من النوافذ)
    const btnDefs = [['heroPrimary', 'heroPrimaryUrl'], ['heroSecondary', 'heroSecondaryUrl']];
    document.querySelectorAll('#heroActions a, .hero-content .actions a').forEach((el, i) => {
      const def = btnDefs[i];
      if (!def) return;
      if (el.dataset.newText !== undefined) body[def[0]] = stripArrow(el.dataset.newText);
      if (pendingUrls[def[1]] !== undefined) body[def[1]] = pendingUrls[def[1]];
    });
    // الثقة والشريط من الـ DOM
    if (dirtyTrustTicker.trust) {
      body.trust = [...document.querySelectorAll('#trustRow span, .trust-row span')].map((s) => {
        const t = s.textContent.replace(/\s+/g, ' ').trim().split(' ');
        return { n: t.shift() || '', t: t.join(' ') };
      }).filter((x) => x.t);
    }
    if (dirtyTrustTicker.ticker) {
      const t = document.querySelector('#tickerInner, .ticker div');
      if (t) body.ticker = t.textContent.split('✦').map((x) => x.trim()).filter(Boolean);
    }
    return body;
  }

  async function saveAll() {
    const btn = bar.querySelector('#editSave');
    btn.disabled = true;
    try {
      const body = collectSettings();
      Object.assign(body, pendingSettingValues);
      let n = 0, viaGithub = false;
      if (Object.keys(body).length) {
        status('جارٍ حفظ النصوص والصور...');
        const r = await api('/api/admin/settings', { method: 'PUT', headers: authH(), body: JSON.stringify(body) });
        if (r.deployed === 'github') viaGithub = true;
        n++;
      }
      for (const [pageId, fields] of pendingNavEdits) {
        status('جارٍ حفظ القائمة...');
        const r = await api('/api/admin/pages/' + pageId, { method: 'PUT', headers: authH(), body: JSON.stringify(fields) });
        if (r.deployed === 'github') viaGithub = true;
        n++;
      }
      for (const [pageId, fields] of pendingCustomEdits) {
        status('جارٍ حفظ محتوى الصفحات...');
        const r = await api('/api/admin/pages/' + pageId, { method: 'PUT', headers: authH(), body: JSON.stringify(fields) });
        if (r.deployed === 'github') viaGithub = true;
        n++;
      }
      for (const { col, id, fields } of itemEdits.values()) {
        if (!Object.keys(fields).length) continue;
        status(`جارٍ حفظ ${col}...`);
        const r = await api(`/api/admin/${col}/${id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(fields) });
        if (r.deployed === 'github') viaGithub = true;
        n++;
      }
      if (!n) { status('لا توجد تعديلات للحفظ'); btn.disabled = false; return; }
      if (viaGithub) {
        status('اتحفظ ✅ — بيتنشر على الموقع خلال دقيقة، حدّث الصفحة بعدها');
        btn.disabled = false;
        return;
      }
      status('تم الحفظ بنجاح ✅ جارٍ التحديث...');
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      status(e.message || 'فشل الحفظ', false);
      btn.disabled = false;
      if (/401|مصرح|منتهية/.test(e.message || '')) {
        TOKEN = '';
        try { localStorage.removeItem('abojabal_token'); } catch {}
      }
    }
  }
})();
