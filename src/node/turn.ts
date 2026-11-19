import { mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Whose turn it is to speak. Every speaker on this machine (a reading, a notification, a test)
 * shares one lock file, so two voices never talk over each other. A notification may ask for
 * priority: an ordinary speaker that holds the lock then gives it up, and ordinary speakers wait
 * until the request is gone.
 */

/** A priority request older than this is ignored: its owner is stuck. */
export const REQUEST_MAX_AGE_MS = 120_000;

const alive = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code !== 'ESRCH'; }
};

export class Turn {
  private readonly lock: string;
  private readonly requests: string;

  constructor(dir: string, private readonly pid = process.pid, private readonly isAlive: (pid: number) => boolean = alive) {
    this.lock = join(dir, 'playing.lock');
    this.requests = join(dir, 'priority');
    mkdirSync(this.requests, { recursive: true });
  }

  /** Ask ordinary speakers to make way. */
  request(): void {
    writeFileSync(join(this.requests, String(this.pid)), '');
  }

  withdraw(): void {
    try { unlinkSync(join(this.requests, String(this.pid))); } catch { /* none was made */ }
  }

  /** True while some other process has a live priority request. Requests of dead processes are cleared. */
  priorityWaiting(now = Date.now()): boolean {
    let waiting = false;
    let names: string[] = [];
    try { names = readdirSync(this.requests); } catch { return false; }
    for (const name of names) {
      const owner = Number(name);
      if (owner === this.pid) continue;
      const file = join(this.requests, name);
      try {
        if (!this.isAlive(owner)) { unlinkSync(file); continue; }
        if (now - statSync(file).mtimeMs <= REQUEST_MAX_AGE_MS) waiting = true;
      } catch { /* withdrawn meanwhile */ }
    }
    return waiting;
  }

  /** Who holds the lock now, if anyone alive does. A lock left by a dead process is cleared. */
  holder(): { pid: number; priority: boolean } | undefined {
    try {
      const [pid, kind] = readFileSync(this.lock, 'utf8').split(' ');
      if (this.isAlive(Number(pid))) return { pid: Number(pid), priority: kind === 'priority' };
      unlinkSync(this.lock);
    } catch { /* no lock, or it went away meanwhile */ }
    return undefined;
  }

  /** True if this process took the lock. An ordinary speaker does not take it while a priority request waits. */
  take(priority: boolean): boolean {
    if (!priority && this.priorityWaiting()) return false;
    try {
      writeFileSync(this.lock, `${this.pid}${priority ? ' priority' : ''}`, { flag: 'wx' });
      return true;
    } catch {
      this.holder(); // clears a dead holder's lock, so the next try can succeed
      return false;
    }
  }

  drop(): void {
    try { if (Number(readFileSync(this.lock, 'utf8').split(' ')[0]) === this.pid) unlinkSync(this.lock); } catch { /* not ours, or gone */ }
  }
}
