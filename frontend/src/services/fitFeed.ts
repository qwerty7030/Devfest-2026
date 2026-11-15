import type { FitResult } from '../types/fitCheck';
export type FitPost = FitResult & { id: string };
const memory = new Map<string, FitPost>();
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fitcheck-looks', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('looks', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Drip Score tabs to save your looks.'));
  });
}
export async function saveLook(post: FitPost) {
  memory.set(post.id, post);
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('looks', 'readwrite'); tx.objectStore('looks').put(post);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export async function loadLooks(): Promise<FitPost[]> {
  const db = await database();
  try {
    const saved = await new Promise<FitPost[]>((resolve, reject) => {
      const request = db.transaction('looks').objectStore('looks').getAll();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    for (const post of saved) if (!memory.has(post.id)) memory.set(post.id, post);
    return currentLooks();
  } finally { db.close(); }
}
export function currentLooks() { return [...memory.values()].sort((a, b) => b.timestamp - a.timestamp); }
export async function deleteLook(id: string) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('looks', 'readwrite'); tx.objectStore('looks').delete(id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); memory.delete(id); } finally { db.close(); }
}
