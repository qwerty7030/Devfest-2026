'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, FlipHorizontal, RefreshCw, Volume2, VolumeX, X } from 'lucide-react';
import type { AppState } from './types/fitCheck';
import type { OutfitObservation } from '../../lib/fitcheck/types';
import { useCamera } from './hooks/useCamera';
import { useLiveReactions } from './hooks/useLiveReactions';
import { startLiveFeed, analyzeFit } from './services/apiProvider';
import { createOutfitClipSource } from './services/clipCapture';
import { mockFitCheckProvider } from './services/mockProvider';
import { saveLook, type FitPost } from './services/fitFeed';
import { soundEffects } from './services/soundEffects';
import { PhoneFrame } from './components/Layout/PhoneFrame';
import { CameraPreview } from './components/Camera/CameraPreview';
import { CountdownOverlay } from './components/Countdown/CountdownOverlay';
import { LiveChat } from './components/LiveOverlay/LiveChat';
import { PosingScreen } from './components/Posing/PosingScreen';
import { LooksFeed } from './components/Results/LooksFeed';
import './studio.css';

const DURATION = 15;
export function App() {
  const router = useRouter();
  const [stage, setStage] = useState<AppState>('READY');
  const [muted, setMuted] = useState(true), [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<FitPost | null>(null);
  const [photos, setPhotos] = useState<string[]>([]), [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Watching your outfit…');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [activeModel, setActiveModel] = useState('Connecting…');
  const [observations, setObservations] = useState<OutfitObservation[]>([]);
  const camera = useCamera(), live = useLiveReactions();
  const { stopCamera, videoRef } = camera;
  const capture = camera.captureSnapshot, demo = camera.isTestMode;
  const analysisRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef(''), runwayPhotos = useRef<string[]>([]);
  const reportRequestRef = useRef<{ photos: string; id: string } | null>(null);
  useEffect(() => { soundEffects.setMuted(muted); }, [muted]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' }).then(r => r.json()).then(d => {
      setConfigured(d.aiConfigured); setActiveModel(d.model || 'Restart server');
    }).catch(() => { if (!ctrl.signal.aborted) setActiveModel('Server unavailable'); });
    return () => ctrl.abort();
  }, []);
  useEffect(() => () => analysisRef.current?.abort(), []);
  useEffect(() => { if (stage === 'RESULTS') stopCamera(); }, [stage, stopCamera]);
  const { addComment, triggerReaction, startViewerCounter, stopViewerCounter } = live;
  useEffect(() => {
    if (stage !== 'RECORDING') return;
    setElapsed(0); startViewerCounter();
    setStatus(demo ? 'Demo' : 'Watching your outfit…');
    let started: number | null = demo ? Date.now() : null;
    if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();
    let stop: () => void;
    if (demo) { mockFitCheckProvider.startLiveFeed(addComment, triggerReaction); stop = () => mockFitCheckProvider.stopLiveFeed(); }
    else stop = startLiveFeed(createOutfitClipSource(() => videoRef.current, capture), addComment, setStatus, items => {
      setObservations(items); if (items.length && started === null) started = Date.now();
    }, sessionIdRef.current);
    const timer = setInterval(() => {
      const seconds = started === null ? 0 : Math.min(DURATION, Math.floor((Date.now() - started) / 1000));
      setElapsed(seconds);
      if (runwayPhotos.current.length < 3 && seconds >= 3 + runwayPhotos.current.length * 4) {
        const photo = capture(); if (photo) runwayPhotos.current.push(photo);
      }
      if (seconds >= DURATION) setStage('POSING');
    }, 200);
    return () => { clearInterval(timer); stop(); stopViewerCounter(); };
  }, [stage, demo, capture, videoRef, addComment, triggerReaction, startViewerCounter, stopViewerCounter]);
  const reset = () => { analysisRef.current?.abort(); live.clearLiveState(); setError(null); setResult(null); setPhotos([]); setStage('READY'); };
  const begin = () => { sessionIdRef.current = crypto.randomUUID(); reportRequestRef.current = null; runwayPhotos.current = []; setObservations([]); live.clearLiveState(); setError(null); setResult(null); setPhotos([]); setStage('COUNTDOWN'); };
  const countdownFinished = useCallback(() => setStage('RECORDING'), []);
  const finish = async (taken: string[]) => {
    if (!taken.length || analysisRef.current && !analysisRef.current.signal.aborted && stage === 'ANALYZING') return;
    analysisRef.current?.abort();
    const ctrl = new AbortController(); analysisRef.current = ctrl;
    setPhotos(taken); setStage('ANALYZING'); setError(null);
    const review = [...runwayPhotos.current.slice(0, 2), taken[taken.length - 1]].slice(-3);
    try {
      const signature = review.join('|');
      if (!reportRequestRef.current || reportRequestRef.current.photos !== signature) reportRequestRef.current = { photos: signature, id: crypto.randomUUID() };
      const data = demo ? await mockFitCheckProvider.analyzeFit(taken) : await analyzeFit(review, ctrl.signal, sessionIdRef.current, reportRequestRef.current.id);
      if (ctrl.signal.aborted) return;
      const post: FitPost = { ...data, id: sessionIdRef.current, source: demo ? 'demo' : 'ai', capturedPhotos: [...taken, ...runwayPhotos.current], capturedSnapshotUrl: taken[0], timestamp: Date.now() };
      setResult(post); setStage('RESULTS');
      try { await saveLook(post); if (!ctrl.signal.aborted) router.push('/feed'); }
      catch { setError('This look could not be saved. Keep this tab open to view and download your photos.'); }
    } catch (e) { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Could not review your outfit.'); }
  };
  if (stage === 'RESULTS' && result) return <LooksFeed latest={result} onCamera={reset} saveNotice={error ?? undefined}/>;
  return <PhoneFrame><div className="camera-content">
    <CameraPreview {...camera} onRetry={camera.startCamera} onEnableTestMode={camera.toggleTestMode}/>
    {stage === 'READY' && <>
      <div className="camera-toolbar"><span>{demo ? 'Demo' : 'Camera'}</span><div>
        <button className="icon-button" onClick={camera.toggleMirror} aria-label="Mirror camera" aria-pressed={camera.isMirrored}><FlipHorizontal size={18}/></button>
        <button className="icon-button" onClick={camera.toggleFacingMode} disabled={demo || !camera.isCameraActive} aria-label="Switch camera"><RefreshCw size={18}/></button>
        <button className="icon-button" onClick={() => setMuted(v => !v)} aria-label={muted ? 'Enable sound' : 'Mute sound'}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
      </div></div>
      {!camera.isCameraActive && camera.hasPermission !== false && <div className="camera-welcome"><Camera size={30} strokeWidth={1}/><h1>Show your fit.</h1></div>}
      <div className="studio-controls">
        {configured === false && !demo && <p className="service-note">AI is not configured.</p>}
        <button className="primary-action" disabled={camera.isStarting && !camera.isCameraActive} onClick={camera.isCameraActive ? begin : camera.startCamera}>{camera.isCameraActive ? 'Start fit check' : camera.isStarting ? 'Connecting…' : 'Enable camera'}</button>
        <button className="text-button demo-action" onClick={camera.toggleTestMode}>{demo ? 'Use my camera' : 'Try demo'}</button>
        <p className="privacy-note">{demo ? 'Sample session · no API calls' : 'Clips go to Gemini. Photos save to this browser.'}</p>
        <details className="version-info"><summary>Connection</summary><p>{process.env.NEXT_PUBLIC_APP_REVISION ?? 'local'} · {activeModel}</p></details>
      </div>
    </>}
    {stage === 'COUNTDOWN' && <><CountdownOverlay onComplete={countdownFinished}/><button className="icon-button cancel-session" onClick={reset} aria-label="Cancel countdown"><X size={18}/></button></>}
    {stage === 'RECORDING' && <>
      <div className="live-toolbar"><span><i/>Live</span><span>{DURATION - elapsed}s</span><button className="icon-button" onClick={reset} aria-label="Stop fit check"><X size={18}/></button></div>
      <div className="runway-progress"><div style={{ width: `${elapsed / DURATION * 100}%` }}/></div>
      <div className="audience-status" role="status">{status}</div>
      <p className="pose-cue">{elapsed < 4 ? 'Show your outfit' : elapsed < 8 ? 'Try a turn' : elapsed < 12 ? 'Show the details' : 'Photos up next'}</p>
      <LiveChat comments={demo || observations.length > 0 ? live.comments : []}/>
    </>}
    {stage === 'POSING' && <PosingScreen onCapturePhoto={capture} onFinishPosing={finish} onCancel={reset}/>}
    {stage === 'ANALYZING' && <div className="analysis-screen" role="status"><button className="icon-button cancel-session" onClick={reset} aria-label="Cancel review"><X size={18}/></button>{error ? <><h2>Review paused</h2><p>{error}</p><button className="primary-action" onClick={() => { analysisRef.current?.abort(); void finish(photos); }}>Retry review</button><button className="text-button" onClick={reset}>Back to camera</button></> : <><span className="loading-ring"/><h2>Reviewing your look</h2><p>One outfit. Two perspectives.</p></>}</div>}
  </div></PhoneFrame>;
}
export default App;
