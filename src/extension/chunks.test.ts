import { describe, expect, it } from 'vitest';
import { chunkText, cleanSelection } from './chunks';

describe('cleanSelection', () => {
  it('ends unpunctuated lines so headings are read as their own sentence', () => {
    expect(cleanSelection('Status report\nAll units ready.\n\n  \n- item one')).toBe('Status report.\nAll units ready.\n- item one.');
  });
  it('replaces addresses and drops footnote markers', () => {
    expect(cleanSelection('See https://example.org/a?b=1 now[12].')).toBe('See link now.');
  });
});

const texts = (raw: string, max?: number) => chunkText(raw, max).map((c) => c.text);

describe('chunkText', () => {
  it('returns nothing for text with no words', () => {
    expect(chunkText('  \n ... ')).toEqual([]);
  });
  it('speaks the first sentence alone, a short second piece, then groups the rest', () => {
    expect(texts('One. Two. Three. Four. Five.', 20)).toEqual(['One.', 'Two.', 'Three. Four. Five.']);
  });
  it('keeps every piece within the limit and loses no words', () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here, with a clause.`).join(' ');
    const chunks = texts(text, 120);
    expect(chunks.every((c) => c.length <= 120)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });
  it('breaks a sentence longer than the limit', () => {
    const long = `${'word '.repeat(100).trim()}.`;
    const chunks = texts(long, 80);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 80)).toBe(true);
    expect(chunks.join(' ')).toBe(long);
  });
  it('remembers where paragraphs begin, between pieces and inside one', () => {
    expect(chunkText('Title\nOne. Two.\nThree. Four.', 200)).toEqual([
      { text: 'Title.', startsParagraph: false },
      { text: 'One. Two.\nThree. Four.', startsParagraph: true },
    ]);
  });
});
