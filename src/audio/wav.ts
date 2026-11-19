/** Encode mono float samples as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const out = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(out);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) v.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return out;
}

/** Decode a PCM16 or float32 WAV file; multi-channel input keeps the first channel only. */
export function decodeWav(data: ArrayBuffer): { samples: Float32Array; sampleRate: number } {
  const v = new DataView(data);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (data.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');

  let format = 0, channels = 0, sampleRate = 0, bits = 0;
  let offset = 12;
  while (offset + 8 <= data.byteLength) {
    const id = tag(offset);
    const size = v.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = v.getUint16(body, true);
      channels = v.getUint16(body + 2, true);
      sampleRate = v.getUint32(body + 4, true);
      bits = v.getUint16(body + 14, true);
    } else if (id === 'data') {
      if (!channels) throw new Error('WAV data chunk before format chunk');
      const bytes = bits / 8;
      const frames = Math.floor(Math.min(size, data.byteLength - body) / (bytes * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        const at = body + i * bytes * channels;
        if (format === 1 && bits === 16) samples[i] = v.getInt16(at, true) / 32768;
        else if (format === 3 && bits === 32) samples[i] = v.getFloat32(at, true);
        else throw new Error(`Unsupported WAV encoding (format ${format}, ${bits}-bit)`);
      }
      return { samples, sampleRate };
    }
    offset = body + size + (size % 2);
  }
  throw new Error('WAV file has no data chunk');
}
