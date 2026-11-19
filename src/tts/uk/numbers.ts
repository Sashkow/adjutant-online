/** Numbers as Ukrainian words: the voice model knows letters only, so digits must be spelled out. */

const ONES = ['нуль', 'один', 'два', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять", 'десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', "п'ятнадцять", 'шістнадцять', 'сімнадцять', 'вісімнадцять', "дев'ятнадцять"];
const TENS = ['', '', 'двадцять', 'тридцять', 'сорок', "п'ятдесят", 'шістдесят', 'сімдесят', 'вісімдесят', "дев'яносто"];
const HUNDREDS = ['', 'сто', 'двісті', 'триста', 'чотириста', "п'ятсот", 'шістсот', 'сімсот', 'вісімсот', "дев'ятсот"];
/** Thousand is feminine ("одна тисяча", "дві тисячі"); million and milliard are masculine. */
const GROUPS: Array<[string, string, string, boolean]> = [
  ['тисяча', 'тисячі', 'тисяч', true],
  ['мільйон', 'мільйони', 'мільйонів', false],
  ['мільярд', 'мільярди', 'мільярдів', false],
];

function belowThousand(n: number, feminine: boolean): string[] {
  const out: string[] = [];
  if (n >= 100) out.push(HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest >= 20) {
    out.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10) out.push(feminine && rest % 10 === 1 ? 'одна' : feminine && rest % 10 === 2 ? 'дві' : ONES[rest % 10]);
  } else if (rest > 0) {
    out.push(feminine && rest === 1 ? 'одна' : feminine && rest === 2 ? 'дві' : ONES[rest]);
  }
  return out;
}

/** A whole number from 0 up to 999 999 999 999 in words; longer ones are read digit by digit. */
export function numberWords(digits: string): string {
  if (digits.length > 12 || (digits.length > 1 && digits.startsWith('0'))) return [...digits].map((d) => ONES[Number(d)]).join(' ');
  const n = Number(digits);
  if (n === 0) return ONES[0];
  const out: string[] = [];
  const parts = [n % 1000, Math.floor(n / 1e3) % 1000, Math.floor(n / 1e6) % 1000, Math.floor(n / 1e9) % 1000];
  for (let g = 3; g >= 1; g--) {
    const v = parts[g];
    if (!v) continue;
    const [one, few, many, feminine] = GROUPS[g - 1];
    const last = v % 10;
    const teen = v % 100 >= 11 && v % 100 <= 14;
    out.push(...belowThousand(v, feminine), teen ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many);
  }
  out.push(...belowThousand(parts[0], false));
  return out.join(' ');
}

/** Every number in a Ukrainian text spelled out: "3.5" as "три кома п'ять", "0.1.11" with "крапка" between the parts. */
export function spellNumbers(text: string): string {
  return text.replace(/\d+(?:[.,]\d+)*/g, (found) => {
    const parts = found.split(/[.,]/);
    const joiner = parts.length === 2 ? ' кома ' : ' крапка ';
    return parts.map(numberWords).join(joiner);
  });
}
