/**
 * Firebase client SDK initialisation for the Rinzo Admin panel (Vite / web).
 *
 * Reads config from VITE_FIREBASE_* environment variables.
 * Exports helpers consumed by auth.tsx and backendApi.ts.
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// DEBUG — remove after confirming Firebase loads correctly
console.log("FIREBASE CONFIG:", firebaseConfig);

/**
 * Firebase is considered configured when the minimum required
 * fields (apiKey + projectId) are present.
 */
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let firebaseAuth: Auth | null = null;

if (isFirebaseConfigured) {
  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  firebaseAuth = getAuth(app);
}

export function getFirebaseAuth(): Auth | null {
  return firebaseAuth;
}
