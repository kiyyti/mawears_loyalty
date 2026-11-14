// หน้าของรางวัล (แอดมิน): เพิ่ม แก้ไข เปิด/ปิด
(function () {
  let rewards = [];

  async function load() {
    $('rewardRows').innerHTML = '<tr><td colspan="5" class="loading">กำลังโหลด…</td></tr>';
    try {
      rewards = (await App.api('rewardsAll')).rewards;
      render();
    } catch (err) {
      $('rewardRows').innerHTML = '<tr><td colspan="5" class="empty">' + escapeHtml(err.message) + '</td></tr>';
    }
  }

  function render() {
    $('rewardRows').innerHTML = rewards.length ? rewards.map(r =>
      '<tr>' +
        '<td class="mono">' + escapeHtml(r.rewardId) + '</td>' +
        '<td>' + escapeHtml(r.name) + '</td>' +
        '<td class="num"><b>' + formatNumber(r.pointsCost) + '</b></td>' +
        '<td><span class="pill ' + (r.active ? 'pill-on">เปิดอยู่' : 'pill-off">ปิดอยู่') + '</span></td>' +
        '<td class="num">' +
          '<button class="link" data-toggle="' + escapeHtml(r.rewardId) + '">' + (r.active ? 'ปิด' : 'เปิด') + '</button>' +
          ' &nbsp;·&nbsp; <button class="link" data-edit="' + escapeHtml(r.rewardId) + '">แก้ไข</button>' +
        '</td></tr>').join('')
      : '<tr><td colspan="5" class="empty">ยังไม่มีของรางวัล กด "+ เพิ่มรางวัล"</td></tr>';
  }

  function openForm(r) {
    $('rwTitle').textContent = r ? 'แก้ไข ' + r.rewardId : 'เพิ่มรางวัล';
    $('rwId').value = r ? r.rewardId : '';
    $('rwName').value = r ? r.name : '';
    $('rwCost').value = r ? r.pointsCost : '';
    $('rwImage').value = r ? r.imageUrl : '';
    $('rwActive').checked = r ? r.active : true;
    $('rwError').textContent = '';
    $('rewardDialog').showModal();
    $('rwName').focus();
  }

  async function save(reward) {
    const r = await App.api('saveReward', { reward: reward });
    const i = rewards.findIndex(x => x.rewardId === r.reward.rewardId);
    if (i >= 0) rewards[i] = r.reward; else rewards.push(r.reward);
    rewards.sort((a, b) => a.pointsCost - b.pointsCost);
    render();
    // ให้หน้าเคาน์เตอร์เห็นรายการล่าสุดด้วย
    App.info.rewards = rewards.filter(x => x.active);
    if (App.views.counter.refreshRewards) App.views.counter.refreshRewards();
    return r.reward;
  }

  $('addRewardBtn').addEventListener('click', () => openForm(null));

  $('rewardRows').addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]');
    const toggle = e.target.closest('[data-toggle]');
    if (edit) openForm(rewards.find(r => r.rewardId === edit.dataset.edit));
    if (toggle) {
      const r = rewards.find(x => x.rewardId === toggle.dataset.toggle);
      toggle.disabled = true;
      try {
        await save(Object.assign({}, r, { active: !r.active }));
        App.toast((r.active ? 'ปิด ' : 'เปิด ') + r.name + ' แล้ว');
      } catch (err) {
        App.toast(err.message, true);
        toggle.disabled = false;
      }
    }
  });

  $('rewardForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) btn.disabled = true;
    $('rwError').textContent = '';
    try {
      const saved = await save({
        rewardId: $('rwId').value || undefined,
        name: $('rwName').value.trim(),
        pointsCost: Number($('rwCost').value),
        imageUrl: $('rwImage').value.trim(),
        active: $('rwActive').checked,
      });
      $('rewardDialog').close();
      App.toast('บันทึก ' + saved.name + ' แล้ว');
    } catch (err) {
      $('rwError').textContent = err.message;
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  App.register('rewards', { show: load });
})();
