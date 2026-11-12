/**
 * Small, dependency-free audio helpers used by the recording studio to trim a
 * recording (start/end) entirely in the browser. No server round-trip and no
 * ffmpeg — we decode with the Web Audio API, slice the samples and re-encode WAV.
 *
 * The functions here are pure so they can be unit-tested without a browser.
 */

/** Extract [startSec, endSec) from one channel's samples. */
export function sliceChannelData(
  data: Float32Array,
  sampleRate: number,
  startSec: number,
  endSec: number
): Float32Array {
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  const end = Math.min(data.length, Math.ceil(endSec * sampleRate));
  if (end <= start) return new Float32Array(0);
  return data.slice(start, end);
}

/** Clamp a requested trim range to the clip length (seconds). */
export function clampTrimRange(
  startSec: number,
  endSec: number,
  durationSec: number,
  minGapSec = 0.5
): { start: number; end: number } {
  const safeDuration = Math.max(0, durationSec);
  let start = Math.min(Math.max(0, startSec), safeDuration);
  let end = Math.min(Math.max(0, endSec), safeDuration);
  if (end < start) [start, end] = [end, start];
  if (end - start < minGapSec) {
    end = Math.min(safeDuration, start + minGapSec);
    if (end - start < minGapSec) start = Math.max(0, end - minGapSec);
  }
  return { start, end };
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Encode raw PCM channels into a 16-bit WAV Blob. 16-bit PCM is universally
 * playable in browsers and accepted by our upload endpoint.
 */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const channelCount = Math.max(1, channels.length);
  const frameCount = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Shortest recording we accept (seconds) — avoids accidental empty uploads. */
export const MIN_RECORDING_SECONDS = 1;
/** Longest recording we accept (seconds). */
export const MAX_RECORDING_SECONDS = 600;
/** Max upload size in bytes (matches the studio hint text). */
export const MAX_RECORDING_BYTES = 25 * 1024 * 1024;

const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'mp4', 'ogg', 'oga', 'webm', 'wav', 'aac', 'mpga'];

export function isAllowedAudioExtension(ext?: string | null): boolean {
  return Boolean(ext && AUDIO_EXTENSIONS.includes(ext.toLowerCase()));
}

export function extensionForMimeType(mimeType: string, fallback = 'webm'): string {
  const type = (mimeType || '').toLowerCase();
  if (type.includes('wav')) return 'wav';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  // Check the container before the codec: 'audio/webm;codecs=opus' is a webm file.
  if (type.includes('webm')) return 'webm';
  if (type.includes('ogg') || type.includes('opus')) return 'ogg';
  return fallback;
}
