import { describe, expect, it } from 'vitest';
import { decodeWav, encodeWav } from './wav';

describe('encodeWav', () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]);
  const wav = encodeWav(samples, 48000);
  const v = new DataView(wav);
  const tag = (o: number) => String.fromCharCode(...new Uint8Array(wav, o, 4));

  it('writes a canonical 16-bit mono PCM header', () => {
    expect(wav.byteLength).toBe(44 + samples.length * 2);
    expect(tag(0)).toBe('RIFF');
    expect(v.getUint32(4, true)).toBe(wav.byteLength - 8);
    expect(tag(8)).toBe('WAVE');
    expect(tag(12)).toBe('fmt ');
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(48000);
    expect(v.getUint32(28, true)).toBe(96000);
    expect(v.getUint16(32, true)).toBe(2);
    expect(v.getUint16(34, true)).toBe(16);
    expect(tag(36)).toBe('data');
    expect(v.getUint32(40, true)).toBe(samples.length * 2);
  });

  it('scales samples (half rounds up) and clips out-of-range values', () => {
    const at = (i: number) => v.getInt16(44 + i * 2, true);
    expect([at(0), at(1), at(2), at(3), at(4), at(5), at(6)]).toEqual([0, 16384, -16383, 32767, -32767, 32767, -32767]);
  });
});

describe('decodeWav', () => {
  it('round-trips encodeWav', () => {
    const src = new Float32Array([0, 0.25, -0.25, 0.9]);
    const { samples, sampleRate } = decodeWav(encodeWav(src, 22050));
    expect(sampleRate).toBe(22050);
    expect(samples.length).toBe(4);
    src.forEach((s, i) => expect(samples[i]).toBeCloseTo(s, 3));
  });

  it('rejects data that is not WAV', () => {
    expect(() => decodeWav(new ArrayBuffer(64))).toThrow(/Not a WAV/);
  });
});
