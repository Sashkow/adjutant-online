import { pitchShift } from './psola';

/**
 * Formant-preserving pitch shift (the speaker's PSOLA) on a stream, for the live effect: the input is cut into
 * overlapping pieces, each shifted with some context on both sides, and the pieces are cross-faded where they meet.
 * Output lags input by hop + fade + pad (about 0.55 s at the defaults). Silence passes through unshifted.
 */
export class StreamShifter {
  private readonly hop: number;
  private readonly fade: number;
  private readonly pad: number;
  private buf = new Float32Array(0);   // input from absolute sample `bufStart`
  private bufStart = 0;
  private next = 0;                    // absolute start of the next output piece
  private tail = new Float32Array(0);  // the previous piece's overlap, faded out under the next one

  constructor(
    private readonly sampleRate: number,
    private readonly ratio: number,
    private readonly size = 1,
    hopSec = 0.4, fadeSec = 0.05, padSec = 0.1,
  ) {
    this.hop = Math.round(hopSec * sampleRate);
    this.fade = Math.round(fadeSec * sampleRate);
    this.pad = Math.round(padSec * sampleRate);
  }

  /** Seconds the output lags the input. */
  get latency(): number { return (this.hop + this.fade + this.pad) / this.sampleRate; }

  /** Feed samples; returns the output that is ready (possibly empty). */
  push(x: Float32Array): Float32Array {
    const joined = new Float32Array(this.buf.length + x.length);
    joined.set(this.buf); joined.set(x, this.buf.length);
    this.buf = joined;
    const out: Float32Array[] = [];
    const { hop, fade, pad } = this;
    while (this.bufStart + this.buf.length >= this.next + hop + fade + pad) {
      const from = this.next - pad, len = pad + hop + fade + pad;
      const seg = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const j = from + i - this.bufStart;
        seg[i] = j >= 0 && j < this.buf.length ? this.buf[j] : 0;
      }
      let peak = 0;
      for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(seg[i]));
      const y = peak > 0.003 ? pitchShift(seg, this.sampleRate, this.ratio, this.size) : seg;
      const core = y.slice(pad, pad + hop + fade);
      for (let i = 0; i < this.tail.length; i++) {
        const t = (i + 0.5) / this.tail.length;
        core[i] = this.tail[i] * (1 - t) + core[i] * t;
      }
      out.push(core.slice(0, hop));
      this.tail = core.slice(hop, hop + fade);
      this.next += hop;
      const drop = this.next - pad - this.bufStart;          // keep only what later pieces still read
      if (drop > 0) { this.buf = this.buf.slice(drop); this.bufStart += drop; }
    }
    if (out.length === 1) return out[0];
    const n = out.reduce((a, o) => a + o.length, 0), r = new Float32Array(n);
    let k = 0;
    for (const o of out) { r.set(o, k); k += o.length; }
    return r;
  }
}
