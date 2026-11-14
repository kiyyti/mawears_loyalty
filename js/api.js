// เรียก API บน Apps Script
// ใช้ Content-Type: text/plain เพื่อไม่ให้เบราว์เซอร์ส่ง CORS preflight (Apps Script ตอบ OPTIONS ไม่ได้)
async function callApi(action, data) {
  let res;
  try {
    res = await fetch(window.APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, data || {})),
    });
  } catch (err) {
    const e = new Error('เชื่อมต่อระบบไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
    e.code = 'NETWORK';
    throw e;
  }
  let json;
  try {
    json = await res.json();
  } catch (err) {
    const e = new Error('ระบบตอบกลับผิดรูปแบบ ตรวจ API_URL ใน config.js');
    e.code = 'BAD_RESPONSE';
    throw e;
  }
  if (!json.ok) {
    const e = new Error(json.message || json.error);
    e.code = json.error;
    throw e;
  }
  return json;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('th-TH');
}
