// Nöbet betiklerinin ortak metin yardımcıları.

export function slug(s) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Kaynakta adlar bazen Türkçe karakter olmadan büyük harfle yazılmış ("DENIZ").
 * Türkçe harf içermeyen kelimede I'yı i sayarız ki "Denız" değil "Deniz" olsun.
 */
export function titleCase(s) {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => {
      const lower = /[ŞĞÜÖÇİşğüöçı]/.test(w) ? w.toLocaleLowerCase('tr-TR') : w.replace(/I/g, 'i').toLocaleLowerCase('tr-TR');
      return lower ? lower[0].toLocaleUpperCase('tr-TR') + lower.slice(1) : lower;
    })
    .join(' ');
}

export const decode = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const inTurkey = (lat, lng) => lat > 35.5 && lat < 42.3 && lng > 25.5 && lng < 45;

/** "DENİZ ECZANESİ" / "Deniz" → "Deniz Eczanesi" */
export const pharmacyName = (s) => titleCase(s).replace(/\s*eczanes[iı]$/i, '') + ' Eczanesi';
