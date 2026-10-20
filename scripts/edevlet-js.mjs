// Geçici: edv-address bileşeninin hangi alanları ve uç noktaları kullandığını bulur.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const page = await (await fetch('https://www.turkiye.gov.tr/saglik-titck-nobetci-eczane-sorgulama', { headers: { 'user-agent': UA } })).text();
const srcs = [...page.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => new URL(m[1], 'https://www.turkiye.gov.tr').toString());
console.log('SCRIPTS', srcs.join('\n'));
const inline = [...page.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
console.log('INLINE', inline.slice(0, 1500));
for (const s of srcs) {
  const js = await (await fetch(s, { headers: { 'user-agent': UA } })).text();
  const i = js.indexOf('edv-address');
  if (i < 0) continue;
  console.log('\n==== ', s, js.length);
  for (const re of [/["'`][^"'`]*(ajax|adres|address|ilce|ilkod|il_kod|getIl|getIlce)[^"'`]*["'`]/gi]) {
    const hits = [...new Set((js.match(re) || []))].slice(0, 80);
    console.log(hits.join('\n'));
  }
  console.log('--- around edv-address ---');
  console.log(js.slice(Math.max(0, i - 500), i + 3000));
}
