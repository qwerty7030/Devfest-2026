import { useState, useEffect, useRef, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [isMirrored, setIsMirrored] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [requested, setRequested] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [retry, setRetry] = useState(0);

  const stopCamera = useCallback(() => {
    generation.current++;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setIsStarting(false);
  }, []);

  useEffect(() => {
    if (!requested || isTestMode) return;
    const current = ++generation.current;
    setIsStarting(true);
    setHasPermission(null);
    setErrorMessage(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (current !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Some browsers leave play() pending even while the preview is visible.
          // Camera access, rather than playback or outfit detection, enables Start.
          void videoRef.current.play().catch(() => {});
        }
        if (current !== generation.current) return;
        setHasPermission(true);
        setIsCameraActive(true);
      } catch (e) {
        if (current !== generation.current) return;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setHasPermission(false);
        setErrorMessage(e instanceof Error && e.name === 'NotAllowedError' ? 'Allow camera access in your browser, then try again. You can also explore the demo.' : 'No camera available. Connect a camera or explore the demo.');
        setIsCameraActive(false);
      } finally {
        if (current === generation.current) setIsStarting(false);
      }
    })();
    return stopCamera;
  }, [requested, isTestMode, facingMode, retry, stopCamera]);

  const startCamera = useCallback(() => { setIsTestMode(false); setRequested(true); setRetry(n => n + 1); }, []);
  const toggleTestMode = useCallback(() => {
    stopCamera();
    setIsTestMode(v => !v);
    setRequested(false);
    setHasPermission(null);
  }, [stopCamera]);

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!isTestMode && (!video || video.readyState < 2 || !video.videoWidth)) return null;
    const canvas = document.createElement('canvas');
    if (isTestMode) {
      const preview = document.querySelector<HTMLCanvasElement>('[data-demo-camera]');
      if (!preview) return null;
      canvas.width = preview.width; canvas.height = preview.height;
      canvas.getContext('2d')?.drawImage(preview, 0, 0);
    } else {
      const scale = Math.min(1, 960 / video!.videoWidth);
      canvas.width = Math.round(video!.videoWidth * scale); canvas.height = Math.round(video!.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      if (isMirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video!, 0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL('image/jpeg', .78);
  }, [isMirrored, isTestMode]);

  return { videoRef, isMirrored, isStarting, isCameraActive: isCameraActive || isTestMode, hasPermission, errorMessage, isTestMode,
    startCamera, stopCamera, toggleMirror: () => setIsMirrored(v => !v),
    toggleFacingMode: () => setFacingMode(v => v === 'user' ? 'environment' : 'user'), toggleTestMode, captureSnapshot };
}
