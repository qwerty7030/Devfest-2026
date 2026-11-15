import React, { useEffect, useRef } from 'react';
import { ArrowRight, CameraOff, RefreshCw } from 'lucide-react';

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
    <div className="camera-preview">
      {/* Real Webcam Stream */}
      {!isTestMode && (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          playsInline
          autoPlay
          muted
          className={`camera-video${isMirrored ? ' is-mirrored' : ''}`}
        />
      )}

      {/* Simulated Virtual Stream for Test Mode */}
      {isTestMode && (
        <>
          <canvas
            data-demo-camera
            ref={canvasRef}
            width={480}
            height={854}
            className="camera-video"
          />
          {/* Vertical paper tag on the right edge keeps the centre and both bands clear */}
          <span className="demo-feed-tag"><span className="dot" aria-hidden="true"/>Virtual Demo Feed</span>
        </>
      )}

      {/* Permission Denied or Camera Error State */}
      {!isTestMode && hasPermission === false && (
        <div className="camera-error" role="alert">
          <p className="mono-label camera-error__eyebrow"><CameraOff size={14} strokeWidth={1.75} aria-hidden="true"/>Studio / Camera</p>
          <h2 className="display camera-error__title">Camera Access Needed {'//'}</h2>
          <p className="camera-error__body">
            {errorMessage || 'oko needs camera access to capture and rate your outfit.'}
          </p>
          <div className="camera-error__actions">
            <button className="btn-paper" onClick={onEnableTestMode}>
              <span>Launch Virtual Demo Feed</span><ArrowRight size={20} strokeWidth={1.75} aria-hidden="true"/>
            </button>
            <button className="btn-smoke" onClick={onRetry}>
              <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true"/><span>Retry Camera Permission</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
