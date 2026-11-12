import { describe, expect, it } from 'vitest';
import {
  MAX_RECORDING_BYTES,
  MAX_RECORDING_SECONDS,
  MIN_RECORDING_SECONDS,
  clampTrimRange,
  encodeWav,
  extensionForMimeType,
  isAllowedAudioExtension,
  sliceChannelData,
} from '@/lib/audio-trim';

const SAMPLE_RATE = 1000;

function ramp(length: number, start = 0): Float32Array {
  return Float32Array.from({ length }, (_, i) => start + i);
}

/** jsdom's Blob has no arrayBuffer(), so read it through FileReader. */
function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('audio-trim', () => {
  it('slices the requested sample range (start/index from seconds)', () => {
    const data = ramp(1000);
    const slice = sliceChannelData(data, SAMPLE_RATE, 0.1, 0.25);
    expect(slice.length).toBe(150);
    expect(slice[0]).toBe(100);
    expect(slice[slice.length - 1]).toBe(249);
  });

  it('clamps slices to the available samples', () => {
    const data = ramp(100);
    expect(sliceChannelData(data, SAMPLE_RATE, -5, 0.05).length).toBe(50);
    expect(sliceChannelData(data, SAMPLE_RATE, 0.05, 99).length).toBe(50);
    expect(sliceChannelData(data, SAMPLE_RATE, 0.5, 0.5).length).toBe(0);
  });

  it('clamps a trim range to the clip and swaps reversed input', () => {
    expect(clampTrimRange(-1, 99, 6)).toEqual({ start: 0, end: 6 });
    expect(clampTrimRange(4, 2, 6)).toEqual({ start: 2, end: 4 });
  });

  it('enforces a minimum trim gap so a clip cannot be emptied', () => {
    const range = clampTrimRange(5, 5, 6, 0.5);
    expect(range.end - range.start).toBeCloseTo(0.5, 5);
    expect(range).toEqual({ start: 5, end: 5.5 });

    const atEnd = clampTrimRange(6, 6, 6, 0.5);
    expect(atEnd.end - atEnd.start).toBeCloseTo(0.5, 5);
    expect(atEnd.end).toBeLessThanOrEqual(6);
  });

  it('encodes a valid 16-bit PCM WAV header and payload', async () => {
    const blob = encodeWav([Float32Array.from([0, 0.5, -0.5, 1, -1])], SAMPLE_RATE);
    expect(blob.type).toBe('audio/wav');

    const buffer = await readBlob(blob);
    const view = new DataView(buffer);
    const text = (offset: number, length: number) =>
      Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join('');

    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(text(12, 4)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(SAMPLE_RATE);
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(buffer.byteLength).toBe(44 + 5 * 2);
  });

  it('encodes stereo WAV with interleaved channels', async () => {
    const blob = encodeWav([Float32Array.from([0, 0]), Float32Array.from([1, 1])], SAMPLE_RATE);
    const buffer = await readBlob(blob);
    const view = new DataView(buffer);
    expect(view.getUint16(22, true)).toBe(2);
    expect(buffer.byteLength).toBe(44 + 2 * 2 * 2);
  });

  it('validates audio extensions and infers them from MIME types', () => {
    for (const ext of ['mp3', 'm4a', 'webm', 'wav', 'ogg']) {
      expect(isAllowedAudioExtension(ext)).toBe(true);
      expect(isAllowedAudioExtension(ext.toUpperCase())).toBe(true);
    }
    expect(isAllowedAudioExtension('exe')).toBe(false);
    expect(isAllowedAudioExtension(null)).toBe(false);

    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/mpeg')).toBe('mp3');
    expect(extensionForMimeType('audio/wav')).toBe('wav');
    expect(extensionForMimeType('application/octet-stream', 'ogg')).toBe('ogg');
  });

  it('keeps the size/seconds limits consistent with the studio hints', () => {
    expect(MIN_RECORDING_SECONDS).toBe(1);
    expect(MAX_RECORDING_SECONDS).toBe(600);
    expect(MAX_RECORDING_BYTES).toBe(25 * 1024 * 1024);
  });
});
