import { useCallback, useEffect, useRef, useState } from "react";

import { getAudioContext } from "@/lib/audio/decode";
import type { AudioSignal } from "@/types/audio";

export interface PlaybackController {
  playing: boolean;
  positionSec: number;
  durationSec: number;
  volume: number;
  loop: boolean;
  rate: number;
  play: (fromSec?: number) => void;
  pause: () => void;
  stop: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  setLoop: (v: boolean) => void;
  setRate: (v: number) => void;
}

/** Web Audio playback for an in-memory mono signal, with transport state. */
export function useAudioPlayback(signal: AudioSignal | null): PlaybackController {
  const [playing, setPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [loop, setLoop] = useState(false);
  const [rate, setRateState] = useState(1);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const durationSec = signal?.metadata.durationSec ?? 0;

  const teardown = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null;
      try {
        sourceRef.current.stop();
      } catch {
        /* already stopped */
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    teardown();
    setPlaying(false);
    setPositionSec(0);
    offsetRef.current = 0;
  }, [signal?.id, teardown]);

  useEffect(() => () => teardown(), [teardown]);

  const play = useCallback(
    (fromSec?: number) => {
      if (!signal || signal.samples.length === 0) return;
      const ctx = getAudioContext();
      void ctx.resume();
      teardown();

      const buffer = ctx.createBuffer(1, signal.samples.length, signal.metadata.sampleRate);
      buffer.copyToChannel(new Float32Array(signal.samples), 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.playbackRate.value = rate;

      const gain = gainRef.current ?? ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      gainRef.current = gain;
      source.connect(gain);

      const offset = Math.max(0, Math.min(fromSec ?? offsetRef.current, durationSec - 0.01));
      offsetRef.current = offset;
      startedAtRef.current = ctx.currentTime;
      source.start(0, offset);
      sourceRef.current = source;
      setPlaying(true);

      source.onended = () => {
        if (!loop) {
          setPlaying(false);
          offsetRef.current = 0;
          setPositionSec(0);
        }
      };

      const tick = () => {
        const ctxNow = getAudioContext().currentTime;
        const elapsed = (ctxNow - startedAtRef.current) * rate;
        let pos = offset + elapsed;
        if (loop && durationSec > 0) pos %= durationSec;
        setPositionSec(Math.min(pos, durationSec));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [durationSec, loop, rate, signal, teardown, volume],
  );

  const pause = useCallback(() => {
    if (!playing) return;
    const elapsed = (getAudioContext().currentTime - startedAtRef.current) * rate;
    offsetRef.current = Math.min(offsetRef.current + elapsed, durationSec);
    teardown();
    setPlaying(false);
  }, [durationSec, playing, rate, teardown]);

  const stop = useCallback(() => {
    teardown();
    offsetRef.current = 0;
    setPositionSec(0);
    setPlaying(false);
  }, [teardown]);

  const seek = useCallback(
    (sec: number) => {
      const clamped = Math.max(0, Math.min(sec, durationSec));
      offsetRef.current = clamped;
      setPositionSec(clamped);
      if (playing) play(clamped);
    },
    [durationSec, play, playing],
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (gainRef.current) gainRef.current.gain.value = v;
  }, []);

  const setRate = useCallback((v: number) => {
    setRateState(v);
    if (sourceRef.current) sourceRef.current.playbackRate.value = v;
  }, []);

  return {
    playing,
    positionSec,
    durationSec,
    volume,
    loop,
    rate,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setLoop,
    setRate,
  };
}
