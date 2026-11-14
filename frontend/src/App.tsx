import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppState, FitResult } from './types/fitCheck';
import { useCamera } from './hooks/useCamera';
import { useLiveReactions } from './hooks/useLiveReactions';
import { mockFitCheckProvider } from './services/mockProvider';
import { soundEffects } from './services/soundEffects';

import { PhoneFrame } from './components/Layout/PhoneFrame';
import { CameraPreview } from './components/Camera/CameraPreview';
import { SilhouetteGuide } from './components/Camera/SilhouetteGuide';
import { CountdownOverlay } from './components/Countdown/CountdownOverlay';
import { LiveHeader } from './components/LiveOverlay/LiveHeader';
import { CoachingCue } from './components/LiveOverlay/CoachingCue';
import { LiveChat } from './components/LiveOverlay/LiveChat';
import { FloatingReactions } from './components/LiveOverlay/FloatingReactions';
import { ReactionBar } from './components/LiveOverlay/ReactionBar';
import { ScannerOverlay } from './components/Analyzing/ScannerOverlay';
import { ResultsCard } from './components/Results/ResultsCard';

import {
  Camera,
  FlipHorizontal,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Sliders,
} from 'lucide-react';

const RECORDING_DURATION = 15; // 15 seconds fit check

export function App() {
  const [appState, setAppState] = useState<AppState>('READY');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [remainingSec, setRemainingSec] = useState<number>(RECORDING_DURATION);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | undefined>(undefined);
  const [showGuide, setShowGuide] = useState<boolean>(true);

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

  const recordTimerRef = useRef<number | null>(null);

  // Toggle Mute Audio
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEffects.setMuted(next);
      return next;
    });
  }, []);

  // Transition: READY -> COUNTDOWN
  const handleStartFitCheck = () => {
    clearLiveState();
    setAppState('COUNTDOWN');
  };

  // Transition: COUNTDOWN -> RECORDING
  const handleCountdownFinished = useCallback(() => {
    setAppState('RECORDING');
    setRemainingSec(RECORDING_DURATION);
    setElapsedSec(0);
    startViewerCounter();

    // Start live comment stream and simulated reactions
    mockFitCheckProvider.startLiveFeed(
      (comment) => addComment(comment),
      (emoji) => triggerReaction(emoji)
    );

    // Initial burst of reactions
    triggerBurst('🔥', 4);

    const startTime = Date.now();
    recordTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, RECORDING_DURATION - elapsed);

      setElapsedSec(elapsed);
      setRemainingSec(remaining);

      // Take a snapshot around 13-14 seconds
      if (remaining === 1) {
        const snap = captureSnapshot();
        if (snap) setCapturedSnapshot(snap);
      }

      if (remaining <= 0) {
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }

        // Shutter snap sound
        soundEffects.playShutter();

        // End recording, start analysis
        mockFitCheckProvider.stopLiveFeed();
        stopViewerCounter();

        // Capture snapshot if not already done
        const finalSnap = captureSnapshot();
        if (finalSnap) setCapturedSnapshot(finalSnap);

        setAppState('ANALYZING');
      }
    }, 250);
  }, [
    addComment,
    captureSnapshot,
    clearLiveState,
    startViewerCounter,
    stopViewerCounter,
    triggerBurst,
    triggerReaction,
  ]);

  // Transition: Trigger Analysis
  useEffect(() => {
    if (appState === 'ANALYZING') {
      let isSubscribed = true;

      mockFitCheckProvider
        .analyzeFit(capturedSnapshot)
        .then((result) => {
          if (isSubscribed) {
            setFitResult(result);
            setAppState('RESULTS');
          }
        })
        .catch((err) => {
          console.error('Fit analysis error:', err);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [appState, capturedSnapshot]);

  // Stop / Cancel active recording
  const handleStopRecording = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    mockFitCheckProvider.stopLiveFeed();
    stopViewerCounter();
    clearLiveState();
    setAppState('READY');
  };

  // Reset to Ready
  const handleResetToReady = () => {
    clearLiveState();
    setFitResult(null);
    setCapturedSnapshot(undefined);
    setAppState('READY');
  };

  // Quick Retake (Countdown directly)
  const handleQuickRetake = () => {
    clearLiveState();
    setFitResult(null);
    setCapturedSnapshot(undefined);
    setAppState('COUNTDOWN');
  };

  // User comments from reaction bar
  const handleUserSendComment = (text: string) => {
    const newComment = mockFitCheckProvider.sendUserComment(text);
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

        {/* Framing Silhouette Guide (only in READY state) */}
        <SilhouetteGuide visible={appState === 'READY' && showGuide} />

        {/* READY STATE CONTROLS */}
        {appState === 'READY' && (
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
                {/* Mirror toggle */}
                <button
                  onClick={toggleMirror}
                  title="Toggle camera mirror"
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
                >
                  <FlipHorizontal className="w-4 h-4 text-zinc-300" />
                </button>

                {/* Flip camera facing mode */}
                <button
                  onClick={toggleFacingMode}
                  title="Switch front/back camera"
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-zinc-300" />
                </button>

                {/* Mute toggle */}
                <button
                  onClick={handleToggleMute}
                  title="Toggle sound"
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-pink-400" />
                  )}
                </button>

                {/* Test Mode / Virtual Feed Toggle */}
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

            {/* Bottom Call to Action Drawer */}
            <div className="absolute bottom-0 inset-x-0 z-20 p-5 bg-gradient-to-t from-black via-black/85 to-transparent flex flex-col items-center gap-3">
              {/* Cue text */}
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                <Sliders className="w-3.5 h-3.5 text-pink-400" />
                <span>15s Live Audience Fit Reaction</span>
                <button
                  onClick={() => setShowGuide((prev) => !prev)}
                  className="underline hover:text-white ml-1 text-[11px]"
                >
                  {showGuide ? 'Hide Guide' : 'Show Guide'}
                </button>
              </div>

              {/* Start Fit Check Action Button */}
              <button
                onClick={handleStartFitCheck}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 active:scale-98 text-white font-black text-base tracking-wide transition-all shadow-xl shadow-pink-500/30 flex items-center justify-center gap-3 group animate-pulse-glow"
              >
                <div className="p-1 rounded-full bg-white/20 group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5 fill-white/20" />
                </div>
                <span>START FIT CHECK</span>
              </button>

              <p className="text-[11px] text-zinc-500 text-center max-w-xs">
                Walk into frame, do a 360° turn, and show off your kicks. Gemini Vision will rate your drip.
              </p>
            </div>
          </>
        )}

        {/* COUNTDOWN OVERLAY */}
        {appState === 'COUNTDOWN' && (
          <CountdownOverlay onComplete={handleCountdownFinished} />
        )}

        {/* RECORDING STATE (INSTAGRAM LIVE OVERLAY) */}
        {appState === 'RECORDING' && (
          <>
            {/* Top Bar with LIVE pill, Viewers, Timer and Controls */}
            <LiveHeader
              viewerCount={viewerCount}
              remainingSeconds={remainingSec}
              totalDurationSeconds={RECORDING_DURATION}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onStop={handleStopRecording}
            />

            {/* Coaching Guidance Banner */}
            <CoachingCue
              elapsedSeconds={elapsedSec}
              totalDurationSeconds={RECORDING_DURATION}
            />

            {/* Scrolling Instagram Chat Stream */}
            <LiveChat comments={comments} />

            {/* Floating Reactions Rising Up */}
            <FloatingReactions reactions={reactions} />

            {/* Bottom Reaction and Comment Input Bar */}
            <ReactionBar
              onSendComment={handleUserSendComment}
              onSendReaction={handleUserSendReaction}
            />
          </>
        )}

        {/* ANALYZING STATE */}
        {appState === 'ANALYZING' && (
          <ScannerOverlay snapshotUrl={capturedSnapshot} />
        )}

        {/* RESULTS STATE */}
        {appState === 'RESULTS' && fitResult && (
          <ResultsCard
            result={fitResult}
            onReset={handleResetToReady}
            onRetake={handleQuickRetake}
          />
        )}
      </div>
    </PhoneFrame>
  );
}

export default App;
