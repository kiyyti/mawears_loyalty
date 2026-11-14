// แกนกลางของเว็บหลังร้าน: เข้าสู่ระบบ, สิทธิ์, เปลี่ยนหน้า, ตัวช่วยร่วม
const $ = (id) => document.getElementById(id);

const App = {
  pin: '',
  role: null,      // 'staff' | 'admin'
  info: null,      // ข้อมูลจาก login: shopName, bahtPerPoint, rewards
  views: {},       // หน้าที่ลงทะเบียนไว้: { counter: {show, hide}, ... }
  current: null,

  register(name, view) { this.views[name] = view; },

  /** เรียก API พร้อม PIN; ถ้า PIN ใช้ไม่ได้แล้วจะเด้งออกไปหน้าเข้าสู่ระบบ */
  async api(action, data) {
    try {
      return await callApi(action, Object.assign({ pin: this.pin }, data || {}));
    } catch (err) {
      if (err.code === 'BAD_PIN' || err.code === 'LOCKED') this.logout(err.message);
      throw err;
    }
  },

  async login(pin, remember) {
    const info = await callApi('login', { pin: pin });
    this.pin = pin;
    this.role = info.role;
    this.info = info;
    sessionStorage.setItem('pin', pin);
    if (remember) localStorage.setItem('pin', pin); else localStorage.removeItem('pin');
    this.enterApp();
  },

  logout(message) {
    Object.values(this.views).forEach(v => v.hide && v.hide());
    this.pin = ''; this.role = null; this.info = null; this.current = null;
    sessionStorage.removeItem('pin');
    localStorage.removeItem('pin');
    $('appView').hidden = true;
    $('loginView').hidden = false;
    $('pinInput').value = '';
    $('loginError').textContent = message || '';
    $('pinInput').focus();
  },

  enterApp() {
    const shop = this.info.shopName || 'หลังร้าน';
    $('shopName').textContent = shop;
    document.title = shop + ' · หลังร้าน';
    $('roleBadge').textContent = this.role === 'admin' ? 'แอดมิน' : 'พนักงาน';
    document.querySelectorAll('[data-admin]').forEach(el => { el.hidden = this.role !== 'admin'; });
    $('loginView').hidden = true;
    $('appView').hidden = false;
    this.route();
  },

  route() {
    if (!this.role) return;
    let name = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'counter';
    const tab = document.querySelector('.tabs a[data-view="' + name + '"]');
    if (!this.views[name] || !tab || (tab.hasAttribute('data-admin') && this.role !== 'admin')) name = 'counter';
    if (this.current === name) return;
    if (this.current && this.views[this.current].hide) this.views[this.current].hide();
    this.current = name;
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
    document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('active', a.dataset.view === name));
    this.views[name].show();
  },

  toast(text, isError) {
    const t = $('toast');
    t.textContent = text;
    t.className = 'toast' + (isError ? ' err' : '');
    t.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  },

  start() {
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = $('pinInput').value.trim();
      if (!pin) return;
      $('loginBtn').disabled = true;
      $('loginError').textContent = '';
      try { await this.login(pin, $('rememberPin').checked); }
      catch (err) { $('loginError').textContent = err.message; }
      $('loginBtn').disabled = false;
    });
    $('logoutBtn').onclick = () => this.logout('');
    window.addEventListener('hashchange', () => this.route());
    document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

    const saved = sessionStorage.getItem('pin') || localStorage.getItem('pin');
    if (saved) {
      $('rememberPin').checked = !!localStorage.getItem('pin');
      this.login(saved, !!localStorage.getItem('pin')).catch(err => {
        $('loginView').hidden = false;
        if (err.code === 'BAD_PIN' || err.code === 'LOCKED') { localStorage.removeItem('pin'); sessionStorage.removeItem('pin'); }
        else $('pinInput').value = saved;
        $('loginError').textContent = err.message;
      });
    } else {
      $('loginView').hidden = false;
      $('pinInput').focus();
    }
  },
};

/* ---------- ตัวช่วยจัดรูปแบบ ---------- */
function fmtDateTime(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' +
         d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function fmtShort(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' +
         d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtBaht(n) {
  return Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}
function signed(n) {
  return (n > 0 ? '+' : '') + formatNumber(n);
}
function txLabel(t) {
  if (t.type === 'EARN') return 'สะสมแต้ม';
  if (t.type === 'REDEEM') return 'แลก ' + (t.rewardName || '');
  return 'ปรับโดยร้าน' + (t.note ? ': ' + t.note : '');
}
