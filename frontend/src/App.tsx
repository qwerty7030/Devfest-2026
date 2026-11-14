'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FlipHorizontal, Volume2, VolumeX, RefreshCw, ArrowUpRight, Sparkles, X } from 'lucide-react';
import type { AppState, FitResult } from './types/fitCheck';
import { useCamera } from './hooks/useCamera';
import { useLiveReactions } from './hooks/useLiveReactions';
import { usePersonDetector } from '../../lib/fitcheck/usePersonDetector';
import { startLiveFeed, analyzeFit } from './services/apiProvider';
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
import { PosingScreen } from './components/Posing/PosingScreen';
import { StyleResults } from './components/Results/StyleResults';
import './studio.css';

const DURATION = 15;

export function App() {
  const [stage, setStage] = useState<AppState>('READY');
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<FitResult | null>(null);
  const [snapshot, setSnapshot] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Connecting your AI audience…');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const camera = useCamera();
  const { stopCamera } = camera;
  const live = useLiveReactions();
  const detector = usePersonDetector(camera.videoRef, camera.isCameraActive && !camera.isTestMode && stage === 'READY');
  const analysisRef = useRef<AbortController | null>(null);

  useEffect(() => { soundEffects.setMuted(muted); }, [muted]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/health', { signal: ctrl.signal }).then(r => r.json()).then(d => setConfigured(d.aiConfigured)).catch(() => {});
    return () => ctrl.abort();
  }, []);
  useEffect(() => () => analysisRef.current?.abort(), []);
  useEffect(() => {
    if (stage === 'RESULTS') stopCamera();
  }, [stage, stopCamera]);

  const { addComment, triggerReaction, startViewerCounter, stopViewerCounter } = live;
  const capture = camera.captureSnapshot;
  const demo = camera.isTestMode;
  useEffect(() => {
    if (stage !== 'RECORDING') return;
    setElapsed(0);
    startViewerCounter();
    setStatus(demo ? 'Demo audience · sample reactions' : 'Connecting your AI audience…');
    let stop: () => void;
    if (demo) { mockFitCheckProvider.startLiveFeed(addComment, triggerReaction); stop = () => mockFitCheckProvider.stopLiveFeed(); }
    else stop = startLiveFeed(capture, addComment, setStatus);
    const started = Date.now();
    const timer = setInterval(() => {
      const seconds = Math.min(DURATION, Math.floor((Date.now() - started) / 1000));
      setElapsed(seconds);
      if (seconds >= DURATION) {
        const photo = capture();
        if (photo) setSnapshot(photo);
        soundEffects.playShutter();
        setStage('POSING');
      }
    }, 200);
    return () => { clearInterval(timer); stop(); stopViewerCounter(); };
  }, [stage, demo, capture, addComment, triggerReaction, startViewerCounter, stopViewerCounter]);

  const reset = () => { analysisRef.current?.abort(); live.clearLiveState(); setError(null); setResult(null); setPhotos([]); setSnapshot(undefined); setStage('READY'); };
  const begin = () => { live.clearLiveState(); setError(null); setResult(null); setPhotos([]); setStage('COUNTDOWN'); };
  const countdownFinished = useCallback(() => setStage('RECORDING'), []);
  const finish = async (taken: string[]) => {
    if (!taken.length || analysisRef.current && !analysisRef.current.signal.aborted && stage === 'ANALYZING') return;
    analysisRef.current?.abort();
    const ctrl = new AbortController();
    analysisRef.current = ctrl;
    setPhotos(taken); setSnapshot(taken[0]); setStage('ANALYZING'); setError(null);
    try {
      const data = demo ? await mockFitCheckProvider.analyzeFit(taken) : await analyzeFit(taken[0], ctrl.signal);
      if (ctrl.signal.aborted) return;
      setResult({ ...data, source: demo ? 'demo' : 'ai', capturedPhotos: taken, capturedSnapshotUrl: taken[0] });
      setStage('RESULTS');
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  };

  return <PhoneFrame><div className="relative w-full h-full overflow-hidden bg-black text-white">
    <CameraPreview {...camera} onRetry={camera.startCamera} onEnableTestMode={camera.toggleTestMode}/>
    {stage === 'READY' && <>
      <div className="camera-toolbar"><span className="camera-mode"><i/>{demo ? 'DEMO STUDIO' : 'CAMERA STUDIO'}</span><div>
        <button onClick={camera.toggleMirror} aria-label="Mirror camera" aria-pressed={camera.isMirrored} title="Mirror camera"><FlipHorizontal size={17}/></button>
        <button onClick={camera.toggleFacingMode} disabled={demo || !camera.isCameraActive} aria-label="Switch camera" title="Switch camera"><RefreshCw size={17}/></button>
        <button onClick={() => setMuted(v => !v)} aria-label={muted ? 'Enable sound' : 'Mute sound'} title={muted ? 'Enable sound' : 'Mute sound'}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
      </div></div>
      {(camera.isCameraActive || demo) && <SilhouetteGuide visible={!demo && showGuide}/>}
      {!camera.isCameraActive && camera.hasPermission !== false && <div className="camera-welcome">
        <div className="viewfinder"><span/><Camera size={38} strokeWidth={1}/><span/></div>
        <span className="eyebrow">A SPACE FOR YOUR STYLE</span><h2>Show us<br/>your style.</h2><p>A full outfit or just a detail.<br/>Start wherever you are.</p>
      </div>}
      <div className="studio-controls">
        {camera.isCameraActive && <div className="framing-status"><span/>{demo ? 'Sample session · no AI calls' : detector.present ? 'Ready when you are. Partial outfits work too.' : 'Start anytime. We’ll review what’s visible.'}</div>}
        {configured === false && !demo && <p className="service-note">You can start and take photos. AI reviews need a server API key.</p>}
        <button className="primary-action" disabled={camera.isStarting && !camera.isCameraActive} onClick={camera.isCameraActive ? begin : camera.startCamera}>
          <Camera size={19}/>{camera.isCameraActive ? 'Start my fit check' : camera.isStarting ? 'Waiting for camera…' : 'Enable camera'}<ArrowUpRight size={20}/></button>
        {camera.isCameraActive && !demo && <button className="demo-action" aria-pressed={showGuide} onClick={() => setShowGuide(v => !v)}>{showGuide ? 'Hide optional framing guide' : 'Show optional framing guide'}</button>}
        <button className="demo-action" onClick={camera.toggleTestMode}><Sparkles size={14}/>{demo ? 'Back to my camera' : 'Just looking? Try the demo'}</button>
        <p className="privacy-note">{demo ? 'Sample outfit, sample score. Your real fit is next.' : 'Photos are sent to Google Gemini only during your session. We don’t store them.'}</p>
      </div>
    </>}
    {stage === 'COUNTDOWN' && <><CountdownOverlay onComplete={countdownFinished}/><button className="cancel-session" onClick={reset} aria-label="Cancel countdown"><X size={18}/></button></>}
    {stage === 'RECORDING' && <><LiveHeader viewerCount={live.viewerCount} remainingSeconds={DURATION-elapsed} totalDurationSeconds={DURATION} isMuted={muted} onToggleMute={() => setMuted(v=>!v)} onStop={reset}/>
      <div className="audience-status" role="status">{status}</div><CoachingCue elapsedSeconds={elapsed} totalDurationSeconds={DURATION}/><LiveChat comments={live.comments}/><FloatingReactions reactions={live.reactions}/>
      <ReactionBar onSendComment={text => addComment({ id: crypto.randomUUID(), username: 'you', avatarUrl: '/avatar.svg', comment: text, timestamp: Date.now(), badge: 'Host' })} onSendReaction={triggerReaction}/></>}
    {stage === 'POSING' && <PosingScreen onCapturePhoto={capture} onFinishPosing={finish} onCancel={reset}/>}
    {stage === 'ANALYZING' && <><ScannerOverlay snapshotUrl={snapshot} isDemo={demo}/>{error ? <div className="analysis-error" role="alert"><span className="eyebrow">LET’S TRY THAT AGAIN</span><h2>A small style pause.</h2><p>{error}</p><button className="primary-action" onClick={() => { analysisRef.current?.abort(); void finish(photos); }}>Retry analysis <RefreshCw size={17}/></button><button className="demo-action" onClick={() => { setError(null); setStage('POSING'); }}>Retake photos</button><button className="demo-action" onClick={reset}>Back to studio</button></div> : <button className="cancel-session" onClick={reset} aria-label="Cancel analysis"><X size={18}/></button>}</>}
    {stage === 'RESULTS' && result && <StyleResults result={result} onReset={reset} onRetake={() => { setError(null); if (!demo) camera.startCamera(); setStage('POSING'); }}/>}
  </div></PhoneFrame>;
}

export default App;
