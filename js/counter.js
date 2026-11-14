// หน้าเคาน์เตอร์: สร้าง QR สะสมแต้ม / แลกรางวัล แล้วรอลูกค้าส่งข้อความในแชท
(function () {
  const POLL_MS = 3000;
  let mode = 'EARN';
  let pollTimer = null;
  let tickTimer = null;

  function stopTimers() {
    clearInterval(pollTimer); clearInterval(tickTimer);
    pollTimer = tickTimer = null;
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('#counterForm .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    $('earnPanel').hidden = m !== 'EARN';
    $('redeemPanel').hidden = m !== 'REDEEM';
    if (m === 'EARN') $('amountInput').focus();
  }

  function updatePreview() {
    const amount = Number($('amountInput').value);
    const rate = App.info.bahtPerPoint || 25;
    const pts = amount > 0 ? Math.floor(amount / rate) : 0;
    $('preview').innerHTML = amount > 0
      ? (pts > 0 ? 'ลูกค้าจะได้ <b>' + formatNumber(pts) + ' แต้ม</b>' : 'ยอดไม่ถึง ' + formatNumber(rate) + ' บาท ยังไม่ได้แต้ม')
      : '<span class="muted">ทุก ' + formatNumber(rate) + ' บาท = 1 แต้ม</span>';
    $('earnBtn').disabled = pts < 1;
  }

  function renderRewards() {
    const list = App.info.rewards || [];
    $('redeemList').innerHTML = list.length
      ? list.map(r => '<button class="reward-pick" data-id="' + escapeHtml(r.rewardId) + '">' +
          escapeHtml(r.name) + '<span>' + formatNumber(r.pointsCost) + ' แต้ม</span></button>').join('')
      : '<div class="empty">ยังไม่มีของรางวัลที่เปิดอยู่</div>';
  }

  function showForm() {
    stopTimers();
    $('qrPanel').hidden = true;
    $('counterForm').hidden = false;
    $('amountInput').value = '';
    $('earnError').textContent = '';
    $('redeemError').textContent = '';
    updatePreview();
    setMode(mode);
  }

  async function create(payload, errorEl, btn) {
    $(errorEl).textContent = '';
    if (btn) btn.disabled = true;
    try {
      showQr(await App.api('createToken', payload));
    } catch (err) {
      if (err.code !== 'BAD_PIN' && err.code !== 'LOCKED') $(errorEl).textContent = err.message;
    } finally {
      if (btn) btn.disabled = false;
      if (mode === 'EARN') updatePreview();
    }
  }

  function setStatus(kind, text) {
    $('qrStatus').className = 'status status-' + kind;
    $('qrStatus').textContent = text;
  }

  function showQr(t) {
    const qr = qrcode(0, 'M');
    qr.addData(t.qrUrl);
    qr.make();
    $('qrBox').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0 });
    $('qrBox').style.opacity = 1;

    if (t.type === 'EARN') {
      $('qrTitle').textContent = '+' + formatNumber(t.points) + ' แต้ม';
      $('qrSub').textContent = 'ยอด ' + fmtBaht(t.amountBaht) + ' บาท';
    } else {
      $('qrTitle').textContent = 'แลก ' + t.rewardName;
      $('qrSub').textContent = 'ใช้ ' + formatNumber(-t.points) + ' แต้ม';
    }
    setStatus('wait', 'รอลูกค้าสแกนและกดส่ง…');
    $('counterForm').hidden = true;
    $('qrPanel').hidden = false;

    const expires = new Date(t.expiresAt).getTime();
    const done = (kind, text) => { stopTimers(); $('countdown').textContent = ''; $('qrBox').style.opacity = .25; setStatus(kind, text); };
    const tick = () => {
      const left = Math.max(0, Math.round((expires - Date.now()) / 1000));
      $('countdown').textContent = 'QR หมดอายุใน ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      if (left <= 0) done('err', 'QR หมดอายุแล้ว กด "รายการใหม่" เพื่อสร้างใหม่');
    };
    tick();
    tickTimer = setInterval(tick, 1000);
    pollTimer = setInterval(async () => {
      try {
        const s = await App.api('tokenStatus', { token: t.token });
        if (s.status === 'USED') {
          done('ok', '✓ สำเร็จ' + (s.usedByName ? ' · ' + s.usedByName : '') + (s.balance != null ? ' (คงเหลือ ' + formatNumber(s.balance) + ' แต้ม)' : ''));
        } else if (s.status === 'EXPIRED') {
          done('err', 'QR หมดอายุแล้ว กด "รายการใหม่" เพื่อสร้างใหม่');
        }
      } catch (err) { /* เครือข่ายสะดุดชั่วคราว: รอรอบหน้า */ }
    }, POLL_MS);
  }

  document.querySelectorAll('#counterForm .seg-btn').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('amountInput').addEventListener('input', updatePreview);
  $('amountInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('earnBtn').disabled) $('earnBtn').click(); });
  $('earnBtn').addEventListener('click', () => create({ type: 'EARN', amountBaht: Number($('amountInput').value) }, 'earnError', $('earnBtn')));
  $('redeemList').addEventListener('click', e => {
    const b = e.target.closest('.reward-pick');
    if (b) create({ type: 'REDEEM', rewardId: b.dataset.id }, 'redeemError', b);
  });
  $('newBtn').addEventListener('click', showForm);

  App.register('counter', {
    show() { renderRewards(); showForm(); },
    hide: stopTimers,
    refreshRewards: renderRewards,
  });
})();
