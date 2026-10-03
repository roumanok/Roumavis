"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
export type AudioHandle = { play: () => Promise<boolean>; fade: () => void };
export default forwardRef<AudioHandle, { idleButton?: boolean }>(
  function AudioController({ idleButton = false }, ref) {
    const audio = useRef<HTMLAudioElement>(null),
      timer = useRef<ReturnType<typeof setInterval> | null>(null);
    const [started, setStarted] = useState(false),
      [playing, setPlaying] = useState(false),
      [error, setError] = useState("");
    function stopFade() {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    }
    async function play() {
      try {
        if (!audio.current) return false;
        stopFade();
        audio.current.volume = 1;
        await audio.current.play();
        setStarted(true);
        setError("");
        return true;
      } catch {
        setStarted(true);
        setError("No se pudo reproducir. Tocá ♪ para volver a intentar.");
        return false;
      }
    }
    useImperativeHandle(ref, () => ({
      play,
      fade() {
        stopFade();
        let step = 0;
        timer.current = setInterval(() => {
          step++;
          if (audio.current) audio.current.volume = Math.max(0, 1 - step / 30);
          if (step >= 30) {
            audio.current?.pause();
            stopFade();
          }
        }, 150);
      },
    }));
    useEffect(
      () => () => {
        if (timer.current) clearInterval(timer.current);
      },
      [],
    );
    return (
      <>
        <audio
          ref={audio}
          src="/heaven.mp3"
          preload="auto"
          loop
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {(started || idleButton) && (
          <button
            className="audio-control"
            aria-label={playing ? "Pausar música" : "Reanudar música"}
            onClick={() => (playing ? audio.current?.pause() : void play())}
          >
            {playing ? "Ⅱ" : "♪"}
          </button>
        )}
        {error && (
          <p className="audio-error" role="status">
            {error}
          </p>
        )}
      </>
    );
  },
);
