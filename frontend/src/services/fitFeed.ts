import type { FitResult } from '../types/fitCheck';
export type FitPost = FitResult & { id: string; scoreSync?: 'pending' | 'saved' };
const memory = new Map<string, FitPost>();
let notice = '';
export const feedNotice = () => notice;
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fitcheck-looks', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('looks', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Drip Score tabs to save your looks.'));
  });
}
async function saveLocal(post: FitPost) {
  memory.set(post.id, post);
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('looks', 'readwrite'); tx.objectStore('looks').put(post);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export async function saveLook(post: FitPost) {
  const pending: FitPost = { ...post, scoreSync: post.source === 'demo' ? undefined : 'pending' };
  let localSaved = false;
  try { await saveLocal(pending); localSaved = true; } catch { memory.set(post.id, pending); }
  if (post.source !== 'demo') {
    try {
      const cloud = await import('./firebaseScores'); await cloud.saveCloudScore(post);
      pending.scoreSync = 'saved'; memory.set(post.id, pending);
      if (localSaved) await saveLocal(pending);
      notice = '';
    } catch { notice = 'Score sync is paused. Your look is saved on this browser; reopen My looks to retry.'; }
  }
  if (!localSaved) throw new Error('Photos could not be saved on this browser. Keep this tab open to download them.');
}
export async function loadLooks(): Promise<FitPost[]> {
  notice = '';
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    const saved = await new Promise<FitPost[]>((resolve, reject) => {
      const request = db!.transaction('looks').objectStore('looks').getAll();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    for (const post of saved) if (!memory.has(post.id)) memory.set(post.id, post);
  } catch { notice = 'Photos are available for this visit only because browser storage is unavailable.'; }
  finally { db?.close(); }
  try {
    const cloud = await import('./firebaseScores');
    // Backfill older local reports and retry pending writes without repeating AI calls.
    for (const post of currentLooks().filter(p => p.source === 'ai' && p.scoreSync !== 'saved').slice(0, 20)) {
      await cloud.saveCloudScore(post); post.scoreSync = 'saved';
      try { await saveLocal(post); } catch { /* Photos remain in session memory. */ }
    }
    for (const record of await cloud.loadCloudScores()) {
      const local = memory.get(record.id);
      memory.set(record.id, { summary: '', caption: '', likesCount: 0, garments: [], topComments: [], capturedPhotos: [],
        ...local, ...record, scoreSync: 'saved' });
    }
  } catch { notice = 'Firestore is unavailable. Showing browser-saved looks; reopen this page to retry score sync.'; }
  return currentLooks();
}
export function currentLooks() { return [...memory.values()].sort((a, b) => b.timestamp - a.timestamp); }
export async function deleteLook(id: string) {
  const post = memory.get(id);
  if (post?.source !== 'demo') {
    const cloud = await import('./firebaseScores'); await cloud.deleteCloudScore(id);
  }
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('looks', 'readwrite'); tx.objectStore('looks').delete(id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); memory.delete(id); } finally { db.close(); }
}
