import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfGY8ySyOEi0HImEWPOFV4fSd5S6rDXng",
  authDomain: "signallab-3305b.firebaseapp.com",
  projectId: "signallab-3305b",
  storageBucket: "signallab-3305b.firebasestorage.app",
  messagingSenderId: "36308448808",
  appId: "1:36308448808:web:54686a7f03bd51cbb3671d",
  measurementId: "G-EX3PS1SLXK"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication Helpers
export const signUpWithEmail = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
};

export const loginGuest = async () => {
  const userCredential = await signInAnonymously(auth);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Project Persistence Helpers (Firestore + LocalStorage Fallback)
const LOCAL_STORAGE_KEY = 'rei_signallab_local_projects';

const getLocalProjects = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalProjects = (projects) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }
};

export const saveUserProject = async (user, projectData) => {
  const projectId = projectData.id || `proj_${Date.now()}`;
  const nowISO = new Date().toISOString();

  const projectPayload = {
    ...projectData,
    id: projectId,
    title: projectData.title || 'Untitled SignalLab Project',
    updatedAt: nowISO,
    userId: user ? user.uid : 'guest',
    userEmail: user ? (user.email || 'Guest User') : 'Guest User'
  };

  // 1. Always save to LocalStorage for instant offline availability
  const localProjects = getLocalProjects();
  const existingIdx = localProjects.findIndex(p => p.id === projectId);
  if (existingIdx >= 0) {
    localProjects[existingIdx] = projectPayload;
  } else {
    localProjects.unshift(projectPayload);
  }
  saveLocalProjects(localProjects);

  // 2. If authenticated user, save to Cloud Firestore
  if (user && !user.isAnonymous) {
    try {
      const projRef = doc(db, `users/${user.uid}/projects`, projectId);
      await setDoc(projRef, {
        ...projectPayload,
        updatedAtServer: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore cloud save failed, saved locally:', e.message);
    }
  }

  return projectPayload;
};

export const fetchUserProjects = async (user) => {
  const localProjects = getLocalProjects();

  if (!user || user.isAnonymous) {
    return localProjects;
  }

  try {
    const q = query(
      collection(db, `users/${user.uid}/projects`),
      orderBy('updatedAtServer', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const cloudProjects = [];
    querySnapshot.forEach((docSnap) => {
      cloudProjects.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (cloudProjects.length > 0) {
      return cloudProjects;
    }
  } catch (e) {
    console.warn('Firestore fetch failed, using local projects:', e.message);
  }

  return localProjects;
};

export const deleteUserProject = async (user, projectId) => {
  // 1. Delete from LocalStorage
  const localProjects = getLocalProjects().filter(p => p.id !== projectId);
  saveLocalProjects(localProjects);

  // 2. Delete from Firestore if authenticated
  if (user && !user.isAnonymous) {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/projects`, projectId));
    } catch (e) {
      console.warn('Firestore delete failed:', e.message);
    }
  }
};
