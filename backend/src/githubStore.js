/**
 * مخزن GitHub — يجعل الريبو نفسه قاعدة البيانات على استضافات serverless
 * يكتب ملفات (المحتوى/الصور) عبر GitHub Contents API → كل حفظ = commit
 * → فيرسل يعيد النشر تلقائياً والمحتوى دائم ومُنسخ.
 * يحتاج env: GITHUB_TOKEN (Contents: read+write على الريبو)، GITHUB_REPO=owner/repo
 */
function repo() {
  const r = process.env.GITHUB_REPO || '';
  if (!r.includes('/')) throw new Error('GITHUB_REPO غير مضبوط — الصيغة: owner/repo');
  return r;
}
const branch = () => process.env.GIT_BRANCH || 'main';

async function gh(apiPath, method = 'GET', body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN غير مضبوط في متغيرات البيئة');
  const r = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'abojabal-cms'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `GitHub API خطأ ${r.status}`);
  return d;
}

async function getSha(repoPath) {
  try {
    const d = await gh(`/repos/${repo()}/contents/${repoPath}?ref=${encodeURIComponent(branch())}`);
    return d.sha || null;
  } catch (e) {
    if (/404|not found/i.test(e.message)) return null;
    throw e;
  }
}

/** قراءة ملف (نص) مع SHA — أساس الحفظ الذري */
async function getFile(repoPath) {
  const d = await gh(`/repos/${repo()}/contents/${repoPath}?ref=${encodeURIComponent(branch())}`).catch((e) => {
    if (/404|not found/i.test(e.message)) return null;
    throw e;
  });
  if (!d) return { sha: null, text: null };
  return { sha: d.sha || null, text: Buffer.from(d.content || '', 'base64').toString('utf8') };
}

function isConflict(e) {
  const m = e && e.message ? e.message : '';
  return /409|422|sha|conflict|match|was supplied|is at|expected/i.test(m);
}

/** كتابة بـ SHA معلوم */
async function putWithSha(repoPath, contentStr, message, sha, isBase64 = false) {
  return gh(`/repos/${repo()}/contents/${repoPath}`, 'PUT', {
    message,
    content: isBase64 ? contentStr : Buffer.from(contentStr, 'utf8').toString('base64'),
    sha: sha || undefined,
    branch: branch()
  });
}

/** حفظ ملف (نصي أو base64 جاهز) مع إعادة المحاولة عند تعارض SHA */
async function putFile(repoPath, contentStr, message, isBase64 = false) {
  let lastErr = null;
  for (let i = 0; i < 3; i++) {
    const sha = await getSha(repoPath);
    try {
      return await putWithSha(repoPath, contentStr, message, sha, isBase64);
    } catch (e) {
      lastErr = e;
      if (!isConflict(e)) break;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

module.exports = { putFile, getSha, getFile, putWithSha, isConflict };
