import React, { useEffect, useRef } from 'react';
import { CameraOff, Sparkles, RefreshCw } from 'lucide-react';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMirrored: boolean;
  isCameraActive: boolean;
  hasPermission: boolean | null;
  errorMessage: string | null;
  isTestMode: boolean;
  onRetry: () => void;
  onEnableTestMode: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  isMirrored,
  isCameraActive: _,
  hasPermission,
  errorMessage,
  isTestMode,
  onRetry,
  onEnableTestMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // If in test mode, animate a virtual runway silhouette model
  useEffect(() => {
    if (!isTestMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      // Dark background with ambient fashion studio spotlight
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        50,
        width / 2,
        height * 0.5,
        width * 0.8
      );
      bgGrad.addColorStop(0, '#27272a');
      bgGrad.addColorStop(0.6, '#18181b');
      bgGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Floor reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.88, width * 0.35, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Animated model turning/swaying gently
      const sway = Math.sin(t) * 12;
      const turnScale = Math.cos(t * 0.5) * 0.35 + 0.65; // Simulates 3D turning
      const modelCenterX = width / 2 + sway;
      const modelY = height * 0.22;

      ctx.save();
      ctx.translate(modelCenterX, 0);

      // Head
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(0, modelY + 40, 26, 0, Math.PI * 2);
      ctx.fill();

      // Sunglasses / visor
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-14 * turnScale, modelY + 36, 28 * turnScale, 8);

      // Jacket (Cropped Olive Bomber)
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.moveTo(-45 * turnScale, modelY + 80);
      ctx.lineTo(45 * turnScale, modelY + 80);
      ctx.lineTo(38 * turnScale, modelY + 180);
      ctx.lineTo(-38 * turnScale, modelY + 180);
      ctx.closePath();
      ctx.fill();

      // Jacket zipper line
      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, modelY + 80);
      ctx.lineTo(0, modelY + 180);
      ctx.stroke();

      // Tee peaking out
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(-20 * turnScale, modelY + 180, 40 * turnScale, 15);

      // Wide Leg Pleated Trousers (Charcoal)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-36 * turnScale, modelY + 195);
      ctx.lineTo(36 * turnScale, modelY + 195);
      ctx.lineTo(44 * turnScale, modelY + 390);
      ctx.lineTo(5 * turnScale, modelY + 390);
      ctx.lineTo(0, modelY + 230);
      ctx.lineTo(-5 * turnScale, modelY + 390);
      ctx.lineTo(-44 * turnScale, modelY + 390);
      ctx.closePath();
      ctx.fill();

      // Kicks (Gum Sole Retro Trainers)
      ctx.fillStyle = '#fafaf9';
      ctx.fillRect(-45 * turnScale, modelY + 390, 36 * turnScale, 16);
      ctx.fillRect(9 * turnScale, modelY + 390, 36 * turnScale, 16);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-45 * turnScale, modelY + 406, 36 * turnScale, 6);
      ctx.fillRect(9 * turnScale, modelY + 406, 36 * turnScale, 6);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isTestMode]);

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden select-none">
      {/* Real Webcam Stream */}
      {!isTestMode && (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        />
      )}

      {/* Simulated Virtual Stream for Test Mode */}
      {isTestMode && (
        <div className="relative w-full h-full">
          <canvas
            ref={canvasRef}
            width={480}
            height={854}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 bg-purple-600/90 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase flex items-center gap-1 shadow-lg backdrop-blur-sm">
            <Sparkles className="w-3 h-3" />
            <span>Virtual Demo Feed</span>
          </div>
        </div>
      )}

      {/* Permission Denied or Camera Error State */}
      {!isTestMode && hasPermission === false && (
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
            <CameraOff className="w-8 h-8" />
          </div>
          <h3 className="text-white text-lg font-bold mb-2">Camera Access Needed</h3>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mb-6">
            {errorMessage || 'Fit Check needs camera access to capture and rate your outfit.'}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={onRetry}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Camera Permission</span>
            </button>
            <button
              onClick={onEnableTestMode}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Virtual Demo Feed</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Stream Placeholder */}
      {!isTestMode && hasPermission === null && (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center z-10 text-white">
          <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-zinc-400 font-mono">Initializing camera...</p>
        </div>
      )}
    </div>
  );
};
