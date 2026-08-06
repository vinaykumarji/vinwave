import type { AudioMetadata, AudioSignal } from "@/types/audio";

export const SUPPORTED_EXTENSIONS = ["wav", "mp3", "flac"] as const;
export const FUTURE_EXTENSIONS = ["aac", "ogg"] as const;

export class AudioValidationError extends Error {
  readonly suggestion: string;
  constructor(message: string, suggestion: string) {
    super(message);
    this.name = "AudioValidationError";
    this.suggestion = suggestion;
  }
}

let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

export const extensionOf = (name: string): string =>
  (name.split(".").pop() ?? "").toLowerCase();

export function validateFile(file: File): void {
  const ext = extensionOf(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    throw new AudioValidationError(
      `Unsupported format “.${ext || "unknown"}”`,
      "Version 1.0 accepts WAV, MP3 and FLAC. Convert the file and try again.",
    );
  }
  if (file.size === 0) {
    throw new AudioValidationError("The selected file is empty", "Pick a file that contains audio data.");
  }
  if (file.size > 120 * 1024 * 1024) {
    throw new AudioValidationError(
      "File exceeds the 120 MB analysis limit",
      "Trim the recording or export a shorter segment.",
    );
  }
}

export function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return new Float32Array(buffer.getChannelData(0));
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) out[i] += data[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= buffer.numberOfChannels;
  return out;
}

export function normalizePeak(samples: Float32Array, target = 0.97): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak < 1e-6) return samples;
  const gain = target / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;
  return out;
}

const guessBitDepth = (ext: string): number => (ext === "flac" ? 24 : ext === "mp3" ? 16 : 16);
const encodingLabel = (ext: string): string =>
  ext === "mp3" ? "MPEG-1 Layer III" : ext === "flac" ? "FLAC (lossless)" : "Linear PCM";

export async function decodeFile(file: File, normalize: boolean): Promise<AudioSignal> {
  validateFile(file);
  const arrayBuffer = await file.arrayBuffer();
  let buffer: AudioBuffer;
  try {
    buffer = await getAudioContext().decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw new AudioValidationError(
      "The audio stream could not be decoded",
      "The file may be corrupted or use an unsupported codec profile.",
    );
  }

  const ext = extensionOf(file.name);
  let samples = toMono(buffer);
  if (normalize) samples = normalizePeak(samples);

  const metadata: AudioMetadata = {
    fileName: file.name,
    durationSec: buffer.duration,
    fileSizeBytes: file.size,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    bitDepth: guessBitDepth(ext),
    encoding: encodingLabel(ext),
    lastModified: file.lastModified || Date.now(),
  };

  return {
    id: crypto.randomUUID(),
    kind: "import",
    samples,
    metadata,
    createdAt: Date.now(),
  };
}

/** Synthesised noisy speech-like signal used by the demo workspace. */
export function createDemoSignal(sampleRate = 16000, durationSec = 4): AudioSignal {
  const length = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(length);
  const f0Base = 118;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Three voiced bursts separated by noise-only silence.
    const inSpeech = (t > 0.6 && t < 1.5) || (t > 2.0 && t < 2.8) || (t > 3.1 && t < 3.8);
    let value = 0;
    if (inSpeech) {
      const f0 = f0Base + 12 * Math.sin(2 * Math.PI * 2.2 * t);
      const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t);
      for (let h = 1; h <= 12; h++) {
        const formant = Math.exp(-Math.pow((h * f0 - 700) / 900, 2)) + 0.6 * Math.exp(-Math.pow((h * f0 - 2100) / 1100, 2));
        value += (formant / h) * Math.sin(2 * Math.PI * h * f0 * t);
      }
      value *= 0.28 * envelope;
    }
    // Stationary broadband noise + 50 Hz mains hum.
    const noise = (Math.random() * 2 - 1) * 0.055;
    const hum = 0.012 * Math.sin(2 * Math.PI * 50 * t);
    samples[i] = value + noise + hum;
  }

  return {
    id: crypto.randomUUID(),
    kind: "demo",
    samples,
    metadata: {
      fileName: "demo_noisy_speech.wav",
      durationSec,
      fileSizeBytes: length * 2 + 44,
      sampleRate,
      channels: 1,
      bitDepth: 16,
      encoding: "Linear PCM (synthesised)",
      lastModified: Date.now(),
    },
    createdAt: Date.now(),
  };
}
