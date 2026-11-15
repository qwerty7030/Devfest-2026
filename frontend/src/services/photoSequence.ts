interface PhotoSequence {
  capture: () => string | null;
  onPose: (index: number) => void;
  onTick: (count: number | null) => void;
  onPhoto: (photo: string) => void;
  onComplete: (photos: string[]) => void;
  onError: () => void;
}
/** Three hands-free photos. Every pose gets its own full three-second countdown. */
export function startPhotoSequence(callbacks: PhotoSequence) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const photos: string[] = [];
  const later = (fn: () => void, ms: number) => { timer = setTimeout(() => { if (!stopped) fn(); }, ms); };
  const pose = () => { callbacks.onPose(photos.length); callbacks.onTick(null); later(() => tick(3), 1200); };
  const tick = (count: number) => {
    callbacks.onTick(count);
    later(() => {
      if (count > 1) { tick(count - 1); return; }
      const photo = callbacks.capture();
      if (!photo) { callbacks.onTick(null); callbacks.onError(); return; }
      photos.push(photo); callbacks.onPhoto(photo); callbacks.onTick(null);
      if (photos.length === 3) later(() => callbacks.onComplete(photos), 400);
      else later(pose, 600);
    }, 1000);
  };
  pose();
  return () => { stopped = true; clearTimeout(timer); };
}
