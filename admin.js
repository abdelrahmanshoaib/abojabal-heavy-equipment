/* لوحة تحكم أبو جبل — تتصل بالباك على API_URL */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
let API = localStorage.getItem('abojabal_api') || 'http://localhost:3001';
let TOKEN = localStorage.getItem('abojabal_token') || '';

$('#apiUrl').value = API;
if (TOKEN) showDash();

function headers(json = true) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
  return h;
}
function say(t, ok = true) {
  const el = $('#status');
  el.textContent = t;
  el.style.color = ok ? 'var(--lime)' : '#ff9c9c';
  setTimeout(() => (el.textContent = ''), 3500);
}
async function api(path, opts = {}) {
  const r = await fetch(API + path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || ('خطأ ' + r.status));
  return d;
}

// دخول
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  API = $('#apiUrl').value.trim().replace(/\/$/, '') || 'http://localhost:3001';
  localStorage.setItem('abojabal_api', API);
  try {
    const d = await api('/api/admin/login', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ username: $('#username').value, password: $('#password').value })
    });
    TOKEN = d.token;
    localStorage.setItem('abojabal_token', TOKEN);
    showDash();
  } catch (err) { $('#loginErr').textContent = err.message; }
});

function showDash() {
  $('#loginScreen').classList.add('hidden');
  $('#dash').classList.remove('hidden');
  loadAll();
}
$('#logout').onclick = () => { TOKEN = ''; localStorage.removeItem('abojabal_token'); location.reload(); };
$('#refresh').onclick = loadAll;

