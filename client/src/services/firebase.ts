import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCeIjhZkNYbK_o_Rlbs03zIIQHxkwrgj-c',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'billmate-6d1a2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'billmate-6d1a2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'billmate-6d1a2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1099199682233',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1099199682233:web:7a562f78b669a4d5ec6d68',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'demo-api-key'
);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Enable high-speed persistent IndexedDB caching so Firestore reads take 0ms
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

export default app;

