import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously
} from 'firebase/auth';

import firebaseAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyCPFd9PFVo6mdwAv7rGyNbdn976XrufJIE",
  authDomain: firebaseAppletConfig.authDomain || "sanpi-market.firebaseapp.com",
  projectId: firebaseAppletConfig.projectId || "sanpi-market",
  storageBucket: firebaseAppletConfig.storageBucket || "sanpi-market.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "465446427322",
  appId: firebaseAppletConfig.appId || "1:465446427322:web:2dfd2209aff731a26dc083"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseAppletConfig);

// Initialize Firestore directly with designated databaseId
export const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Authenticate session anonymously to ensure valid credentials safely
signInAnonymously(auth).catch((err) => {
  // Silent fallback if already signed in or network unavailable
  console.debug("Anonymous auth initialization:", err?.message || err);
});

// SANPI SHIPPING CONSTANT
export const SANPI_FLAT_SHIPPING_FEE = 350; // RD$ 350
export const MASTER_SECURITY_KEY = "SACHA2025";

export const DOMINICAN_PROVINCES = [
  'Distrito Nacional',
  'Santo Domingo',
  'Santiago',
  'San Cristóbal',
  'La Vega',
  'Puerto Plata',
  'San Pedro de Macorís',
  'Duarte (San Fco. de Macorís)',
  'La Altagracia (Punta Cana / Higüey)',
  'La Romana',
  'Espaillat (Moca)',
  'San Juan',
  'Valverde (Mao)',
  'Azua',
  'Barahona',
  'Monseñor Nouel (Bonao)',
  'Sánchez Ramírez (Cotui)',
  'Peravia (Baní)',
  'Hato Mayor',
  'El Seibo',
  'Samaná',
  'Monte Plata',
  'María Trinidad Sánchez',
  'Hermanas Mirabal',
  'Dajabón',
  'Monte Cristi',
  'Santiago Rodríguez',
  'Elías Piña',
  'Baoruco',
  'Independencia',
  'Pedernales',
  'San José de Ocoa'
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isUnavailable = error instanceof Error && (error.message.includes('unavailable') || error.message.includes('offline'));
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  if (isUnavailable) {
    console.info('Sanpi Firestore operating in resilient offline local cache mode:', path);
  } else {
    console.warn('Sanpi Firestore notice: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

export async function validateFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
    return true;
  } catch (error) {
    console.warn("Firestore running in offline/local synchronized state.", error);
    return false;
  }
}
