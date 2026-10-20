// Geçici: aday kaynakların yapısını görmek için sayfaları indirip özetler.
const urls = process.argv.slice(2);
for (const url of urls) {
  console.log('\n=================', url);
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (nobetci-app probe)', 'accept-language': 'tr-TR' } });
    const html = await res.text();
    console.log('status', res.status, 'len', html.length, 'type', res.headers.get('content-type'));
    const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const idx = body.search(/eczanesi/i);
    console.log('--- html around first "eczanesi" ---');
    console.log(body.slice(Math.max(0, idx - 1500), idx + 3500).replace(/\n\s*\n/g, '\n'));
    const maps = html.match(/(maps\.google|google\.com\/maps|lat[a-z]*["'=:\s]+\d{2}\.\d+|data-lat|LatLng)[^"'<]{0,120}/gi) || [];
    console.log('--- map/coord hints (' + maps.length + ') ---');
    console.log(maps.slice(0, 8).join('\n'));
    const forms = html.match(/<(form|select|input)[^>]{0,200}>/gi) || [];
    console.log('--- forms (' + forms.length + ') ---');
    console.log(forms.slice(0, 15).join('\n'));
  } catch (e) {
    console.log('ERROR', e.message);
  }
}
