import { mkdtempSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REQUEST_MAX_AGE_MS, Turn } from './turn';

function speakers(dead: number[] = []) {
  const dir = mkdtempSync(join(tmpdir(), 'turn-'));
  const isAlive = (pid: number) => !dead.includes(pid);
  return { dir, dead, speaker: (pid: number) => new Turn(dir, pid, isAlive) };
}

describe('Turn', () => {
  it('lets one speaker hold the lock at a time', () => {
    const { speaker } = speakers();
    const a = speaker(1), b = speaker(2);
    expect(a.take(false)).toBe(true);
    expect(b.take(false)).toBe(false);
    a.drop();
    expect(b.take(false)).toBe(true);
  });

  it('makes an ordinary speaker wait while a priority request exists', () => {
    const { speaker } = speakers();
    const reading = speaker(1), notice = speaker(2);
    notice.request();
    expect(reading.priorityWaiting()).toBe(true);
    expect(reading.take(false)).toBe(false);
    expect(notice.take(true)).toBe(true);
    notice.drop();
    notice.withdraw();
    expect(reading.take(false)).toBe(true);
  });

  it('tells a holder that a notification wants the speaker', () => {
    const { speaker } = speakers();
    const reading = speaker(1), notice = speaker(2);
    expect(reading.take(false)).toBe(true);
    expect(reading.priorityWaiting()).toBe(false);
    notice.request();
    expect(reading.priorityWaiting()).toBe(true);
    expect(notice.take(true)).toBe(false); // until the reading lets go
    reading.drop();
    expect(notice.take(true)).toBe(true);
    expect(notice.holder()).toEqual({ pid: 2, priority: true });
  });

  it('queues two notifications behind each other, not behind the reading', () => {
    const { speaker } = speakers();
    const reading = speaker(1), first = speaker(2), second = speaker(3);
    first.request(); second.request();
    expect(first.take(true)).toBe(true);
    expect(second.take(true)).toBe(false);
    first.drop(); first.withdraw();
    expect(reading.take(false)).toBe(false); // the second notification still waits
    expect(second.take(true)).toBe(true);
  });

  it('does not count its own request', () => {
    const { speaker } = speakers();
    const notice = speaker(2);
    notice.request();
    expect(notice.priorityWaiting()).toBe(false);
  });

  it('clears the request and the lock of a dead process', () => {
    const { speaker, dead } = speakers();
    const reading = speaker(1), notice = speaker(2);
    notice.request();
    expect(notice.take(true)).toBe(true);
    dead.push(2);
    expect(reading.priorityWaiting()).toBe(false);
    expect(reading.take(false)).toBe(false); // this try clears the dead lock
    expect(reading.take(false)).toBe(true);
  });

  it('ignores a request that is too old', () => {
    const { dir, speaker } = speakers();
    const reading = speaker(1), notice = speaker(2);
    notice.request();
    const old = new Date(Date.now() - REQUEST_MAX_AGE_MS - 1000);
    utimesSync(join(dir, 'priority', '2'), old, old);
    expect(reading.priorityWaiting()).toBe(false);
  });
});
