/** Core domain types for VinWave Studio. */

export type AudioSourceKind = "import" | "record" | "demo" | "processed";

export interface AudioMetadata {
  fileName: string;
  durationSec: number;
  fileSizeBytes: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  encoding: string;
  lastModified: number;
}

/** A mono analysis-ready audio signal plus its provenance. */
export interface AudioSignal {
  id: string;
  kind: AudioSourceKind;
  samples: Float32Array;
  metadata: AudioMetadata;
  createdAt: number;
}

export interface SignalStatistics {
  peakAmplitude: number;
  rms: number;
  crestFactorDb: number;
  zeroCrossingRate: number;
  dcOffset: number;
  estimatedNoiseFloorDb: number;
  estimatedSnrDb: number;
}

export type WindowType = "hann" | "hamming" | "blackman" | "rectangular";

export type AlgorithmId = "spectral-subtraction" | "wiener" | "vad" | "mmse";

export interface SpectralSubtractionParams {
  fftSize: number;
  overlap: number;
  windowType: WindowType;
  noiseEstimateMs: number;
  reductionStrength: number;
  spectralFloor: number;
}

export interface WienerParams {
  fftSize: number;
  overlap: number;
  windowType: WindowType;
  noiseEstimateMs: number;
  smoothing: number;
  noiseVarianceScale: number;
}

export interface VadParams {
  frameMs: number;
  energyThresholdDb: number;
  zcrThreshold: number;
  hangoverFrames: number;
}

export type AlgorithmParams = SpectralSubtractionParams | WienerParams | VadParams;

export interface VadSegment {
  startSec: number;
  endSec: number;
  speech: boolean;
}

export interface QualityMetrics {
  inputSnrDb: number;
  outputSnrDb: number;
  snrImprovementDb: number;
  processingTimeMs: number;
  noiseReductionDb: number;
  speechRatio: number;
}

export interface ProcessingRun {
  id: string;
  algorithm: AlgorithmId;
  algorithmLabel: string;
  params: Record<string, number | string>;
  sourceSignalId: string;
  resultSignalId: string;
  metrics: QualityMetrics;
  vadSegments?: VadSegment[];
  createdAt: number;
}

export interface ExportRecord {
  id: string;
  fileName: string;
  format: "wav" | "mp3";
  destination: string;
  sizeBytes: number;
  sourceLabel: string;
  createdAt: number;
}

export type ProcessingStageStatus = "pending" | "active" | "done" | "error" | "cancelled";

export interface ProcessingStage {
  label: string;
  status: ProcessingStageStatus;
  detail?: string;
}

export interface ProcessingJob {
  algorithm: AlgorithmId;
  stages: ProcessingStage[];
  progress: number;
  running: boolean;
  cancelled: boolean;
  startedAt: number;
}

export interface AppSettings {
  accentTheme: "blue" | "cyan" | "green";
  fftSize: number;
  windowType: WindowType;
  spectrogramColormap: "magma" | "viridis" | "grayscale";
  animationsEnabled: boolean;
  highQualityRendering: boolean;
  normalizeOnImport: boolean;
  targetSampleRate: number;
}
