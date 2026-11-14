// หน้าภาพรวม (แอดมิน): ตัวเลขสรุป + กราฟบิลที่สะสมแต้มรายวัน + รางวัลยอดนิยม
(function () {
  let days = 14;
  let loadSeq = 0;

  function niceMax(v) {
    if (v <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const steps = [1, 2, 2.5, 5, 10];
    for (const s of steps) if (s * pow >= v) return s * pow;
    return 10 * pow;
  }

  function dayLabel(key) {
    const [y, m, d] = key.split('-').map(Number);
    return d + '/' + m;
  }
  function dayLong(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /** คอลัมน์แบบซีรีส์เดียว: ความหนาไม่เกิน 24px มุมบนโค้ง 4px ฐานเหลี่ยม เส้นกริดจาง มี tooltip */
  function barChart(series) {
    const W = 680, H = 240, L = 34, R = 8, T = 12, B = 26;
    const pw = W - L - R, ph = H - T - B;
    const max = niceMax(Math.max(0, ...series.map(d => d.earnCount)));
    const band = pw / series.length;
    const bw = Math.max(4, Math.min(24, band - 2));
    const y = v => T + ph - (v / max) * ph;
    const every = Math.ceil(series.length / 10);

    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i, yy = y(v);
      g += '<line class="gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/>';
      g += '<text class="axis" x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + formatNumber(Math.round(v * 10) / 10) + '</text>';
    }
    series.forEach((d, i) => {
      const cx = L + band * i + band / 2;
      const x0 = cx - bw / 2, top = y(d.earnCount), base = T + ph;
      const h = base - top, r = Math.min(4, h, bw / 2);
      if (h > 0) {
        g += '<path class="bar" data-i="' + i + '" d="M' + x0 + ',' + base + 'V' + (top + r) + 'Q' + x0 + ',' + top + ' ' + (x0 + r) + ',' + top +
             'H' + (x0 + bw - r) + 'Q' + (x0 + bw) + ',' + top + ' ' + (x0 + bw) + ',' + (top + r) + 'V' + base + 'Z"/>';
      }
      g += '<rect class="hit" data-i="' + i + '" x="' + (L + band * i) + '" y="' + T + '" width="' + band + '" height="' + ph + '"/>';
      if (i % every === 0 || i === series.length - 1) {
        g += '<text class="axis" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + dayLabel(d.date) + '</text>';
      }
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="กราฟจำนวนบิลที่สะสมแต้มรายวัน">' + g + '</svg>';
  }

  function attachTooltip(box, series) {
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    box.appendChild(tip);
    const svg = box.querySelector('svg');
    let hovered = null;
    svg.addEventListener('mousemove', (e) => {
      const hit = e.target.closest('.hit');
      if (!hit) return;
      const i = Number(hit.dataset.i), d = series[i];
      if (hovered) hovered.classList.remove('hover');
      hovered = svg.querySelector('.bar[data-i="' + i + '"]');
      if (hovered) hovered.classList.add('hover');
      const rect = hit.getBoundingClientRect(), outer = box.getBoundingClientRect();
      const bar = hovered ? hovered.getBoundingClientRect() : rect;
      tip.innerHTML = '<b>' + dayLong(d.date) + '</b><br>' +
        formatNumber(d.earnCount) + ' บิล · ' + fmtBaht(d.earnBaht) + ' บาท<br>' +
        'แจก ' + formatNumber(d.earnPoints) + ' แต้ม · แลก ' + formatNumber(d.redeemCount) + ' ครั้ง<br>' +
        'สมาชิกใหม่ ' + formatNumber(d.newMembers) + ' คน';
      tip.style.left = (rect.left - outer.left + rect.width / 2) + 'px';
      tip.style.top = (Math.min(bar.top, rect.bottom - 4) - outer.top) + 'px';
      tip.hidden = false;
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; if (hovered) hovered.classList.remove('hover'); });
  }

  function tile(label, value, sub) {
    return '<div class="tile"><div class="tile-label">' + label + '</div><div class="tile-value">' + value + '</div>' +
      (sub ? '<div class="tile-sub">' + sub + '</div>' : '') + '</div>';
  }

  function render(d) {
    const t = d.totals, today = d.today || { earnCount: 0, earnBaht: 0 };
    const tiles =
      tile('ยอดขายที่สะสมแต้ม', fmtBaht(t.earnBaht) + ' ฿', formatNumber(t.earnCount) + ' บิลใน ' + d.days + ' วัน') +
      tile('วันนี้', formatNumber(today.earnCount) + ' บิล', fmtBaht(today.earnBaht) + ' บาท') +
      tile('แต้มที่แจก / ถูกแลก', formatNumber(t.earnPoints) + ' / ' + formatNumber(t.redeemPoints), 'แลกรางวัล ' + formatNumber(t.redeemCount) + ' ครั้ง') +
      tile('สมาชิกทั้งหมด', formatNumber(t.members), 'ใหม่ ' + formatNumber(t.newMembers) + ' · มาใช้ ' + formatNumber(t.activeMembers) + ' คน') +
      tile('แต้มค้างในระบบ', formatNumber(t.outstandingPoints), 'แต้มที่ลูกค้ายังไม่ได้แลก');

    const top = d.topRewards.length
      ? '<table class="table table-sm"><tbody>' + d.topRewards.map((r, i) =>
          '<tr><td>' + (i + 1) + '. ' + escapeHtml(r.name) + '</td><td class="num">' + formatNumber(r.count) + ' ครั้ง</td></tr>').join('') + '</tbody></table>'
      : '<div class="empty">ยังไม่มีการแลกในช่วงนี้</div>';

    const rows = d.series.slice().reverse().map(s =>
      '<tr><td>' + dayLong(s.date) + '</td><td class="num">' + formatNumber(s.earnCount) + '</td><td class="num">' + fmtBaht(s.earnBaht) +
      '</td><td class="num">' + formatNumber(s.earnPoints) + '</td><td class="num">' + formatNumber(s.redeemCount) + '</td><td class="num">' + formatNumber(s.newMembers) + '</td></tr>').join('');

    $('dashBody').innerHTML =
      '<div class="tiles">' + tiles + '</div>' +
      '<div class="dash-grid">' +
        '<div class="card"><div class="chart-title">บิลที่สะสมแต้มรายวัน</div><div class="chart-sub">ชี้ที่แท่งเพื่อดูรายละเอียด</div>' +
          '<div class="chart" id="dailyChart">' + barChart(d.series) + '</div>' +
          '<details class="table-view"><summary>ดูเป็นตาราง</summary><table class="table table-sm"><thead><tr><th>วัน</th><th class="num">บิล</th><th class="num">บาท</th><th class="num">แต้มที่แจก</th><th class="num">แลก</th><th class="num">สมาชิกใหม่</th></tr></thead><tbody>' + rows + '</tbody></table></details>' +
        '</div>' +
        '<div class="card"><div class="chart-title">รางวัลยอดนิยม</div><div class="chart-sub">' + d.days + ' วันล่าสุด</div>' + top + '</div>' +
      '</div>';
    attachTooltip($('dailyChart'), d.series);
  }

  async function load() {
    const seq = ++loadSeq;
    $('dashBody').innerHTML = '<div class="loading">กำลังโหลด…</div>';
    try {
      const d = await App.api('dashboard', { days: days });
      if (seq === loadSeq) render(d);
    } catch (err) {
      if (seq === loadSeq) $('dashBody').innerHTML = '<div class="empty">' + escapeHtml(err.message) + '</div>';
    }
  }

  document.querySelectorAll('#rangeSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
    days = Number(b.dataset.days);
    document.querySelectorAll('#rangeSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    load();
  }));

  App.register('dashboard', { show: load });
})();
