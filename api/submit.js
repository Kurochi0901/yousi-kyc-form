// ═══════════════════════════════════════════════════════
//  Vercel Serverless Function — api/submit.js
//  負責驗證請求並轉發到 Google Apps Script
//
//  需在 Vercel 後台設定以下環境變數：
//    GAS_URL          = 您的 Google Apps Script Web App URL
//    GAS_SECRET_TOKEN = 6990b8597ab4ef1824882ba87d8fc32e47b7da36
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
  // ── CORS 設定 ──────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: '不允許的請求方式' });
  }

  // ── 讀取環境變數（安全，不會出現在程式碼中）──
  const GAS_URL          = process.env.GAS_URL;
  const GAS_SECRET_TOKEN = process.env.GAS_SECRET_TOKEN;

  if (!GAS_URL || !GAS_SECRET_TOKEN) {
    console.error('缺少環境變數：GAS_URL 或 GAS_SECRET_TOKEN');
    return res.status(500).json({ status: 'error', message: '伺服器設定錯誤' });
  }

  try {
    const { name, phone, time, id_card, selfie, id_ext, selfie_ext } = req.body;

    // ── 基本資料驗證 ──────────────────────────────
    if (!name || !phone) {
      return res.status(400).json({ status: 'error', message: '姓名與電話為必填' });
    }

    const phoneClean = phone.replace(/[-\s]/g, '');
    if (!/^09\d{8}$/.test(phoneClean)) {
      return res.status(400).json({ status: 'error', message: '電話格式錯誤' });
    }

    if (!id_card || !selfie) {
      return res.status(400).json({ status: 'error', message: '照片不完整' });
    }

    // ── 轉發到 GAS（在後端附上 Token）────────────
    const gasResponse = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token:      GAS_SECRET_TOKEN, // Token 從環境變數來，不會暴露給前端
        name,
        phone,
        time:       time || new Date().toLocaleString('zh-TW'),
        id_card,
        selfie,
        id_ext:     id_ext     || 'jpg',
        selfie_ext: selfie_ext || 'jpg',
      }),
    });

    const result = await gasResponse.json();

    if (result.status === 'ok') {
      return res.status(200).json({ status: 'ok', message: '申請已送出' });
    } else {
      throw new Error(result.message || 'GAS 回應錯誤');
    }

  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ status: 'error', message: '伺服器錯誤，請稍後再試' });
  }
}
