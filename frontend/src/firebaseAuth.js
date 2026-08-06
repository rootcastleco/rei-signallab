import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
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
export const signUpWithEmail = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(userCredential.user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('Profile name update failed:', e);
    }
  }
  return userCredential.user;
};

export const loginWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  } catch (popupErr) {
    console.warn('Google Popup login failed/blocked, trying Redirect mode:', popupErr.code, popupErr.message);
    if (
      popupErr.code === 'auth/popup-blocked' ||
      popupErr.code === 'auth/popup-closed-by-user' ||
      popupErr.code === 'auth/cancelled-popup-request'
    ) {
      // Fallback to full page redirect if popup is blocked
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw popupErr;
  }
};

export const resetUserPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
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

// Friendly Error Translator
export const formatAuthError = (err) => {
  const code = err.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda. Giriş yapmayı deneyin veya şifrenizi sıfırlayın.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. Şifreniz en az 6 karakter olmalıdır.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi biçimi.';
    case 'auth/popup-blocked':
      return 'Google giriş penceresi engellendi. Lütfen tarayıcı açılır pencere engelleyicisini kapatın.';
    case 'auth/popup-closed-by-user':
      return 'Google giriş penceresi kapatıldı.';
    case 'auth/unauthorized-domain':
      return 'Bu alan adı (domain) Firebase Auth kabul listesinde onaylanmamış. Firebase Console > Authentication > Settings bölümünden bu domaini ekleyin.';
    case 'auth/operation-not-allowed':
      return 'Google/E-posta ile giriş yöntemi Firebase Console üzerinde henüz aktif edilmemiş. Lütfen Firebase Console > Authentication bölümünden oturum sağlayıcıyı aktif edin.';
    default:
      return err.message ? err.message.replace('Firebase: ', '') : 'Oturum açma hatası oluştu.';
  }
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

  const localProjects = getLocalProjects();
  const existingIdx = localProjects.findIndex(p => p.id === projectId);
  if (existingIdx >= 0) {
    localProjects[existingIdx] = projectPayload;
  } else {
    localProjects.unshift(projectPayload);
  }
  saveLocalProjects(localProjects);

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
  const localProjects = getLocalProjects().filter(p => p.id !== projectId);
  saveLocalProjects(localProjects);

  if (user && !user.isAnonymous) {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/projects`, projectId));
    } catch (e) {
      console.warn('Firestore delete failed:', e.message);
    }
  }
};
