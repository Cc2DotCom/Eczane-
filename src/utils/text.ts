export function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

export function titleCaseTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .split(/\s+/)
    .map((w) => (w ? w[0].toLocaleUpperCase('tr-TR') + w.slice(1) : w))
    .join(' ');
}
