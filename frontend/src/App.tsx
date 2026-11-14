import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppState, FitResult } from './types/fitCheck';
import { useCamera } from './hooks/useCamera';
import { useLiveReactions } from './hooks/useLiveReactions';
import { usePersonDetector } from './hooks/usePersonDetector';
import { fitCheckProvider } from './services/provider';
import { geminiFitCheckProvider } from './services/geminiProvider';
import { soundEffects } from './services/soundEffects';

import { PhoneFrame } from './components/Layout/PhoneFrame';
import { CameraPreview } from './components/Camera/CameraPreview';
import { SilhouetteGuide } from './components/Camera/SilhouetteGuide';
import { LiveHeader } from './components/LiveOverlay/LiveHeader';
import { CoachingCue } from './components/LiveOverlay/CoachingCue';
import { LiveChat } from './components/LiveOverlay/LiveChat';
import { FloatingReactions } from './components/LiveOverlay/FloatingReactions';
import { ReactionBar } from './components/LiveOverlay/ReactionBar';
import { ScannerOverlay } from './components/Analyzing/ScannerOverlay';
import { ResultsCard } from './components/Results/ResultsCard';

import { Camera, FlipHorizontal, Volume2, VolumeX, Sparkles, RefreshCw, Sliders } from 'lucide-react';

/** Sessions shorter than this (someone just walking past) end without a results card. */
const MIN_SESSION_MS = 5000;
/**
 * Results card returns to WAITING on its own after this long. Being in frame
 * doesn't dismiss it (people walk up to read it); use Quick Retake / Reset.
 */
const RESULTS_HOLD_MS = 30000;
/** CoachingCue's tips span 16s; while live we cycle through them. */
const COACHING_CYCLE_SEC = 16;

/**
 * Continuous live flow, no recording step:
 *   WAITING → (person walks in) → LIVE → (person leaves) → ANALYZING → RESULTS → WAITING
 * RESULTS stays up until Quick Retake / Reset, or RESULTS_HOLD_MS (30s).
 * Space = go live manually, Esc = back to WAITING.
 */
