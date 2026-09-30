/**
 * مدخل Vercel Serverless — يحوّل كل طلبات /api/* لتطبيق Express
 * ملاحظة: نظام ملفات Vercel للقراءة فقط، لذلك الكتابة (حفظ/رفع/رسائل)
 * تُرفض برسالة واضحة، والقراءة وتسجيل الدخول تعمل طبيعياً.
 */
const app = require('../backend/src/server');

module.exports = (req, res) => app(req, res);
