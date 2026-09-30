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
    if (/404/.test(e.message)) return null;
    throw e;
  }
}

/** حفظ ملف (نصي أو base64 جاهز) مع إعادة المحاولة عند تعارض SHA */
async function putFile(repoPath, contentStr, message, isBase64 = false) {
  let lastErr = null;
  for (let i = 0; i < 2; i++) {
    const sha = await getSha(repoPath);
    try {
      return await gh(`/repos/${repo()}/contents/${repoPath}`, 'PUT', {
        message,
        content: isBase64 ? contentStr : Buffer.from(contentStr, 'utf8').toString('base64'),
        sha: sha || undefined,
        branch: branch()
      });
    } catch (e) {
      lastErr = e;
      if (!/409|sha|conflict/i.test(e.message)) break;
    }
  }
  throw lastErr;
}

module.exports = { putFile, getSha };
