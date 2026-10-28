import { MAX_FILE_BYTES, SR } from "./constants";

export type DecodeStage = "read" | "decode" | "downmix";

/**
 * Decode a video file's audio track to 16 kHz mono PCM — entirely in the
 * browser via the Web Audio API (no upload, no ffmpeg).
 *
 * Primary path: decode directly in a 16 kHz AudioContext (decodes the MP4's
 * audio track natively and resamples during decode).
 * Fallback: decode at the default rate and downmix/resample through an
 * OfflineAudioContext (older Safari).
 */
export async function decodeMono16k(
  file: File,
  onStage: (stage: DecodeStage) => void,
): Promise<Float32Array> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Datei ist zu groß (max. ~2 GB im Browser).");
  }

  onStage("read");
  const buffer = await file.arrayBuffer();

  onStage("decode");
  let audio: AudioBuffer;
  try {
    const ctx = new AudioContext({ sampleRate: SR });
    try {
      audio = await ctx.decodeAudioData(buffer);
    } finally {
      void ctx.close();
    }
  } catch {
    const ctx = new AudioContext();
    try {
      audio = await ctx.decodeAudioData(buffer);
    } finally {
      void ctx.close();
    }
  }

  if (audio.sampleRate === SR && audio.numberOfChannels === 1) {
    return audio.getChannelData(0).slice();
  }

  onStage("downmix");
  const length = Math.ceil(audio.duration * SR);
  const offline = new OfflineAudioContext(1, length, SR);
  const src = offline.createBufferSource();
  src.buffer = audio;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}
