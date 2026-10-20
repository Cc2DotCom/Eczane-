// Geçici: e-Devlet formunu gerçek tarayıcıyla doldurup sonucu inceler.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
(async () => {
  fs.mkdirSync('/tmp/probe-files', { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ locale: 'tr-TR' });
  const reqs = [];
  p.on('request', (r) => { if (r.resourceType() === 'xhr' || r.resourceType() === 'fetch') reqs.push(r.method() + ' ' + r.url() + ' ' + (r.postData() || '')); });
  await p.goto('https://www.turkiye.gov.tr/saglik-titck-nobetci-eczane-sorgulama', { waitUntil: 'networkidle' });
  const formHtml = await p.locator('#mainForm').innerHTML();
  fs.writeFileSync('/tmp/probe-files/form.html', formHtml);
  const selects = await p.$$eval('#mainForm select, #mainForm input', (els) => els.map((e) => ({ tag: e.tagName, name: e.name, id: e.id, type: e.type, value: e.value, opts: e.options ? [...e.options].slice(0, 6).map((o) => o.value + '=' + o.text) : null, nopts: e.options?.length })));
  console.log(JSON.stringify(selects, null, 1));
  // İl seç: ilk select'te İstanbul
  const sel = p.locator('#mainForm select').first();
  try {
    await sel.selectOption({ label: 'İSTANBUL' }).catch(() => sel.selectOption({ label: 'İstanbul' }));
  } catch (e) { console.log('il seçilemedi', e.message); }
  await p.waitForTimeout(1500);
  await p.locator('input[name="nobetTarihi"]').first().check();
  await Promise.all([p.waitForLoadState('networkidle'), p.locator('#mainForm input[type=submit]').click()]);
  await p.waitForTimeout(2000);
  console.log('URL after submit', p.url());
  const html = await p.content();
  fs.writeFileSync('/tmp/probe-files/result.html', html);
  const tables = await p.$$eval('table', (ts) => ts.map((t) => t.outerHTML.slice(0, 4000)));
  console.log('TABLES', tables.length);
  console.log(tables.join('\n\n').slice(0, 8000));
  console.log('XHR\n' + reqs.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
