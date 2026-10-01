/** تنقية بسيطة للنصوص لمنع XSS */
function str(v, max = 2000) {
  if (v === undefined || v === null) return '';
  let s = String(v).slice(0, max);
  // إزالة وسوم script
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return s.trim();
}
function url(v) {
  const s = str(v, 2000);
  if (!s) return '';
  // اسمح بروابط http(s) و /uploads و data:image
  if (/^(https?:\/\/|\/uploads\/|data:image\/)/i.test(s)) return s;
  return '';
}
function email(v) {
  const s = str(v, 200);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
}
/** روابط آمنة: http(s) أو مسار داخلي /... أو anchor ...# — تمنع javascript: */
function link(v, dflt) {
  const s = str(v, 2000);
  if (!s) return dflt || '#contact';
  if (/^(https?:\/\/|\/|#)/i.test(s) && !/^javascript:/i.test(s)) return s;
  return dflt || '#contact';
}
module.exports = { str, url, email, link };