// تبويبات
const titles = { settings: 'الإعدادات واللوجو', pages: 'الصفحات', services: 'الخدمات', products: 'المعدات', steps: 'خطوات العمل', points: 'نقاط عن الشركة', messages: 'الرسائل' };
$$('#tabs button').forEach((b) => b.onclick = () => {
  $$('#tabs button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  $$('.panel').forEach((p) => p.classList.add('hidden'));
  $('#tab-' + b.dataset.tab).classList.remove('hidden');
  $('#tabTitle').textContent = titles[b.dataset.tab];
});

// تحميل الكل
async function loadAll() {
  try {
    const s = await api('/api/admin/settings', { headers: headers(false) });
    const f = $('#settingsForm');
    Object.keys(s).forEach((k) => {
      if (!f.elements[k]) return;
      if (k === 'ticker' && Array.isArray(s[k])) f.elements[k].value = s[k].join(' ، ');
      else if (k === 'trust' && Array.isArray(s[k])) f.elements[k].value = s[k].map((x) => `${x.n || ''}|${x.t || ''}`).join(' ، ');
      else f.elements[k].value = s[k] || '';
    });
    loadList('pages', '#pagesList', (p) => `<b>${p.title}</b><span class="meta">/${p.slug} • ترتيب ${p.order || 0} • ${p.visible === false ? 'مخفية' : 'ظاهرة'}</span><p>${(p.content || '').slice(0, 120)}</p>`);
    loadList('services', '#servicesList', (x) => `<b>${x.icon || ''} ${x.title}</b><span class="meta">${x.num || ''} • ترتيب ${x.order || 0}</span><p>${x.desc || ''}</p>`);
    loadList('products', '#productsList', (x) => `<b>${x.title}</b><span class="meta">${x.catLabel || x.category} • ${x.num || ''}</span>${x.image ? `<img src="${fullImg(x.image)}">` : ''}<p>${x.desc || ''}</p>`);
    loadList('steps', '#stepsList', (x) => `<b>${x.num || ''} — ${x.title}</b><p>${x.desc || ''}</p>`);
    loadList('points', '#pointsList', (x) => `<b>${x.num || ''} — ${x.title}</b><p>${x.desc || ''}</p>`);
    const msgs = await api('/api/admin/messages', { headers: headers(false) });
    $('#msgCount').textContent = msgs.filter((m) => !m.read).length ? `(${msgs.filter((m) => !m.read).length})` : '';
    $('#messagesList').innerHTML = msgs.length ? '' : '<div class="card">لا توجد رسائل بعد.</div>';
    msgs.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<b>${m.name} — ${m.email}</b><span class="meta">${m.service || ''} • ${new Date(m.date).toLocaleString('ar-EG')} ${m.read ? '' : '• <b style="color:var(--lime)">جديدة</b>'}</span><p>${m.message}</p><div class="actions"><button class="btn small" data-a="read">تعليم مقروءة</button><button class="btn small danger" data-a="del">حذف</button></div>`;
      div.querySelector('[data-a=read]').onclick = async () => { await api('/api/admin/messages/' + m.id + '/read', { method: 'PUT', headers: headers(false) }); loadAll(); };
      div.querySelector('[data-a=del]').onclick = async () => { if (confirm('حذف الرسالة؟')) { await api('/api/admin/messages/' + m.id, { method: 'DELETE', headers: headers(false) }); loadAll(); } };
      $('#messagesList').appendChild(div);
    });
  } catch (err) {
    if (/401|مصرح|منتهية/.test(err.message)) { TOKEN = ''; localStorage.removeItem('abojabal_token'); location.reload(); }
    else say(err.message, false);
  }
}
function fullImg(u) { return /^https?:/.test(u) ? u : API + u; }

async function loadList(key, sel, render) {
  const arr = await api('/api/admin/' + key, { headers: headers(false) });
  const box = $(sel);
  box.innerHTML = arr.length ? '' : '<div class="card">لا عناصر بعد.</div>';
  arr.forEach((it) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = render(it) + `<div class="actions"><button class="btn small" data-a="edit">تعديل</button><button class="btn small danger" data-a="del">حذف</button></div>`;
    div.querySelector('[data-a=del]').onclick = async () => {
      if (!confirm('حذف نهائي؟')) return;
      await api('/api/admin/' + key + '/' + it.id, { method: 'DELETE', headers: headers(false) });
      say('تم الحذف'); loadAll();
    };
    div.querySelector('[data-a=edit]').onclick = async () => {
      const field = key === 'pages' ? 'title' : 'title';
      const v = prompt('العنوان الجديد:', it[field] || '');
      if (v === null) return;
      await api('/api/admin/' + key + '/' + it.id, { method: 'PUT', headers: headers(), body: JSON.stringify({ ...it, [field]: v }) });
      say('تم التعديل السريع — للتعديل الكامل احذف وأضف'); loadAll();
    };
    box.appendChild(div);
  });
}

// حفظ الإعدادات
$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = {};
  [...f.elements].forEach((el) => { if (el.name) body[el.name] = el.value; });
  if (body.ticker) body.ticker = String(body.ticker).split(/[,،]/).map((t) => t.trim()).filter(Boolean);
  if (body.trust) body.trust = String(body.trust).split(/[,،]/).map((t) => t.trim()).filter(Boolean).map((t) => { const [n, ...rest] = t.split('|'); return { n: (n || '').trim(), t: rest.join('|').trim() || n.trim() }; });
  try { await api('/api/admin/settings', { method: 'PUT', headers: headers(), body: JSON.stringify(body) }); say('تم حفظ الإعدادات ✅'); }
  catch (err) { say(err.message, false); }
});

// رفع صورة
$('#uploadBtn').onclick = async () => {
  const f = $('#imgFile').files[0];
  if (!f) return say('اختر صورة أولاً', false);
  const fd = new FormData();
  fd.append('image', f);
  try {
    const r = await fetch(API + '/api/admin/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    $('#uploadOut').innerHTML = `تم الرفع ✅ انسخ الرابط: <code dir="ltr">${d.url}</code>`;
    say('تم رفع الصورة');
  } catch (err) { say(err.message, false); }
};

// إضافة عناصر
function bindAdd(formSel, key) {
  $(formSel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {};
    [...e.target.elements].forEach((el) => { if (el.name) body[el.name] = el.value; });
    if (body.visible !== undefined) body.visible = body.visible === 'true';
    ['order'].forEach((k) => { if (body[k] !== undefined && body[k] !== '') body[k] = Number(body[k]); });
    try { await api('/api/admin/' + key, { method: 'POST', headers: headers(), body: JSON.stringify(body) }); e.target.reset(); say('تمت الإضافة ✅'); loadAll(); }
    catch (err) { say(err.message, false); }
  });
}
bindAdd('#pageForm', 'pages');
bindAdd('#serviceForm', 'services');
bindAdd('#productForm', 'products');
bindAdd('#stepForm', 'steps');
bindAdd('#pointForm', 'points');
