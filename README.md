# أبو جبل للمعدات الثقيلة | Abo Jabal Heavy Equipment + CMS

موقع تعريفي عربي (RTL) + باك-إند تحكم كامل.

## 1) الموقع (فرونت)
- `index.html` + `styles.css` + `script.js` — يعمل **بدون باك-إند** (محتوى ثابت fallback)
- لو الباك شغال، `script.js` يجلب المحتوى تلقائياً من `GET /api/site` ويعيد رسم الخدمات/المنتجات/الخطوات/النصوص/الصور
- فورم التواصل يحاول `POST /api/contact` أولاً، ولو مفيش باك يعرض رسالة تجريبية

## 2) الباك-إند (Node + Express)
```
cd backend
cp .env.example .env   # ثم عدّل ADMIN_USER / ADMIN_PASS / JWT_SECRET
npm install
npm start              # http://localhost:3001
```
- التخزين: `backend/data/db.json` (يتولد تلقائياً بأول تشغيل + نسخة `.bak` قبل كل حفظ)
- الصور: `backend/uploads/` وتُعرض على `/uploads/xxx`
- الصحة: `GET /health`

### API عام
- `GET /api/site` — كل محتوى الموقع
- `POST /api/contact` — `{name,email,service,message}` → يتخزن في الرسائل

### API أدمن (يحتاج `Authorization: Bearer <token>`)
- `POST /api/admin/login` — `{username,password}`
- `GET/PUT /api/admin/settings` — اللوجو والنصوص والصور وبيانات التواصل
- `GET/POST /api/admin/pages` + `PUT/DELETE /api/admin/pages/:id` — إضافة/حذف/إخفاء الصفحات
- نفس النمط لـ: `services` / `products` / `steps`
- `GET /api/admin/messages` + `PUT .../read` + `DELETE ...`
- `POST /api/admin/upload` — form-data باسم `image` (صور فقط، حد 5MB)

## 3) لوحة التحكم
- افتح `admin.html` في المتصفح
- اكتب رابط السيرفر (مثال `http://localhost:3001`) + الدخول `admin / admin123`
- من اللوحة تقدر:
  - تغيير اللوجو (الاسم + الوصف + الأيقونة) وكل النصوص والصور
  - رفع صور جديدة ونسخ رابطها
  - إضافة/تعديل/حذف: صفحات، خدمات، معدات، خطوات العمل
  - قراءة وحذف رسائل الزوار
  - إخفاء أي قسم من الموقع بدون حذفه (`ظاهرة؟ = مخفية`)

## 4) النشر
- الفرونت يترفع على GitHub Pages عادي
- الباك يشتغل على أي VPS: `node backend/src/server.js` أو `pm2 start backend/src/server.js --name abojabal`
- غيّر `window.ABOJABAL_API` في `index.html` لرابط السيرفر الإنتاجي

## الأمان
- Helmet + CORS + Rate-limit على تسجيل الدخول والفورم
- JWT 12 ساعة + bcrypt لكلمة المرور
- تنقية نصوص من `<script>` و `on*=`
