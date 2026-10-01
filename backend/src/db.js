/**
 * مخزن JSON بسيط — يغني عن Postgres لموقع تعريفي صغير
 * الملف: backend/data/db.json
 * الهيكل: { settings, pages, services, products, steps, points, messages }
 * القاعدة: non-destructive — أي مفتاح ناقص يُستكمل من الافتراضي بدون مسح داتا
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// وضع Vercel: القراءة من ملف المحتوى المضمّن، والكتابة عبر GitHub API (commit تلقائي)
// محلياً: ملف backend/data/db.json كالمعتاد
const IS_VERCEL = !!process.env.VERCEL;
const SITE_FILE = path.join(__dirname, '..', '..', 'content', 'site.json');
const NO_TOKEN_MSG = 'الحفظ على Vercel يحتاج GITHUB_TOKEN — أضفه في Vercel → Settings → Environment Variables ثم Redeploy';

function defaultData() {
  return {
    settings: {
      siteName: 'أبو جبل',
      siteSub: 'للمعدات الثقيلة',
      logoIcon: 'AJ',
      logoImage: '',
      favicon: '',
      siteTitle: 'أبو جبل | حلول المعدات الثقيلة',
      metaDesc: 'أبو جبل للمعدات الثقيلة — بيع واستيراد وتصدير المعدات الثقيلة.',
      heroEyebrow: 'تجارة المعدات الثقيلة بثقة واحتراف',
      heroTitleA: 'نحوّل قوة',
      heroTitleHL: 'المعدات',
      heroTitleB: 'إلى قوة لمشروعك.',
      heroDesc: 'نوفّر حلولًا متكاملة لبيع واستيراد وتصدير المعدات الثقيلة، مع عناية بالتفاصيل وخدمة تجارية تواكب احتياجات أعمالك.',
      heroImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1400&q=85',
      heroCaptionSmall: 'حلول جاهزة للمشروعات',
      heroCaptionBig: 'قوة. دقة. التزام.',
      heroPrimary: 'استكشف المعدات ↗',
      heroSecondary: 'اطلب استشارة ↗',
      heroPrimaryUrl: '#products',
      heroSecondaryUrl: '#contact',
      floatingSmall: 'استجابة وتنسيق',
      floatingBig: 'من البداية حتى التسليم',
      trust: [
        { n: '01', t: 'توريد منظم' },
        { n: '02', t: 'خيارات متعددة' },
        { n: '03', t: 'متابعة واضحة' }
      ],
      aboutNo: '01 / عن الشركة',
      aboutTitleA: 'شريك عملي',
      aboutTitleHL: 'لخططك الكبيرة.',
      aboutDesc: 'نربط بين احتياجك والمعدة المناسبة من خلال فهم طبيعة العمل، مقارنة الخيارات، وتنظيم رحلة التوريد بأكبر قدر من الوضوح.',
      aboutImage: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=85',
      aboutTag: 'خبرة تجارية',
      aboutTagBig: 'تبدأ من فهم احتياجك',
      servicesNo: '02 / خدماتنا',
      servicesTitleA: 'حلول متكاملة',
      servicesTitleHL: 'تخدم أعمالك.',
      servicesDesc: 'مجموعة خدمات مصممة لتسهيل قرارات الشراء والتوريد والتجارة في قطاع المعدات الثقيلة.',
      productsNo: '03 / المعدات',
      productsTitleA: 'معدات مصممة',
      productsTitleHL: 'للعمل الشاق.',
      processNo: '04 / آلية العمل',
      processTitleA: 'رحلة بسيطة',
      processTitleHL: 'ونتيجة واضحة.',
      processDesc: 'من أول مكالمة إلى متابعة التسليم، نرتب الخطوات بشكل مفهوم وعملي.',
      contactNo: '05 / تواصل معنا',
      contactTitleA: 'جاهز تبدأ',
      contactTitleHL: 'مشروعك القادم؟',
      contactDesc: 'شاركنا احتياجك وسيتواصل معك فريقنا لمناقشة الخيارات المناسبة.',
      email: 'info@abojabal.com',
      phone: '+20 000 000 0000',
      address: 'القاهرة، مصر',
      footerNote: 'جميع الحقوق محفوظة.',
      ticker: ['بيع المعدات', 'الاستيراد والتصدير', 'حلول المشروعات', 'قطع الغيار']
    },
    pages: [
      { id: 'home', title: 'الرئيسية', slug: 'home', visible: true, order: 1, content: '' },
      { id: 'about', title: 'عن الشركة', slug: 'about', visible: true, order: 2, content: '' },
      { id: 'services', title: 'خدماتنا', slug: 'services', visible: true, order: 3, content: '' },
      { id: 'products', title: 'المعدات', slug: 'products', visible: true, order: 4, content: '' },
      { id: 'process', title: 'كيف نعمل', slug: 'process', visible: true, order: 5, content: '' },
      { id: 'contact', title: 'تواصل معنا', slug: 'contact', visible: true, order: 6, content: '' }
    ],
    services: [
      { id: 's1', icon: '↗', num: '01', title: 'بيع المعدات الثقيلة', desc: 'خيارات من المعدات الجديدة والمستعملة حسب طبيعة المشروع ومتطلبات التشغيل.', link: 'اطلب التفاصيل ↗', linkUrl: '#contact', order: 1 },
      { id: 's2', icon: '⇄', num: '02', title: 'الاستيراد والتصدير', desc: 'بحث وتنسيق تجاري ومساندة في خطوات الشحن والتسليم عبر الأسواق المختلفة.', link: 'ابدأ طلبك ↗', linkUrl: '#contact', order: 2 },
      { id: 's3', icon: '⚙', num: '03', title: 'قطع الغيار والدعم', desc: 'المساعدة في البحث عن قطع الغيار والحلول المساندة للحفاظ على جاهزية المعدة.', link: 'تحدث معنا ↗', linkUrl: '#contact', order: 3 },
      { id: 's4', icon: '⌁', num: '04', title: 'استشارات المشروعات', desc: 'مقارنة البدائل وتحديد الاحتياجات الفنية والتجارية قبل اتخاذ قرار الشراء.', link: 'اطلب استشارة ↗', linkUrl: '#contact', order: 4 }
    ],
    products: [
      { id: 'p1', category: 'earth', catLabel: 'حفر وتحميل', num: '01', title: 'الحفارات', desc: 'للحفر وتجهيز المواقع وأعمال البنية التحتية.', image: 'https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&w=1000&q=85', order: 1 },
      { id: 'p2', category: 'earth', catLabel: 'حفر وتحميل', num: '02', title: 'اللوادر', desc: 'للتحميل ونقل المواد داخل مواقع التشغيل.', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=85', order: 2 },
      { id: 'p3', category: 'transport', catLabel: 'نقل', num: '03', title: 'الشاحنات الثقيلة', desc: 'حلول نقل للمشروعات والعمليات الصناعية واللوجستية.', image: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1000&q=85', order: 3 },
      { id: 'p4', category: 'build', catLabel: 'إنشاءات', num: '04', title: 'معدات الإنشاءات', desc: 'معدات مساندة لمواقع العمل ومشروعات التشييد.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=85', order: 4 }
    ],
    steps: [
      { id: 'st1', num: '01', title: 'نفهم احتياجك', desc: 'المشروع والمواصفات والميزانية والموعد المطلوب.', order: 1 },
      { id: 'st2', num: '02', title: 'نبحث ونطابق', desc: 'نقارن الخيارات ونبحث عن المورد أو المعدة المناسبة.', order: 2 },
      { id: 'st3', num: '03', title: 'نراجع وننسق', desc: 'تنسيق الفحص والمستندات والشحن والتفاصيل التجارية.', order: 3 },
      { id: 'st4', num: '04', title: 'نسلم ونتابع', desc: 'متابعة مراحل التسليم والدعم وفق نطاق الاتفاق.', order: 4 }
    ],
    points: [
      { id: 'pt1', num: '01', title: 'اختيار مدروس', desc: 'نراجع المواصفات والاستخدام المتوقع والميزانية قبل اقتراح الخيارات.', order: 1 },
      { id: 'pt2', num: '02', title: 'تجارة دولية منظمة', desc: 'تنسيق مراحل الشراء والشحن والمستندات وفق نطاق كل صفقة.', order: 2 },
      { id: 'pt3', num: '03', title: 'تواصل واضح', desc: 'متابعة مباشرة وتحديثات واضحة من أول طلب حتى مرحلة التسليم.', order: 3 }
    ],
    messages: []
  };
}

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData(), null, 2), 'utf8');
  }
}

// دمج غير مدمر: أي حقل ناقص في الداتا القديمة يُستكمل من الافتراضي
function migrate(data) {
  const d = defaultData();
  let changed = false;
  if (!data.settings || typeof data.settings !== 'object') { data.settings = d.settings; changed = true; }
  else {
    for (const k of Object.keys(d.settings)) {
      if (data.settings[k] === undefined) { data.settings[k] = d.settings[k]; changed = true; }
    }
  }
  for (const k of ['pages', 'services', 'products', 'steps', 'points', 'messages']) {
    if (!Array.isArray(data[k])) { data[k] = d[k]; changed = true; }
  }
  // استكمال حقول ناقصة في عناصر قديمة بدون مسح
  (data.services || []).forEach((x) => {
    if (x.linkUrl === undefined) { x.linkUrl = '#contact'; changed = true; }
  });
  return changed;
}

function readBundled() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(SITE_FILE, 'utf8'));
  } catch {
    data = defaultData();
  }
  // استكمال في الذاكرة فقط (بدون كتابة) — يضمن شكلاً كاملاً دائماً
  try { migrate(data); } catch {}
  return data;
}

function read() {
  if (IS_VERCEL) return readBundled();
  ensure();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = defaultData();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
  if (migrate(data)) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch {}
  }
  return data;
}

function write(data) {
  if (IS_VERCEL) throw new Error(NO_TOKEN_MSG + ' (استخدم writeAsync)');
  ensure();
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, DB_FILE + '.bak');
    }
  } catch {}
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/** كتابة غير متزامنة: محلياً ملف، وعلى Vercel commit في الريبو (لا تنشر الرسائل publicly أبداً) */
async function writeAsync(data) {
  if (!IS_VERCEL) {
    write(data);
    return { mode: 'file' };
  }
  if (!process.env.GITHUB_TOKEN) {
    throw Object.assign(new Error(NO_TOKEN_MSG), { code: 'PERSIST_UNAVAILABLE' });
  }
  const { putFile } = require('./githubStore');
  const clean = { ...data, messages: [] };
  await putFile(
    'content/site.json',
    JSON.stringify(clean, null, 2),
    `تحديث المحتوى عبر اللوحة — ${new Date().toISOString()}`
  );
  return { mode: 'github' };
}

