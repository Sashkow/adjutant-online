import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { numberWords, spellNumbers } from './numbers';
import { isUkrainian, languageRuns, modelLetters } from './runs';
import { markStress, openStress, unpackStress } from './stress';

const file = readFileSync(new URL('./uk-stress.bin.gz', import.meta.url));
const dict = openStress(await unpackStress(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer));

describe('Ukrainian stress', () => {
  it('finds the stressed vowel of known word forms', () => {
    expect(dict.stressedVowel('доступ')).toBe(0);
    expect(dict.stressedVowel('виявлено')).toBe(0);
    expect(dict.stressedVowel('недостатньо')).toBe(2);
    expect(dict.stressedVowel('абракадабрище')).toBe(-1);
  });

  it('marks every known word and leaves the rest alone', () => {
    expect(markStress('Несанкціонований доступ виявлено.', dict)).toBe('Несанкціоно́ваний до́ступ ви́явлено.');
    expect(markStress('Звіт git готовий, 5 тестів.', dict)).toBe('Звіт git гото́вий, 5 те́стів.');
  });

  it('prefers the common reading of a word with two possible stresses', () => {
    expect(markStress("Є зв'язок. Кінець зв'язку.", dict)).toBe("Є зв'язо́к. Кіне́ць зв'язку́.");
    expect(markStress('Вони прийшли.', dict)).toBe('Вони́ прийшли́.');
  });

  it('keeps a stress mark that the text already has', () => {
    expect(markStress('замо́к', dict)).toBe('замо́к');
    expect(markStress('Ти бу́деш там?', dict)).toBe('Ти бу́деш там?');
  });

  it('uses Western stress for the forms of "бути" that the listener confirmed', () => {
    expect(markStress('Ти будеш там?', dict)).toBe('Ти буде́ш там?');
    expect(markStress('Ми будемо там, а ви будете?', dict)).toBe('Ми буде́мо там, а ви буде́те?');
    expect(markStress('Будеш?', dict)).toBe('Буде́ш?');
  });

  it('keeps standard stress for the forms of "бути" that are not in the Western table', () => {
    expect(markStress('Я буду вдома.', dict)).toBe('Я бу́ду вдо́ма.');
    expect(markStress('Завтра буде дощ.', dict)).toBe('За́втра бу́де дощ.');
    expect(markStress('Діти будуть раді.', dict)).toBe('Ді́ти бу́дуть ра́ді.');
  });
});

describe('Ukrainian numbers', () => {
  it('spells whole numbers', () => {
    expect(numberWords('0')).toBe('нуль');
    expect(numberWords('42')).toBe('сорок два');
    expect(numberWords('2001')).toBe('дві тисячі один');
    expect(numberWords('21000')).toBe('двадцять одна тисяча');
    expect(numberWords('5000000')).toBe("п'ять мільйонів");
  });

  it('spells decimals and versions inside a text', () => {
    expect(spellNumbers('Версія 0.1.11, це 3,5 хвилини')).toBe("Версія нуль крапка один крапка одинадцять, це три кома п'ять хвилини");
  });
});

describe('language runs', () => {
  it('tells Ukrainian sentences from English ones', () => {
    expect(isUkrainian('Тести пройдено.')).toBe(true);
    expect(isUkrainian('All 42 tests pass.')).toBe(false);
  });

  it('gives Latin words to the English voice and the rest to the Ukrainian one', () => {
    expect(languageRuns('Я оновив файл say.js і запустив npm run build, 3 помилки.')).toEqual([
      { lang: 'uk', text: 'Я оновив файл' },
      { lang: 'en', text: 'say.js' },
      { lang: 'uk', text: 'і запустив' },
      { lang: 'en', text: 'npm run build,' },
      { lang: 'uk', text: '3 помилки.' },
    ]);
  });

  it('prepares letters for the model', () => {
    expect(modelLetters('Їжак — 50% «успіху»')).toBe('ї'.normalize('NFD') + 'жак — 50 відсотків успіху');
  });
});
