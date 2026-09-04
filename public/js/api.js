// ---------- Auth/session helpers ----------
const Auth = {
  TOKEN_KEY: 'medsim_token',
  USER_KEY: 'medsim_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'); }
    catch (e) { return null; }
  },
  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },
  logout() {
    this.clear();
    window.location.href = '/login.html';
  },
  /** Redirects to login if not authenticated. Optionally requires a role. */
  guard(requiredRole) {
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) {
      window.location.href = '/login.html';
      return null;
    }
    if (requiredRole === 'admin' && user.role !== 'admin') {
      window.location.href = '/doctor.html';
      return null;
    }
    return user;
  }
};

// ---------- API fetch wrapper ----------
async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, Object.assign({}, options, { headers }));

  if (res.status === 401) {
    Auth.clear();
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// ---------- Small UI helpers ----------
function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, isError) {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function statusLabel(status) {
  if (status === 'green') return 'Handled';
  if (status === 'yellow') return 'In review';
  return 'Not handled';
}

/** Renders the shared sidebar shell into #sidebar-mount. */
function renderSidebar(activeKey) {
  const mount = document.getElementById('sidebar-mount');
  if (!mount) return;
  const user = Auth.getUser();
  if (!user) return;

  const isAdmin = user.role === 'admin';
  const items = isAdmin
    ? [
        { key: 'admin', label: 'Overview', href: '/admin.html', icon: '📊' },
        { key: 'browse', label: 'Browse Cases', href: '/doctor.html', icon: '🗂️' }
      ]
    : [
        { key: 'cases', label: 'My Cases', href: '/doctor.html', icon: '🗂️' }
      ];

  mount.innerHTML = `
    <div class="sidebar-header">
      <div class="brand">
        <span class="brand-icon">🩺</span>
        <div>
          <div class="brand-name">MedSim Review</div>
          <div class="brand-sub">Technion · MARAK</div>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${items.map(it => `<a class="nav-item ${it.key === activeKey ? 'active' : ''}" href="${it.href}"><span>${it.icon}</span><span>${escHtml(it.label)}</span></a>`).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="identity-box">
        <span class="who-name">${escHtml(user.name)}</span>
        <span class="who-role">${isAdmin ? 'Administrator' : 'Reviewing Physician'}</span>
      </div>
      <button class="logout-link" onclick="Auth.logout()">🚪 Log out</button>
    </div>
  `;
}
