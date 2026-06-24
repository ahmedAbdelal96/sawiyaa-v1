export function slugifyAcademyTitle(title: string): string {
  const normalized = title.trim().toLowerCase().normalize('NFKD');
  const transliterated = normalized
    .split('')
    .map((character) => transliterateAcademyCharacter(character))
    .join('');

  const slug = transliterated
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'academy-course';
}

function transliterateAcademyCharacter(character: string): string {
  const map: Record<string, string> = {
    أ: 'a',
    ء: '',
    ئ: 'y',
    ا: 'a',
    ب: 'b',
    ت: 't',
    ث: 'th',
    ج: 'j',
    ح: 'h',
    خ: 'kh',
    د: 'd',
    ذ: 'dh',
    ر: 'r',
    ز: 'z',
    س: 's',
    ش: 'sh',
    ص: 's',
    ض: 'd',
    ط: 't',
    ظ: 'z',
    ع: 'a',
    غ: 'gh',
    ف: 'f',
    ق: 'q',
    ك: 'k',
    ل: 'l',
    م: 'm',
    ن: 'n',
    ه: 'h',
    و: 'w',
    ي: 'y',
    ى: 'a',
    ة: 'h',
    ؤ: 'w',
    إ: 'i',
    آ: 'a',
    ' ': '-',
    '‌': '',
    '‍': '',
  };

  if (map[character] !== undefined) {
    return map[character];
  }

  return character;
}
