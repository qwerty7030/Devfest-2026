import { useState, useEffect, useRef, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);

  const startCamera = useCallback(async () => {
    if (isTestMode) {
      setIsCameraActive(true);
      setHasPermission(true);
      return;
    }

    try {
      setErrorMessage(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      setHasPermission(true);
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      const errObj = err as Error;
      setErrorMessage(errObj.message || 'Camera permission denied or camera unavailable');
      setHasPermission(false);
      setIsCameraActive(false);
    }
  }, [facingMode, isTestMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  const toggleTestMode = useCallback(() => {
    setIsTestMode((prev) => {
      const next = !prev;
      if (next) {
        stopCamera();
        setIsCameraActive(true);
        setHasPermission(true);
      } else {
        setIsCameraActive(false);
      }
      return next;
    });
  }, [stopCamera]);

  const captureSnapshot = useCallback((): string | null => {
    if (isTestMode) {
      // Generate a simulated fashion snapshot card canvas
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 1280);
        gradient.addColorStop(0, '#18181b');
        gradient.addColorStop(0.5, '#27272a');
        gradient.addColorStop(1, '#09090b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 720, 1280);

        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FIT CHECK SNAPSHOT', 360, 200);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '22px sans-serif';
        ctx.fillText('Simulated High-Res Capture', 360, 250);

        // Body outline placeholder
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(360, 420, 70, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(360, 490);
        ctx.lineTo(360, 850);
        ctx.moveTo(360, 560);
        ctx.lineTo(240, 720);
        ctx.moveTo(360, 560);
        ctx.lineTo(480, 720);
        ctx.moveTo(360, 850);
        ctx.lineTo(280, 1120);
        ctx.moveTo(360, 850);
        ctx.lineTo(440, 1120);
        ctx.stroke();

        return canvas.toDataURL('image/jpeg', 0.85);
      }
      return null;
    }

    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isMirrored, isTestMode]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return {
    videoRef,
    isMirrored,
    facingMode,
    isCameraActive,
    hasPermission,
    errorMessage,
    isTestMode,
    startCamera,
    stopCamera,
    toggleMirror,
    toggleFacingMode,
    toggleTestMode,
    captureSnapshot,
  };
}
