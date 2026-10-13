const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const fs = require('node:fs');
const path = require('node:path');
const GITHUB_TOKEN = defineSecret('GITHUB_TOKEN');
const OWNER = 'creacionescesar';
const REPO = 'Pedidos-DFR';
const BRANCH = 'main';
const FILES = [
  { path: 'icon-192.png', key: 'icon192', original: 'icon-192.png' },
  { path: 'icon-512.png', key: 'icon512', original: 'icon-512.png' },
  { path: 'icon-maskable-512.png', key: 'maskable512', original: 'icon-maskable-512.png' },
];

function originalBase64(name) {
  return fs.readFileSync(path.join(__dirname, 'original-icons', name)).toString('base64');
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('GitHub API error', response.status, body);
    throw new HttpsError('internal', `GitHub no pudo actualizar ${url.split('/contents/')[1] || 'los archivos'} (${response.status}). Revisá el token y la rama configurada.`);
  }
  return body;
}

exports.actualizarIconoDFR = onCall({ region: 'us-central1', secrets: [GITHUB_TOKEN], timeoutSeconds: 120, memory: '256MiB' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Ingresá como administrador para cambiar el ícono.');
  const email = String(request.auth.token.email || '').toLowerCase();
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verificá el correo de la cuenta administradora antes de cambiar el ícono.');
  }
  // Restrict icon publishing to the explicitly authorized administrator.
  if (email !== 'cesaremanueldfrcocacola@gmail.com') {
    throw new HttpsError('permission-denied', 'Solo la cuenta administradora autorizada puede cambiar el ícono.');
  }
  const reset = request.data && request.data.reset === true;
  const images = request.data && request.data.images;
  if (!reset) {
    if (!images || FILES.some(f => typeof images[f.key] !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(images[f.key]) || images[f.key].length > 4_000_000)) {
      throw new HttpsError('invalid-argument', 'La imagen no es válida o es demasiado grande. Elegí otra imagen.');
    }
  }
  const token = GITHUB_TOKEN.value();
  if (!token) throw new HttpsError('failed-precondition', 'Falta configurar el secreto GITHUB_TOKEN en Firebase.');

  for (const file of FILES) {
    const content = reset ? originalBase64(file.original) : images[file.key];
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${file.path}`;
    const current = await githubRequest(`${url}?ref=${BRANCH}`, token);
    await githubRequest(url, token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: reset ? `Restaurar ícono original: ${file.path}` : `Actualizar ícono desde el administrador: ${file.path}`,
        content,
        sha: current.sha,
        branch: BRANCH,
      }),
    });
  }
  return { ok: true, message: reset
    ? 'Se solicitó restaurar el ícono original. Esperá unos minutos a que GitHub Pages publique los archivos.'
    : 'Se publicaron los archivos del nuevo ícono. Esperá unos minutos a que GitHub Pages termine de actualizar.' };
});
