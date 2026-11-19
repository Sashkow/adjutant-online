import type { Settings } from './params';
import { RENDER_SAMPLE_RATE, buildChain, tailSeconds } from './graph';

/** Render speech through the effect chain faster than real time. Output is mono at RENDER_SAMPLE_RATE. */
export async function renderOffline(
  samples: Float32Array,
  sampleRate: number,
  settings: Settings,
): Promise<Float32Array> {
  const seconds = samples.length / sampleRate + tailSeconds(settings);
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * RENDER_SAMPLE_RATE), RENDER_SAMPLE_RATE);
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.getChannelData(0).set(samples);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const chain = buildChain(ctx, settings);
  source.connect(chain.input);
  chain.output.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}
