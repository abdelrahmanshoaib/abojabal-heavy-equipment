/* وضع التعديل المرئي — عدّل النصوص والصور على الموقع مباشرة ثم اضغط (تم وحفظ) */
(function () {
  'use strict';
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

  let API = '', TOKEN = localStorage.getItem('abojabal_token') || '';
  let editing = false, siteReady = !!window.__SITE__;
  const dirtySettings = new Set();
  const dirtyTrustTicker = { trust: false, ticker: false };
  const itemEdits = new Map(); // `${col}:${id}` -> {col,id,fields:{},els:[]}

  document.addEventListener('site-loaded', () => { siteReady = true; });

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
  bar.innerHTML = `<span class="dot"></span><b>وضع التعديل</b><span id="editStatus">اضغط على أي نص أو صورة لتعديلها</span><button id="editSave">💾 تم وحفظ</button><button id="editCancel">✖ إلغاء</button>`;
  document.body.appendChild(bar);

  function status(t, ok = true) {
    const el = document.getElementById('editStatus');
    if (el) { el.textContent = t; el.style.color = ok ? '#c6f36a' : '#ff9c9c'; }
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
  function openModal({ title, fields, okText = 'تم', onOk, imageMode = null }) {
    closeModal();
    modalWrap = document.createElement('div');
    modalWrap.id = 'editModalWrap';
    modalWrap.innerHTML = `<div id="editModal"><h3>${esc(title)}</h3>
      ${imageMode ? `<img id="editPreview" src="${esc(imageMode.current)}"><label>رابط الصورة<input name="__url" dir="ltr" value="${/^https?:/.test(imageMode.current || '') ? esc(imageMode.current) : ''}" placeholder="https://..."></label><label>أو ارفع من جهازك<input name="__file" type="file" accept="image/*"></label>` : ''}
      ${(fields || []).map((f) => f.textarea
        ? `<label>${esc(f.label)}<textarea name="${f.name}" rows="3">${esc(f.value || '')}</textarea></label>`
        : `<label>${esc(f.label)}<input name="${f.name}" ${f.password ? 'type="password"' : ''} value="${esc(f.value || '')}"></label>`).join('')}
      <p id="editModalErr" style="color:#ff9c9c;font-size:12px;margin:0;min-height:18px"></p>
      <div class="row"><button id="editOk">${esc(okText)}</button><button id="editNo">إلغاء</button></div></div>`;
    document.body.appendChild(modalWrap);
    modalWrap.querySelector('#editNo').onclick = closeModal;
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
    // أزرار الهيرو + سطور التواصل (تحتاج تنظيف خاص)
    const btns = document.querySelectorAll('#heroActions a, .hero-content .actions a');
    btns.forEach((el, i) => {
      markEditable(el, 'text');
      el.dataset.skey = i === 0 ? 'heroPrimary' : 'heroSecondary';
      el.contentEditable = 'true';
      el.addEventListener('input', () => dirtySettings.add(el.dataset.skey));
    });
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

  function openImageModal(current, onOk) {
    openModal({ title: 'تبديل الصورة', fields: [], okText: 'استخدام هذه الصورة', imageMode: { current }, onOk });
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
    // نصوص مفردة من الـ DOM
    const seen = new Set();
    document.querySelectorAll('[data-skey]').forEach((el) => {
      const key = el.dataset.skey;
      if (!dirtySettings.has(key) || seen.has(el)) return;
      seen.add(el);
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
    // صور الإعدادات المعلقة
    document.querySelectorAll('img[data-pending]').forEach((el) => {
      if (el.dataset.imgkey) body[el.dataset.imgkey] = el.dataset.pending;
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
      let n = 0;
      if (Object.keys(body).length) {
        status('جارٍ حفظ النصوص والصور...');
        await api('/api/admin/settings', { method: 'PUT', headers: authH(), body: JSON.stringify(body) });
        n++;
      }
      for (const { col, id, fields } of itemEdits.values()) {
        if (!Object.keys(fields).length) continue;
        status(`جارٍ حفظ ${col}...`);
        await api(`/api/admin/${col}/${id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(fields) });
        n++;
      }
      if (!n) { status('لا توجد تعديلات للحفظ'); btn.disabled = false; return; }
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
