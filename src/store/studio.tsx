import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  computeStatistics,
  detectVoiceActivity,
  estimateSnrDb,
  spectralSubtraction,
  wienerFilter,
  DEFAULT_SPECTRAL_SUBTRACTION,
  DEFAULT_WIENER,
  DEFAULT_VAD_PARAMS,
} from "@/lib/dsp";
import { createDemoSignal, DEMO_PRESETS, type DemoNoiseKind } from "@/lib/audio/decode";
import { yieldToUi } from "@/lib/format";
import type {
  AlgorithmId,
  AppSettings,
  AudioSignal,
  ExportRecord,
  ProcessingJob,
  ProcessingStage,
  ProcessingRun,
  QualityMetrics,
  SignalStatistics,
  SpectralSubtractionParams,
  VadParams,
  VadSegment,
  WienerParams,
} from "@/types/audio";

export interface RecentFile {
  name: string;
  sizeBytes: number;
  sampleRate: number;
  durationSec: number;
  openedAt: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  accentTheme: "blue",
  fftSize: 1024,
  windowType: "hann",
  spectrogramColormap: "magma",
  animationsEnabled: true,
  highQualityRendering: true,
  normalizeOnImport: true,
  targetSampleRate: 16000,
};

const STAGE_LABELS = [
  "Loading audio",
  "Frame blocking & windowing",
  "Estimating noise",
  "Applying algorithm",
  "Calculating metrics",
  "Preparing result",
] as const;


const ALGORITHM_LABELS: Record<AlgorithmId, string> = {
  "spectral-subtraction": "Spectral Subtraction",
  wiener: "Wiener Filter",
  vad: "Voice Activity Detection",
  mmse: "MMSE Estimator",
};

export interface StudioState {
  signals: AudioSignal[];
  original: AudioSignal | null;
  enhanced: AudioSignal | null;
  activeSignalId: string | null;
  runs: ProcessingRun[];
  exports: ExportRecord[];
  recentFiles: RecentFile[];
  settings: AppSettings;
  job: ProcessingJob | null;
  cursorSec: number;
  selectionSec: number | null;
  vadSegments: VadSegment[] | null;
  propertiesOpen: boolean;
  statistics: SignalStatistics | null;
}

export interface StudioApi extends StudioState {
  activeSignal: AudioSignal | null;
  loadSignal: (signal: AudioSignal) => void;
  loadDemo: () => void;
  setActiveSignal: (id: string) => void;
  setCursorSec: (sec: number) => void;
  setPropertiesOpen: (open: boolean) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  runEnhancement: (
    algorithm: Exclude<AlgorithmId, "mmse">,
    params: SpectralSubtractionParams | WienerParams | VadParams,
  ) => Promise<void>;
  cancelProcessing: () => void;
  addExport: (record: ExportRecord) => void;
  reset: () => void;
  algorithmLabel: (id: AlgorithmId) => string;
}

