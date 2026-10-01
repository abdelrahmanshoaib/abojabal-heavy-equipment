# أبو جبل للمعدات الثقيلة | Abo Jabal Heavy Equipment + CMS

موقع تعريفي عربي (RTL) + باك-إند تحكم كامل.

## 1) الموقع (فرونت — ربط كامل)
- `index.html` + `config.js` + `script.js` — يعمل **بدون باك-إند** (fallback ثابت)
- عند تشغيل الباك، `script.js` يجرّب نفس الأصل أولاً ثم `config.js` ثم `localhost:3001`، ويعيد رسم **كل شيء**:
  SEO (title/meta) + اللوجو + النافبار من `pages` + الهيرو (نصوص/صور/أزرار/ثقة/كارت عائم) + التيكر + عن الشركة (عناوين/صورة/نقاط `points`) + عناوين كل الأقسام + الخدمات + الفلاتر الديناميكية من الفئات الفعلية + المنتجات + الخطوات + التواصل (بيانات + خيارات الفورم من الخدمات) + الفوتر + صفحات مخصصة جديدة تُعرض تلقائياً + مؤشر حالة الاتصال
- فورم التواصل يجرّب كل الروابط المتاحة ويرسل لـ `POST /api/contact`

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
- `GET/PUT /api/admin/settings` — 45 حقل: SEO + لوجو + هيرو + ثقة + كل عناوين الأقسام + تواصل + فوتر + تيكر
- `GET/POST /api/admin/pages` + `PUT/DELETE /api/admin/pages/:id` — إضافة/حذف/إخفاء الصفحات (المخصصة تظهر تلقائياً في الموقع)
- نفس النمط لـ: `services` / `products` / `steps` / `points`
- `GET /api/admin/messages` + `PUT .../read` + `DELETE ...`
- `POST /api/admin/upload` — form-data باسم `image` (صور فقط، حد 5MB)
- الباك يقدم الفرونت نفسه: افتح `http://localhost:3001/` للموقع و `http://localhost:3001/admin.html` للوحة — سيرفر واحد = ربط كامل بدون CORS

## 3) لوحة التحكم
- افتح `admin.html` في المتصفح
- اكتب رابط السيرفر (مثال `http://localhost:3001`) + الدخول `admin / admin123`

## 3-ب) وضع التعديل المرئي (جديد ✨)
- **الدخول من الداشبورد فقط**: `admin.html` → زر **👁 عرض الموقع والتعديل عليه** يفتح الموقع مع `?edit=1` — الزائر الطبيعي لا يرى أي زر تعديل.
- اضغط **✏️ تعديل الموقع** (يظهر فقط في وضع التعديل) — لو مش مسجل سيطلب الدخول داخل نافذة
- اضغط على **أي نص** وعدّله مباشرة، وعلى **أي صورة** لتبديلها (رابط أو رفع من جهازك)
- العناوين الكبيرة تُعدل بأجزائها (عادي + مميز بلون) من نافذة
- اضغط **💾 تم وحفظ** في الشريط العلوي → يحفظ الكل (إعدادات + كروت) ويحدّث الصفحة، أو **✖ إلغاء** للتراجع
- من اللوحة تقدر:
  - تغيير اللوجو (الاسم + الوصف + الأيقونة) وكل النصوص والصور
  - رفع صور جديدة ونسخ رابطها
  - إضافة/تعديل/حذف: صفحات، خدمات، معدات، خطوات العمل
  - قراءة وحذف رسائل الزوار
  - إخفاء أي قسم من الموقع بدون حذفه (`ظاهرة؟ = مخفية`)

## 4) النشر
- **Vercel (فرونت + API):** الريبو جاهز — `vercel.json` يقدّم الموقع static ويوجّه `/api/*` لدالة `api/index.js` (نفس كود Express). الموقع يقرأ المحتوى والداشبورد يسجّل الدخول (`admin / admin123`) مباشرة بدون سيرفر محلي.
- **تفعيل الحفظ على Vercel (دقيقتان، مرة واحدة):** الريبو نفسه هو قاعدة البيانات — أي حفظ من اللوحة/الوضع المرئي يعمل commit تلقائي في `content/site.json` وفيرسل يعيد النشر خلال دقيقة:
  1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained → اختر الريبو فقط → صلاحية **Contents: Read and write** → انسخ التوكن.
  2. Vercel → المشروع → Settings → Environment Variables → أضف: `GITHUB_TOKEN` (التوكن)، `GITHUB_REPO` (مثال `abdelrahmanshoaib/abojabal-heavy-equipment`)، واختياري `ADMIN_USER`/`ADMIN_PASS`/`JWT_SECRET` بكلمة قوية → **Redeploy**.
  - بدون التوكن: القراءة والدخول يعملان، والحفظ يرد برسالة واضحة. رسائل الزوار لا تُنشر في الريبو العام عمداً — الفورم يعرض بيانات التواصل المباشر بدلاً منها.
- **الباك-إند (سيرفر دائم):** يشتغل على أي VPS أو Render/Railway: `node backend/src/server.js` أو `pm2 start backend/src/server.js --name abojabal` — وهو يقدم الموقع + اللوحة + API معاً.
- بعد استضافة الباك، غيّر رابط واحد فقط في `config.js`: `window.ABOJABAL_API = 'https://yourdomain.com'` وادفع — فيرسل يعيد النشر والموقع يبقى مربوطاً بالباك تلقائياً.

## الأمان
- Helmet + CORS + Rate-limit على تسجيل الدخول والفورم
- JWT 12 ساعة + bcrypt لكلمة المرور
- تنقية نصوص من `<script>` و `on*=`
