import { next } from '@vercel/functions';

const COOKIE_NAME = 'checklist_access';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export const config = {
  matcher: [
    '/pages/windows.html',
    '/pages/windows',
    '/pages/linux.html',
    '/pages/linux',
  ],
};

function constantTimeEqual(left, right) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

async function signExpiry(secret, expiry) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${COOKIE_NAME}:${expiry}`),
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function hasValidCookie(request, secret) {
  const cookies = request.headers.get('cookie') || '';

  for (const cookie of cookies.split(';')) {
    const [name, value] = cookie.trim().split('=', 2);
    if (name !== COOKIE_NAME || !value) continue;

    const separator = value.indexOf('.');
    if (separator < 1) continue;

    const expiry = value.slice(0, separator);
    const suppliedSignature = value.slice(separator + 1);
    if (!/^\d{1,15}$/.test(expiry) || !suppliedSignature) continue;
    if (Number(expiry) <= Math.floor(Date.now() / 1000)) continue;

    const expectedSignature = await signExpiry(secret, expiry);
    if (constantTimeEqual(suppliedSignature, expectedSignature)) return true;
  }

  return false;
}

function loginResponse(status, checklistPath, message = '') {
  const error = message
    ? `<p class="error" role="alert">${message}</p>`
    : '';
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#000000">
  <title>Team Checklists Access</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <style>
    .guide-login-page { display: grid; min-height: 100vh; place-items: center; padding: 24px; background-color: #000000; }
    .guide-login-art { position: fixed; right: 0; bottom: 0; z-index: 0; width: 440px; max-width: 85vw; height: auto; filter: grayscale(100%) contrast(1.2); opacity: .14; pointer-events: none; -webkit-mask-image: radial-gradient(circle at bottom right, black 20%, transparent 75%); mask-image: radial-gradient(circle at bottom right, black 20%, transparent 75%); }
    .guide-login-shell { position: relative; z-index: 1; width: min(100%, 480px); }
    .guide-warning { margin-bottom: 16px; padding: 13px 16px; border: 1px solid rgba(255, 65, 75, .55); border-radius: 12px; background: rgba(130, 15, 25, .2); box-shadow: 0 0 24px rgba(255, 35, 48, .24), inset 0 0 18px rgba(255, 35, 48, .08); color: #ff727b; font: 700 .78rem/1.5 var(--disp); letter-spacing: .075em; text-align: center; text-shadow: 0 0 12px rgba(255, 46, 60, .65); }
    .guide-card { padding: clamp(24px, 6vw, 40px); border: 1px solid var(--line-bright); border-radius: var(--r); background: linear-gradient(145deg, var(--panel-strong), rgba(8, 12, 18, .92)); box-shadow: 0 24px 60px rgba(0, 0, 0, .38), inset 0 1px rgba(255, 255, 255, .07); -webkit-backdrop-filter: blur(20px) saturate(135%); backdrop-filter: blur(20px) saturate(135%); }
    .guide-card h1 { margin: 0 0 8px; color: var(--text); font: 700 1.7rem/1.2 var(--disp); letter-spacing: -.035em; }
    .guide-card > p { color: var(--mute); }
    .guide-card label { display: block; margin: 24px 0 8px; color: var(--text); font: 600 .85rem var(--disp); }
    .guide-card input { width: 100%; padding: 12px 14px; border: 1px solid var(--line-bright); border-radius: 10px; background: rgba(6, 8, 12, .78); color: var(--text); font: 400 1rem var(--body); }
    .guide-card input:focus { border-color: var(--a); outline: 2px solid var(--a); outline-offset: 2px; }
    .guide-card button { width: 100%; margin-top: 16px; padding: 12px 18px; border: 1px solid rgba(255, 255, 255, .55); border-radius: 999px; background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%); color: #000000; cursor: pointer; font: 600 .9rem var(--disp); transition: background .25s ease, box-shadow .25s ease, transform .25s var(--ease); }
    .guide-card button:hover { transform: translateY(-2px); background: linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%); box-shadow: 0 8px 26px rgba(255, 255, 255, .18); }
    .guide-card .error { margin-top: 14px; color: #cbd5e1; }
    .guide-return { display: inline-block; margin-top: 24px; color: var(--mute); font: 600 .82rem var(--disp); transition: color .2s ease; }
    .guide-return:hover { color: var(--a); }
    @media (max-width: 480px) { .guide-login-page { padding: 18px; } .guide-warning { font-size: .7rem; } }
  </style>
</head>
<body class="guide-login-page">
  <div class="guide-login-shell">
    <p class="guide-warning" role="note">RESTRICTED: ONLY SEAL TEAM SIX MEMBERS BEYOND THIS POINT</p>
    <main class="guide-card">
      <h1>Team Checklists</h1>
      <p>Enter the password to view the team checklists.</p>
      ${error}
      <form method="post" action="${checklistPath}">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        <button type="submit">Continue</button>
      </form>
      <a class="guide-return" href="/">&larr; Return to Command Center</a>
    </main>
  </div>
  <script>
    (() => {
      if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lens = document.createElement('div');
      lens.className = 'lens';
      lens.setAttribute('aria-hidden', 'true');
      document.body.append(lens);
      document.documentElement.classList.add('has-lens');
      let targetX = 0;
      let targetY = 0;
      let cursorX = 0;
      let cursorY = 0;
      let active = false;
      addEventListener('pointermove', event => {
        targetX = event.clientX;
        targetY = event.clientY;
        if (!active) {
          active = true;
          cursorX = targetX;
          cursorY = targetY;
          lens.classList.add('on');
        }
      });
      document.addEventListener('mouseleave', () => {
        active = false;
        lens.classList.remove('on');
      });
      document.addEventListener('pointerover', event => {
        lens.classList.toggle('hov', !!event.target.closest('a,button,[role=button],[role=checkbox]'));
      });
      (function animateCursor() {
        cursorX += (targetX - cursorX) * (reducedMotion ? 1 : .22);
        cursorY += (targetY - cursorY) * (reducedMotion ? 1 : .22);
        lens.style.transform = \`translate3d(\${cursorX}px,\${cursorY}px,0)\`;
        requestAnimationFrame(animateCursor);
      })();
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default async function middleware(request) {
  const checklistPath = new URL(request.url).pathname;
  const secret = process.env.CHECKLIST_PASSWORD;
  if (!secret) {
    return new Response('Checklist access is not configured.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (await hasValidCookie(request, secret)) return next();

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
      return loginResponse(400, checklistPath, 'Please submit the password using the form.');
    }

    const formData = await request.formData();
    const submittedPassword = formData.get('password');
    if (typeof submittedPassword !== 'string' || !constantTimeEqual(submittedPassword, secret)) {
      return loginResponse(401, checklistPath, 'That password was not correct. Please try again.');
    }

    const expiry = String(Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE);
    const signature = await signExpiry(secret, expiry);
    return new Response(null, {
      status: 303,
      headers: {
        'Location': checklistPath,
        'Set-Cookie': `${COOKIE_NAME}=${expiry}.${signature}; Path=/pages/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed.', {
      status: 405,
      headers: { 'Allow': 'GET, HEAD, POST', 'Cache-Control': 'no-store' },
    });
  }

  return loginResponse(401, checklistPath);
}