export function App() {
  const [appState, setAppState] = useState<AppState>('WAITING');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveElapsedSec, setLiveElapsedSec] = useState<number>(0);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | undefined>(undefined);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  /** Manual "Go Live" (button / space): counts as a person in frame until the session ends. */
  const [forcedLive, setForcedLive] = useState<boolean>(false);

  const sessionRef = useRef(0);
  const liveStartRef = useRef(0);
  /** After a manual stop/reset with someone still in frame, they must leave before auto-live again. */
  const needsReentryRef = useRef(false);

  // Camera hook
  const {
    videoRef,
    isMirrored,
    isCameraActive,
    hasPermission,
    errorMessage,
    isTestMode,
    startCamera,
    toggleMirror,
    toggleFacingMode,
    toggleTestMode,
    captureSnapshot,
  } = useCamera();

  // Let the Gemini provider grab frames from the live camera.
  useEffect(() => {
    geminiFitCheckProvider.setFrameSource(() => videoRef.current);
  }, [videoRef]);

  // Live Instagram reactions & chat stream hook
  const {
    comments,
    reactions,
    viewerCount,
    addComment,
    triggerReaction,
    triggerBurst,
    clearLiveState,
    startViewerCounter,
    stopViewerCounter,
  } = useLiveReactions();

  // On-device person detection (MediaPipe). Always on while the real camera is up.
  const { present, error: detectorError } = usePersonDetector(videoRef, isCameraActive && !isTestMode);
  const personInFrame = present || forcedLive;

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEffects.setMuted(next);
      return next;
    });
  }, []);

  // ---- transitions ----

  const goLive = useCallback(() => {
    sessionRef.current += 1;
    liveStartRef.current = Date.now();
    needsReentryRef.current = false;
    clearLiveState();
    setFitResult(null);
    setCapturedSnapshot(undefined);
    setLiveElapsedSec(0);
    setAppState('LIVE');
    startViewerCounter();
    fitCheckProvider.startLiveFeed(
      (comment) => addComment(comment),
      (emoji) => triggerReaction(emoji),
    );
    triggerBurst('🔥', 4);
  }, [addComment, clearLiveState, startViewerCounter, triggerBurst, triggerReaction]);

  /** Ends the live session. Scores the fit once if it lasted long enough. */
  const endLive = useCallback(
    (manual: boolean) => {
      fitCheckProvider.stopLiveFeed();
      stopViewerCounter();
      setForcedLive(false);
      // A manual stop while someone is still in frame shouldn't instantly restart.
      needsReentryRef.current = manual;

      if (Date.now() - liveStartRef.current < MIN_SESSION_MS) {
        clearLiveState();
        setAppState('WAITING');
        return;
      }

      soundEffects.playShutter();
      const session = sessionRef.current;
      const snapshot = geminiFitCheckProvider.getLastGoodFrameUrl() ?? captureSnapshot() ?? undefined;
      setCapturedSnapshot(snapshot);
      setAppState('ANALYZING');

      // Called exactly once per session; the session check drops stale results.
      fitCheckProvider
        .analyzeFit(snapshot)
        .then((result) => {
          if (sessionRef.current !== session) return;
          setFitResult(result);
          setAppState('RESULTS');
        })
        .catch((err) => {
          console.error('Fit analysis error:', err);
          if (sessionRef.current === session) setAppState('WAITING');
        });
    },
    [captureSnapshot, clearLiveState, stopViewerCounter],
  );

  const backToWaiting = useCallback(() => {
    sessionRef.current += 1; // drop any in-flight analysis
    fitCheckProvider.stopLiveFeed();
    stopViewerCounter();
    clearLiveState();
    setForcedLive(false);
    setFitResult(null);
    setCapturedSnapshot(undefined);
    needsReentryRef.current = true;
    setAppState('WAITING');
  }, [clearLiveState, stopViewerCounter]);

  // Presence drives the state machine.
  useEffect(() => {
    if (!personInFrame) {
      needsReentryRef.current = false;
      if (appState === 'LIVE') endLive(false);
      return;
    }
    if (needsReentryRef.current) return;
    if (appState === 'WAITING') goLive();
  }, [personInFrame, appState, goLive, endLive]);

  // RESULTS: stays readable; auto-return to WAITING after RESULTS_HOLD_MS. Whoever
  // is standing there reading it must step out before a new session starts.
  useEffect(() => {
    if (appState !== 'RESULTS') return;
    const holdTimer = window.setTimeout(backToWaiting, RESULTS_HOLD_MS);
    return () => window.clearTimeout(holdTimer);
  }, [appState, backToWaiting]);

  // LIVE: time-on-stream clock for the header and coaching cues.
  useEffect(() => {
    if (appState !== 'LIVE') return;
    const id = window.setInterval(() => {
      setLiveElapsedSec(Math.floor((Date.now() - liveStartRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [appState]);

  // WAITING: occasional "anyone there?" chatter so the stream feels alive.
  useEffect(() => {
    if (appState !== 'WAITING') return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.35) addComment(geminiFitCheckProvider.idleComment());
    }, 3000);
    return () => window.clearInterval(id);
  }, [appState, addComment]);

  // Keyboard demo controls: Space = go live, Esc = back to waiting.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        needsReentryRef.current = false;
        setForcedLive(true);
      } else if (e.code === 'Escape') {
        backToWaiting();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [backToWaiting]);

  const handleGoLiveManually = () => {
    needsReentryRef.current = false;
    setForcedLive(true);
  };

  // User comments from reaction bar
  const handleUserSendComment = (text: string) => {
    const newComment = fitCheckProvider.sendUserComment(text);
    addComment(newComment);
  };

  // User taps reaction button
  const handleUserSendReaction = (emoji: string) => {
    triggerReaction(emoji);
  };

  return (
    <PhoneFrame>
      <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black">
        {/* Base Layer: Mirrored Video Feed */}
        <CameraPreview
          videoRef={videoRef}
          isMirrored={isMirrored}
          isCameraActive={isCameraActive}
          hasPermission={hasPermission}
          errorMessage={errorMessage}
          isTestMode={isTestMode}
          onRetry={startCamera}
          onEnableTestMode={toggleTestMode}
        />

        {/* Framing Silhouette Guide (only while waiting) */}
        <SilhouetteGuide visible={appState === 'WAITING' && showGuide} />

        {/* WAITING: stream is up, nobody in frame yet */}
        {appState === 'WAITING' && (
          <>
            {/* Top Bar Navigation */}
            <div className="absolute top-0 inset-x-0 z-20 p-4 pt-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              {/* App Title badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-bold text-xs tracking-wider">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                <span>FIT CHECK</span>
              </div>

              {/* Utility action icons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMirror}
                  title="Toggle camera mirror"
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
                >
                  <FlipHorizontal className="w-4 h-4 text-zinc-300" />
                </button>
                <button
                  onClick={toggleFacingMode}
                  title="Switch front/back camera"
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-zinc-300" />
                </button>
                <button
                  onClick={handleToggleMute}
                  title="Toggle sound"
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-pink-400" />}
                </button>
                <button
                  onClick={toggleTestMode}
                  title={isTestMode ? 'Switch to Real Webcam' : 'Switch to Virtual Demo Mode'}
                  className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                    isTestMode
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/40'
                      : 'bg-black/50 hover:bg-black/70 border-white/10 text-zinc-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Idle chatter */}
            <LiveChat comments={comments} />

            {/* Bottom prompt */}
            <div className="absolute bottom-0 inset-x-0 z-20 p-5 bg-gradient-to-t from-black via-black/85 to-transparent flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                <Sliders className="w-3.5 h-3.5 text-pink-400" />
                <span>{isTestMode ? 'Virtual demo mode' : 'Step into frame to go live'}</span>
                <button
                  onClick={() => setShowGuide((prev) => !prev)}
                  className="underline hover:text-white ml-1 text-[11px]"
                >
                  {showGuide ? 'Hide Guide' : 'Show Guide'}
                </button>
              </div>

              <div className="w-full py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-base tracking-wide flex items-center justify-center gap-3 animate-pulse-glow">
                <div className="p-1 rounded-full bg-pink-500/30">
                  <Camera className="w-5 h-5" />
                </div>
                <span>WALK IN TO START YOUR FIT CHECK</span>
              </div>

              <button onClick={handleGoLiveManually} className="text-[11px] text-zinc-400 hover:text-white underline">
                Not detecting you? Go live manually (Space)
              </button>
              {detectorError && <p className="text-[11px] text-amber-400 text-center">{detectorError}</p>}
            </div>
          </>
        )}

        {/* LIVE (INSTAGRAM LIVE OVERLAY) */}
        {appState === 'LIVE' && (
          <>
            <LiveHeader
              viewerCount={viewerCount}
              elapsedSeconds={liveElapsedSec}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onStop={() => endLive(true)}
            />

            {/* Coaching tips cycle while live */}
            <CoachingCue
              elapsedSeconds={liveElapsedSec % COACHING_CYCLE_SEC}
              totalDurationSeconds={COACHING_CYCLE_SEC}
            />

            <LiveChat comments={comments} />
            <FloatingReactions reactions={reactions} />
            <ReactionBar onSendComment={handleUserSendComment} onSendReaction={handleUserSendReaction} />
          </>
        )}

        {/* ANALYZING STATE */}
        {appState === 'ANALYZING' && <ScannerOverlay snapshotUrl={capturedSnapshot} />}

        {/* RESULTS STATE */}
        {appState === 'RESULTS' && fitResult && (
          <ResultsCard result={fitResult} onReset={backToWaiting} onRetake={goLive} />
        )}
      </div>
    </PhoneFrame>
  );
}

export default App;