/**
 * حفظ ذري: يقرأ الأحدث → يطبق التعديل → يحفظ، مع إعادة المحاولة عند التعارض.
 * يمنع ضياع التعديلات عند الحفظات السريعة المتتالية (آخر كاتب كان يمسح ما قبله).
 */
async function mutate(fn, message, repoPath) {
  repoPath = repoPath || 'content/site.json';
  if (!IS_VERCEL) {
    const d = read();
    const out = (await fn(d)) || {};
    write(d);
    return { mode: 'file', ...out };
  }
  if (!process.env.GITHUB_TOKEN) {
    throw Object.assign(new Error(NO_TOKEN_MSG), { code: 'PERSIST_UNAVAILABLE' });
  }
  const { getFile, putWithSha, isConflict } = require('./githubStore');
  let lastErr = null;
  for (let i = 0; i < 5; i++) {
    const { sha, text } = await getFile(repoPath);
    let data;
    try {
      data = text ? JSON.parse(text) : defaultData();
    } catch {
      data = defaultData();
    }
    if (!Array.isArray(data.messages)) data.messages = [];
    const out = (await fn(data)) || {};
    data.messages = []; // لا تنشر صندوق الرسائل في ريبو عام أبداً
    try {
      await putWithSha(repoPath, JSON.stringify(data, null, 2), message || `تحديث المحتوى عبر اللوحة — ${new Date().toISOString()}`, sha);
      return { mode: 'github', ...out };
    } catch (e) {
      lastErr = e;
      if (!isConflict(e)) break;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

function uid(prefix) {
  return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

module.exports = { read, write, writeAsync, mutate, uid, defaultData };
