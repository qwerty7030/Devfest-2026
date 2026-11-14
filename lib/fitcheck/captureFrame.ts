let canvas: HTMLCanvasElement | null = null;

/**
 * Grabs the current video frame, scaled to `width` px wide, as base64 JPEG
 * (no `data:` prefix). Returns null if the video isn't ready yet.
 */
export function captureFrame(video: HTMLVideoElement, width = 512, quality = 0.7): string | null {
  if (video.readyState < 2 || !video.videoWidth) return null;
  const scale = width / video.videoWidth;
  const height = Math.round(video.videoHeight * scale);

  canvas ??= document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
