import { describe, expect, it } from 'vitest';
import { resumePlan, returnPhrase, withAlert } from './interrupt';

// Three sentences: 0.6-4, 4-9, 9-13, with an echo tail to 14.
const starts = [0.6, 4, 9];
const total = 14;

describe('resumePlan', () => {
  it('starts the paragraph again when the cut falls in the first sentence', () => {
    expect(resumePlan(starts, total, 2.5)).toEqual({ kind: 'restart' });
  });
  it('starts again when the paragraph has only just begun', () => {
    expect(resumePlan([0.2, 1.2, 5], total, 1.3)).toEqual({ kind: 'restart' });
  });
  it('repeats a later sentence that was cut in its middle', () => {
    expect(resumePlan(starts, total, 6)).toEqual({ kind: 'repeat', from: 4 });
  });
  it('goes on to the next sentence when the cut one was nearly over', () => {
    expect(resumePlan(starts, total, 8.4)).toEqual({ kind: 'continue', from: 9 });
  });
  it('repeats nothing in the last second of the paragraph', () => {
    expect(resumePlan(starts, total, 13.3)).toEqual({ kind: 'done' });
  });
  it('repeats the last sentence when it was cut in its middle', () => {
    expect(resumePlan(starts, total, 10)).toEqual({ kind: 'repeat', from: 9 });
  });
  it('starts a one-sentence paragraph again', () => {
    expect(resumePlan([0.6], 6, 3)).toEqual({ kind: 'restart' });
  });
});

describe('returnPhrase', () => {
  it('names the topic', () => {
    expect(returnPhrase('repeat', 'the countdown', false, 0)).toBe('[[wˌɛɹ wˈʌːz aɪ]]? Oh yes: the countdown.');
    expect(returnPhrase('continue', 'the countdown.', false, 0)).toBe('Continuing with the countdown.');
  });
  it('varies from one interruption to the next', () => {
    expect(returnPhrase('repeat', 'the countdown', false, 1)).not.toBe(returnPhrase('repeat', 'the countdown', false, 0));
    expect(returnPhrase('repeat', undefined, false, 1)).not.toBe(returnPhrase('repeat', undefined, false, 0));
  });
  it('names no topic when the paragraph has none', () => {
    expect(returnPhrase('repeat', undefined, false, 0)).toBe('[[wˌɛɹ wˈʌːz aɪ]]?');
    expect(returnPhrase('continue', '  ', false, 0)).toBe('To continue.');
  });
  it('speaks Ukrainian, in the feminine, for a Ukrainian paragraph', () => {
    expect(returnPhrase('repeat', 'зворотний відлік', true, 0)).toBe('На чому я зупинилась? А, так: зворотний відлік.');
    expect(returnPhrase('continue', undefined, true, 0)).toBe('Продовжую.');
  });
});

describe('withAlert', () => {
  it('opens a message with the alert words', () => {
    expect(withAlert('Task build failed.', false)).toBe('Priority alert! Task build failed.');
    expect(withAlert('Збірка не вдалася.', true).normalize('NFD').replace(/\u0301/g, '')).toBe('Увага! Збірка не вдалася.'.normalize('NFD').replace(/\u0301/g, ''));
  });
  it('does not say them twice', () => {
    expect(withAlert('Priority alert! Task build failed.', false)).toBe('Priority alert! Task build failed.');
    expect(withAlert('Увага, халепа: збірка не вдалася.', true)).toBe('Увага, халепа: збірка не вдалася.');
  });
});
