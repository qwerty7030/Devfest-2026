import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore, limit, orderBy, query, setDoc } from 'firebase/firestore/lite';
import { scoreRecord, type ScoreRecord } from './scoreRecord';
import type { FitPost } from './fitFeed';

// Firebase browser app identifiers are public. This is NOT the Gemini key.
export const firebaseConfig = {
  apiKey: 'AIzaSyAj2mH783L7sE_JMgkStTSibcebNr_I-pw',
  authDomain: 'devfest2026-41803.firebaseapp.com', projectId: 'devfest2026-41803',
  appId: '1:390529009617:web:c7adc802ceec2c405ac2f0',
};
let identity: Promise<string> | undefined;
const writes = new Map<string, Promise<void>>();
async function scores() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  identity ??= (async () => { await auth.authStateReady(); return auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid; })().catch(e => { identity = undefined; throw e; });
  const uid = await identity;
  return { db: getFirestore(app), uid };
}
export async function saveCloudScore(post: FitPost) {
  const pending = writes.get(post.id); if (pending) return pending;
  const write = persist(post).finally(() => writes.delete(post.id));
  writes.set(post.id, write); return write;
}
async function persist(post: FitPost) {
  const { db, uid } = await scores();
  await setDoc(doc(db, 'users', uid, 'scores', post.id), scoreRecord(post));
}
export async function loadCloudScores(): Promise<ScoreRecord[]> {
  const { db, uid } = await scores();
  const result = await getDocs(query(collection(db, 'users', uid, 'scores'), orderBy('timestamp', 'desc'), limit(100)));
  return result.docs.map(d => ({ ...d.data(), id: d.id }) as ScoreRecord);
}
export async function deleteCloudScore(id: string) {
  await writes.get(id);
  const { db, uid } = await scores(); await deleteDoc(doc(db, 'users', uid, 'scores', id));
}
