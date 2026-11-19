/**
 * The paragraph blip for a live voice (Claude Desktop's voice mode): there are no paragraph marks in its sound, so a
 * pause of at least `pauseSec` counts as a paragraph break, and the blip the speaker uses between paragraphs (the
 * same tone, length and level as joinWithGaps) goes into that pause, ending a little before the next words.
 * The stream is delayed by `lookSec` so the blip can be placed before the onset it answers. Mono, sample in = sample out.
 */
const BLIP_HZ = 3044;
const BLIP_SECONDS = 0.11;
const FRAME_SEC = 0.01;
const SPEECH_RMS = 0.01;      // a 10 ms frame above this is speech
const BEFORE_SEC = 0.36;      // silence between the blip and the words: heard as ~0.28 s after the effect, as in the game

export class PauseBlip {
  private readonly frame: number;
  private readonly look: number;
  private readonly blip: Float32Array;
  private queue: Float32Array;          // delayed output, from absolute sample `qStart`
  private qStart: number;
  private inPos = 0;                    // absolute samples received
  private acc = 0;                      // energy of the frame being read
  private accN = 0;
  private quietFrames = 0;
  private heard = false;                // speech since the stream started (the first words get no blip)
  private level = 0;                    // running loudness of the speech

  constructor(private readonly sampleRate: number, private readonly pauseSec = 0.9, private readonly blipLevel = 0.28, lookSec = BEFORE_SEC + BLIP_SECONDS + 0.05) {
    this.frame = Math.round(FRAME_SEC * sampleRate);
    this.look = Math.round(lookSec * sampleRate);
    const n = Math.round(BLIP_SECONDS * sampleRate), edge = 0.004 * sampleRate;
    this.blip = new Float32Array(n);
    for (let j = 0; j < n; j++) this.blip[j] = Math.min(1, j / edge, (n - j) / edge) * Math.sin((2 * Math.PI * BLIP_HZ * j) / sampleRate);
    this.queue = new Float32Array(this.look);   // the delay starts as silence
    this.qStart = -this.look;
  }

  get latency(): number { return this.look / this.sampleRate; }

  push(x: Float32Array): Float32Array {
    const q = new Float32Array(this.queue.length + x.length);
    q.set(this.queue); q.set(x, this.queue.length);
    this.queue = q;
    for (let i = 0; i < x.length; i++) {
      this.acc += x[i] * x[i];
      if (++this.accN < this.frame) continue;
      const rms = Math.sqrt(this.acc / this.accN);
      const frameStart = this.inPos + i + 1 - this.accN;
      this.acc = 0; this.accN = 0;
      if (rms < SPEECH_RMS) { this.quietFrames++; continue; }
      if (this.heard && this.quietFrames * FRAME_SEC >= this.pauseSec) this.place(frameStart);
      this.heard = true;
      this.quietFrames = 0;
      this.level = this.level ? 0.98 * this.level + 0.02 * rms : rms;
    }
    this.inPos += x.length;
    const out = this.queue.slice(0, x.length);           // emit as much as came in: the delay stays `look`
    this.queue = this.queue.slice(x.length);
    this.qStart += x.length;
    return out;
  }

  private place(onset: number): void {
    const level = this.blipLevel * this.level * Math.SQRT2;
    const start = onset - Math.round(BEFORE_SEC * this.sampleRate) - this.blip.length - this.qStart;
    for (let j = 0; j < this.blip.length; j++) {
      const k = start + j;
      if (k >= 0 && k < this.queue.length) this.queue[k] += level * this.blip[j];
    }
  }
}
