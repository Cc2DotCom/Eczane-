// Geçici: e-Devlet TİTCK nöbetçi eczane formunun adımlarını keşfetmek için.
const BASE = 'https://www.turkiye.gov.tr/saglik-titck-nobetci-eczane-sorgulama';
const jar = new Map();
async function req(url, body) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    redirect: 'manual',
    headers: {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
      'accept-language': 'tr-TR,tr',
      cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded', referer: BASE } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    jar.set(kv.slice(0, i), kv.slice(i + 1));
  }
  if (res.status >= 300 && res.status < 400) {
    const loc = new URL(res.headers.get('location'), url).toString();
    console.log('redirect ->', loc);
    return req(loc);
  }
  return { status: res.status, html: await res.text(), url };
}
function dump(label, html) {
  console.log(`\n######## ${label} len=${html.length}`);
  const m = html.match(/<form[^>]*id="mainForm"[\s\S]*?<\/form>/);
  const area = m ? m[0] : html.slice(html.indexOf('pageContentBlock'), html.indexOf('pageContentBlock') + 8000);
  console.log(area.replace(/<script[\s\S]*?<\/script>/g, '').replace(/\s{2,}/g, ' ').slice(0, 7000));
  const tbl = html.match(/<table[\s\S]*?<\/table>/);
  if (tbl) console.log('\n--- TABLE ---\n' + tbl[0].replace(/\s{2,}/g, ' ').slice(0, 6000));
  const err = html.match(/class="[^"]*(errorMessage|fieldError|warningContainer)[^"]*"[\s\S]{0,400}/);
  if (err) console.log('\n--- ERROR ---\n' + err[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}
const token = (h) => h.match(/name="token" value="([^"]+)"/)?.[1];

let p = await req(BASE);
dump('step0', p.html);
const date = p.html.match(/name="nobetTarihi" value="([^"]+)"/)?.[1];
p = await req(BASE + '?submit', { nobetTarihi: date, token: token(p.html), btn: 'Sorgula' });
dump('step1 (tarih=' + date + ')', p.html);
// İl seçimi varsa ilk seçenekleri göster ve İstanbul'u dene
const selects = [...p.html.matchAll(/<select[^>]*name="([^"]+)"[\s\S]*?<\/select>/g)];
for (const s of selects) console.log('SELECT', s[1], (s[0].match(/<option/g) || []).length, 'options:', s[0].slice(0, 600).replace(/\s+/g, ' '));
