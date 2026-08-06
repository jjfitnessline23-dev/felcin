import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export function logError(source, error) {
  if (!db) return;
  const user = auth?.currentUser;
  addDoc(collection(db, 'errorLogs'), {
    source,
    message: error?.message || String(error),
    code: error?.code || null,
    userId: user?.uid || null,
    userEmail: user?.email || null,
    page: window.location.pathname,
    timestamp: serverTimestamp(),
  }).catch(() => {});
}
