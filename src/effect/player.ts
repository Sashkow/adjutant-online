import type { Settings } from './params';
import { RENDER_SAMPLE_RATE, buildChain, tailSeconds, type EffectChain } from './graph';

/** Live playback through the effect chain. One voice at a time. */
export class Player {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private chain: EffectChain | null = null;
  /** Chains whose speech has ended but whose echo and room are still ringing. */
  private tails = new Map<EffectChain, number>();

  /** Must first be called from a user gesture so the browser allows audio. */
  private context(): AudioContext {
    this.ctx ??= new AudioContext({ sampleRate: RENDER_SAMPLE_RATE });
    return this.ctx;
  }

  /** Call synchronously inside a click/key handler, before any await, so audio is allowed later. */
  unlock(): void {
    void this.context().resume();
  }

  get playing(): boolean {
    return this.source !== null;
  }

  async play(
    samples: Float32Array,
    sampleRate: number,
    settings: Settings,
    opts: { loop?: boolean; bypass?: boolean; keepTail?: boolean; onEnded?: () => void } = {},
  ): Promise<void> {
    // keepTail: let the previous utterance's echo ring on under this one.
    if (opts.keepTail) this.stopSource();
    else this.stop();
    const ctx = this.context();
    if (ctx.state === 'suspended') await ctx.resume();

    const buffer = ctx.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop ?? false;

    const chain = buildChain(ctx, settings);
    if (opts.bypass) source.connect(ctx.destination);
    else {
      source.connect(chain.input);
      chain.output.connect(ctx.destination);
    }

    source.onended = () => {
      if (this.source !== source) return;
      // Let the delay tail ring out before tearing the graph down.
      this.source = null;
      this.chain = null;
      this.tails.set(chain, window.setTimeout(() => {
        this.tails.delete(chain);
        chain.dispose();
      }, tailSeconds(settings) * 1000));
      opts.onEnded?.();
    };

    this.source = source;
    this.chain = chain;
    source.start();
  }

  update(settings: Settings): void {
    this.chain?.update(settings);
  }

  stop(): void {
    this.stopSource();
    for (const [chain, timer] of this.tails) {
      window.clearTimeout(timer);
      chain.dispose();
    }
    this.tails.clear();
  }

  private stopSource(): void {
    const { source, chain } = this;
    this.source = null;
    this.chain = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* not started */ }
      source.disconnect();
    }
    chain?.dispose();
  }
}
