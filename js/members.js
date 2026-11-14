// หน้าสมาชิก (แอดมิน): ค้นหา เรียงลำดับ ดูประวัติ และปรับแต้มเอง
(function () {
  const state = { q: '', sort: 'lastVisit', page: 1, current: null };
  let searchTimer = null;
  let loadSeq = 0;

  async function load() {
    const seq = ++loadSeq;
    $('memberRows').innerHTML = '<tr><td colspan="5" class="loading">กำลังโหลด…</td></tr>';
    try {
      const r = await App.api('members', { q: state.q, sort: state.sort, page: state.page });
      if (seq !== loadSeq) return;
      $('memberCount').textContent = '(' + formatNumber(r.total) + ' คน)';
      $('memberRows').innerHTML = r.items.length ? r.items.map(m =>
        '<tr class="clickable" data-id="' + escapeHtml(m.userId) + '">' +
          '<td>' + escapeHtml(m.displayName || 'ลูกค้า') + '</td>' +
          '<td class="num"><b>' + formatNumber(m.balance) + '</b></td>' +
          '<td class="num">' + fmtBaht(m.totalSpentBaht) + '</td>' +
          '<td class="nowrap">' + fmtShort(m.lastVisitAt) + '</td>' +
          '<td class="nowrap">' + fmtDate(m.joinedAt) + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">' + (state.q ? 'ไม่พบสมาชิกที่ตรงกับ "' + escapeHtml(state.q) + '"' : 'ยังไม่มีสมาชิก') + '</td></tr>';
      $('memberPager').innerHTML = r.pages > 1
        ? '<button class="btn btn-ghost btn-sm" data-page="' + (r.page - 1) + '"' + (r.page <= 1 ? ' disabled' : '') + '>‹ ก่อนหน้า</button>' +
          '<span class="muted">หน้า ' + r.page + ' / ' + r.pages + '</span>' +
          '<button class="btn btn-ghost btn-sm" data-page="' + (r.page + 1) + '"' + (r.page >= r.pages ? ' disabled' : '') + '>ถัดไป ›</button>'
        : '';
    } catch (err) {
      if (seq === loadSeq) $('memberRows').innerHTML = '<tr><td colspan="5" class="empty">' + escapeHtml(err.message) + '</td></tr>';
    }
  }

  function statTile(label, value) {
    return '<div class="tile"><div class="tile-label">' + label + '</div><div class="tile-value">' + value + '</div></div>';
  }

  async function openMember(userId) {
    state.current = userId;
    $('mdName').textContent = 'กำลังโหลด…';
    $('mdId').textContent = userId;
    $('mdStats').innerHTML = '';
    $('mdHistory').innerHTML = '';
    $('adjError').textContent = '';
    $('adjustForm').reset();
    if (!$('memberDialog').open) $('memberDialog').showModal();
    try {
      const r = await App.api('memberDetail', { userId: userId });
      if (state.current !== userId) return;
      const m = r.member;
      $('mdName').textContent = m.displayName || 'ลูกค้า';
      $('mdStats').innerHTML =
        statTile('แต้มคงเหลือ', formatNumber(m.balance)) +
        statTile('ยอดซื้อสะสม', fmtBaht(m.totalSpentBaht) + ' ฿') +
        statTile('มาล่าสุด', fmtDate(m.lastVisitAt)) +
        statTile('สมัครเมื่อ', fmtDate(m.joinedAt));
      $('mdHistory').innerHTML = r.history.length ? r.history.map(h =>
        '<tr><td>' + fmtDateTime(h.at) + '</td><td>' + escapeHtml(txLabel(h)) + '</td>' +
        '<td class="num">' + (h.amountBaht != null ? fmtBaht(h.amountBaht) : '–') + '</td>' +
        '<td class="num ' + (h.points >= 0 ? 'plus' : 'minus') + '">' + signed(h.points) + '</td></tr>').join('')
        : '<tr><td colspan="4" class="empty">ยังไม่มีประวัติ</td></tr>';
    } catch (err) {
      $('mdName').textContent = 'โหลดไม่สำเร็จ';
      $('adjError').textContent = err.message;
    }
  }

  $('memberRows').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) openMember(tr.dataset.id);
  });
  $('memberSearch').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = $('memberSearch').value.trim(); state.page = 1; load(); }, 350);
  });
  $('memberSort').addEventListener('change', () => { state.sort = $('memberSort').value; state.page = 1; load(); });
  $('memberPager').addEventListener('click', e => {
    const b = e.target.closest('button[data-page]');
    if (b && !b.disabled) { state.page = Number(b.dataset.page); load(); }
  });

  $('adjustForm').addEventListener('submit', async e => {
    e.preventDefault();
    const points = Number($('adjSign').value) * Math.round(Number($('adjPoints').value));
    const note = $('adjNote').value.trim();
    const verb = points > 0 ? 'เพิ่ม' : 'หัก';
    if (!confirm(verb + ' ' + formatNumber(Math.abs(points)) + ' แต้ม ให้ ' + $('mdName').textContent + '?\nเหตุผล: ' + note)) return;
    const btn = e.submitter;
    if (btn) btn.disabled = true;
    $('adjError').textContent = '';
    try {
      const r = await App.api('adjustPoints', { userId: state.current, points: points, note: note });
      App.toast(verb + 'แต้มแล้ว คงเหลือ ' + formatNumber(r.balance) + ' แต้ม');
      await openMember(state.current);
      load();
    } catch (err) {
      $('adjError').textContent = err.message;
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  App.register('members', {
    show() { $('memberSearch').value = state.q; $('memberSort').value = state.sort; load(); },
    hide() { if ($('memberDialog').open) $('memberDialog').close(); },
  });
})();