const StudioContext = createContext<StudioApi | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<AudioSignal[]>([]);
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [enhancedId, setEnhancedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [cursorSec, setCursorSec] = useState(0);
  const [vadSegments, setVadSegments] = useState<VadSegment[] | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const cancelRef = useRef(false);

  const original = useMemo(
    () => signals.find((s) => s.id === originalId) ?? null,
    [signals, originalId],
  );
  const enhanced = useMemo(
    () => signals.find((s) => s.id === enhancedId) ?? null,
    [signals, enhancedId],
  );
  const activeSignal = useMemo(
    () => signals.find((s) => s.id === activeSignalId) ?? original,
    [signals, activeSignalId, original],
  );

  const statistics = useMemo(
    () =>
      activeSignal ? computeStatistics(activeSignal.samples, activeSignal.metadata.sampleRate) : null,
    [activeSignal],
  );

  const loadSignal = useCallback((signal: AudioSignal) => {
    setSignals([signal]);
    setOriginalId(signal.id);
    setActiveSignalId(signal.id);
    setEnhancedId(null);
    setRuns([]);
    setVadSegments(null);
    setCursorSec(0);
    setRecentFiles((prev) =>
      [
        {
          name: signal.metadata.fileName,
          sizeBytes: signal.metadata.fileSizeBytes,
          sampleRate: signal.metadata.sampleRate,
          durationSec: signal.metadata.durationSec,
          openedAt: Date.now(),
        },
        ...prev.filter((f) => f.name !== signal.metadata.fileName),
      ].slice(0, 8),
    );
  }, []);

  const loadDemo = useCallback(() => {
    loadSignal(createDemoSignal());
    toast.success("Demo signal loaded", {
      description: "4 s of synthesised speech with broadband noise and 50 Hz hum.",
    });
  }, [loadSignal]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const advance = useCallback(
    (index: number, progress: number, detail?: string) => {
      setJob((prev) => {
        if (!prev) return prev;
        const stages: ProcessingStage[] = prev.stages.map((stage, i) => ({
          ...stage,
          status: i < index ? "done" : i === index ? "active" : "pending",
          detail: i === index && detail ? detail : stage.detail,
        }));
        return { ...prev, stages, progress };
      });
    },
    [],
  );

  const cancelProcessing = useCallback(() => {
    cancelRef.current = true;
    setJob((prev) =>
      prev
        ? {
            ...prev,
            cancelled: true,
            running: false,
            stages: prev.stages.map((s) => (s.status === "active" ? { ...s, status: "cancelled" } : s)),
          }
        : prev,
    );
    toast.warning("Processing cancelled");
  }, []);

  const runEnhancement = useCallback<StudioApi["runEnhancement"]>(
    async (algorithm, params) => {
      const source = original;
      if (!source) {
        toast.error("No audio loaded", { description: "Import or record a signal first." });
        return;
      }

      cancelRef.current = false;
      const startedAt = performance.now();
      setJob({
        algorithm,
        progress: 0,
        running: true,
        cancelled: false,
        startedAt: Date.now(),
        stages: STAGE_LABELS.map((label) => ({ label, status: "pending" as const })),
      });

      try {
        const sampleRate = source.metadata.sampleRate;
        advance(0, 0.04, `${source.samples.length.toLocaleString()} samples`);
        await yieldToUi();
        if (cancelRef.current) return;

        advance(1, 0.14, `FFT size ${"fftSize" in params ? params.fftSize : 512}`);
        await yieldToUi();

        const inputSnrDb = estimateSnrDb(source.samples, sampleRate);
        advance(2, 0.24, `Input SNR ${inputSnrDb.toFixed(1)} dB`);
        await yieldToUi();
        if (cancelRef.current) return;

        let enhancedSamples = source.samples;
        let segments: VadSegment[] | undefined;
        let speechRatio = 0;

        if (algorithm === "vad") {
          const vad = detectVoiceActivity(source.samples, sampleRate, params as VadParams);
          segments = vad.segments;
          speechRatio = vad.speechRatio;
          // VAD gates the non-speech regions rather than filtering them.
          const gated = new Float32Array(source.samples.length);
          const frame = vad.frameSizeSamples;
          for (let f = 0; f < vad.frameFlags.length; f++) {
            const gain = vad.frameFlags[f] ? 1 : 0.08;
            for (let n = 0; n < frame; n++) {
              const idx = f * frame + n;
              if (idx < gated.length) gated[idx] = source.samples[idx] * gain;
            }
          }
          enhancedSamples = gated;
          advance(3, 0.6, `${segments.filter((s) => s.speech).length} speech regions`);
          await yieldToUi();
        } else {
          const onProgress = async (ratio: number) => {
            advance(3, 0.3 + ratio * 0.45, `${Math.round(ratio * 100)}% of frames`);
          };
          const result =
            algorithm === "spectral-subtraction"
              ? await spectralSubtraction(
                  source.samples,
                  sampleRate,
                  params as SpectralSubtractionParams,
                  onProgress,
                )
              : await wienerFilter(source.samples, sampleRate, params as WienerParams, onProgress);
          if (cancelRef.current) return;
          enhancedSamples = result.samples;
        }

        advance(4, 0.84, "Segmental SNR");
        await yieldToUi();
        const outputSnrDb = estimateSnrDb(enhancedSamples, sampleRate);
        const vadOut = detectVoiceActivity(enhancedSamples, sampleRate, DEFAULT_VAD_PARAMS);

        advance(5, 0.95, "Building comparison workspace");
        await yieldToUi();
        if (cancelRef.current) return;

        const processingTimeMs = performance.now() - startedAt;
        const metrics: QualityMetrics = {
          inputSnrDb,
          outputSnrDb,
          snrImprovementDb: outputSnrDb - inputSnrDb,
          processingTimeMs,
          noiseReductionDb:
            computeStatistics(source.samples, sampleRate).estimatedNoiseFloorDb -
            computeStatistics(enhancedSamples, sampleRate).estimatedNoiseFloorDb,
          speechRatio: algorithm === "vad" ? speechRatio : vadOut.speechRatio,
        };

        const resultSignal: AudioSignal = {
          id: crypto.randomUUID(),
          kind: "processed",
          samples: enhancedSamples,
          createdAt: Date.now(),
          metadata: {
            ...source.metadata,
            fileName: `${source.metadata.fileName.replace(/\.[^.]+$/, "")}__${algorithm}.wav`,
            encoding: "Linear PCM (enhanced)",
            lastModified: Date.now(),
          },
        };

        setSignals((prev) => [...prev, resultSignal]);
        setEnhancedId(resultSignal.id);
        setActiveSignalId(resultSignal.id);
        if (segments) setVadSegments(segments);

        setRuns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            algorithm,
            algorithmLabel: ALGORITHM_LABELS[algorithm],
            params: params as unknown as Record<string, number | string>,
            sourceSignalId: source.id,
            resultSignalId: resultSignal.id,
            metrics,
            vadSegments: segments,
            createdAt: Date.now(),
          },
        ]);

        setJob((prev) =>
          prev
            ? {
                ...prev,
                running: false,
                progress: 1,
                stages: prev.stages.map((s) => ({ ...s, status: "done" as const })),
              }
            : prev,
        );

        toast.success(`${ALGORITHM_LABELS[algorithm]} complete`, {
          description: `SNR improvement ${metrics.snrImprovementDb >= 0 ? "+" : ""}${metrics.snrImprovementDb.toFixed(2)} dB in ${processingTimeMs.toFixed(0)} ms`,
        });
      } catch (error) {
        setJob((prev) =>
          prev
            ? {
                ...prev,
                running: false,
                stages: prev.stages.map((s) =>
                  s.status === "active" ? { ...s, status: "error" as const } : s,
                ),
              }
            : prev,
        );
        toast.error("Processing failed", {
          description: error instanceof Error ? error.message : "Unexpected DSP error.",
        });
      }
    },
    [advance, original],
  );

  const addExport = useCallback((record: ExportRecord) => {
    setExports((prev) => [record, ...prev].slice(0, 30));
  }, []);

  const reset = useCallback(() => {
    setSignals([]);
    setOriginalId(null);
    setEnhancedId(null);
    setActiveSignalId(null);
    setRuns([]);
    setJob(null);
    setVadSegments(null);
    setCursorSec(0);
  }, []);

  const value = useMemo<StudioApi>(
    () => ({
      signals,
      original,
      enhanced,
      activeSignal,
      activeSignalId,
      runs,
      exports,
      recentFiles,
      settings,
      job,
      cursorSec,
      selectionSec: cursorSec,
      vadSegments,
      propertiesOpen,
      statistics,
      loadSignal,
      loadDemo,
      setActiveSignal: setActiveSignalId,
      setCursorSec,
      setPropertiesOpen,
      updateSettings,
      runEnhancement,
      cancelProcessing,
      addExport,
      reset,
      algorithmLabel: (id) => ALGORITHM_LABELS[id],
    }),
    [
      signals,
      original,
      enhanced,
      activeSignal,
      activeSignalId,
      runs,
      exports,
      recentFiles,
      settings,
      job,
      cursorSec,
      vadSegments,
      propertiesOpen,
      statistics,
      loadSignal,
      loadDemo,
      updateSettings,
      runEnhancement,
      cancelProcessing,
      addExport,
      reset,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioApi {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside <StudioProvider>");
  return ctx;
}

export { ALGORITHM_LABELS };
