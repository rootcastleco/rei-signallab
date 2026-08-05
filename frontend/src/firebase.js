import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDfGY8ySyOEi0HImEWPOFV4fSd5S6rDXng",
  authDomain: "signallab-3305b.firebaseapp.com",
  projectId: "signallab-3305b",
  storageBucket: "signallab-3305b.firebasestorage.app",
  messagingSenderId: "36308448808",
  appId: "1:36308448808:web:54686a7f03bd51cbb3671d",
  measurementId: "G-EX3PS1SLXK"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
