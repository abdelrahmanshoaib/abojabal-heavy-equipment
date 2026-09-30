/**
 * مخزن JSON بسيط — يغني عن Postgres لموقع تعريفي صغير
 * الملف: backend/data/db.json
 * الهيكل: { settings, pages, services, products, steps, messages }
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function defaultData() {
  return {
    settings: {
      siteName: 'أبو جبل',
      siteSub: 'للمعدات الثقيلة',
      logoIcon: 'AJ',
      heroEyebrow: 'تجارة المعدات الثقيلة بثقة واحتراف',
      heroTitleA: 'نحوّل قوة',
      heroTitleHL: 'المعدات',
      heroTitleB: 'إلى قوة لمشروعك.',
      heroDesc: 'نوفّر حلولًا متكاملة لبيع واستيراد وتصدير المعدات الثقيلة، مع عناية بالتفاصيل وخدمة تجارية تواكب احتياجات أعمالك.',
      heroImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1400&q=85',
      heroCaptionSmall: 'حلول جاهزة للمشروعات',
      heroCaptionBig: 'قوة. دقة. التزام.',
      aboutTitleA: 'شريك عملي',
      aboutTitleHL: 'لخططك الكبيرة.',
      aboutDesc: 'نربط بين احتياجك والمعدة المناسبة من خلال فهم طبيعة العمل، مقارنة الخيارات، وتنظيم رحلة التوريد بأكبر قدر من الوضوح.',
      aboutImage: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=85',
      aboutTag: 'خبرة تجارية',
      aboutTagBig: 'تبدأ من فهم احتياجك',
      email: 'info@abojabal.com',
      phone: '+20 000 000 0000',
      address: 'القاهرة، مصر',
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
      { id: 's1', icon: '↗', num: '01', title: 'بيع المعدات الثقيلة', desc: 'خيارات من المعدات الجديدة والمستعملة حسب طبيعة المشروع ومتطلبات التشغيل.', link: 'اطلب التفاصيل ↗', order: 1 },
      { id: 's2', icon: '⇄', num: '02', title: 'الاستيراد والتصدير', desc: 'بحث وتنسيق تجاري ومساندة في خطوات الشحن والتسليم عبر الأسواق المختلفة.', link: 'ابدأ طلبك ↗', order: 2 },
      { id: 's3', icon: '⚙', num: '03', title: 'قطع الغيار والدعم', desc: 'المساعدة في البحث عن قطع الغيار والحلول المساندة للحفاظ على جاهزية المعدة.', link: 'تحدث معنا ↗', order: 3 },
      { id: 's4', icon: '⌁', num: '04', title: 'استشارات المشروعات', desc: 'مقارنة البدائل وتحديد الاحتياجات الفنية والتجارية قبل اتخاذ قرار الشراء.', link: 'اطلب استشارة ↗', order: 4 }
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
    messages: []
  };
}

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData(), null, 2), 'utf8');
  }
}

function read() {
  ensure();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    const d = defaultData();
    fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2), 'utf8');
    return d;
  }
}

function write(data) {
  ensure();
  // كتابة غير مدمرة: نحفظ نسخة احتياطية قبل الكتابة
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, DB_FILE + '.bak');
    }
  } catch {}
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function uid(prefix) {
  return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

module.exports = { read, write, uid };
