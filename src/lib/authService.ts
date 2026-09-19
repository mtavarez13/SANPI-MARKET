import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInAnonymously,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, StorePlan, CustomerShippingAddress } from '../types';
import { sendWelcomeEmail } from './emailService';
import { sanpiManager } from './storeManager';

export const SUPER_ADMIN_EMAILS = [
  'martin.tavarez.gomez@gmail.com'
];

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase().trim() === email.toLowerCase().trim());
}

export interface PersistentRoleAssignment {
  role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
  email?: string;
  uid?: string;
  phone?: string;
  province?: string;
  plan?: StorePlan;
  storeName?: string;
  companyName?: string;
  apiKey?: string;
  isProviderApproved?: boolean;
  assignedBy?: string;
  assignedAt: string;
}

const ROLE_ASSIGNMENTS_STORAGE_KEY = 'sanpi_role_assignments';

export const DEFAULT_PERSISTENT_ASSIGNMENTS: Record<string, PersistentRoleAssignment> = {
  'jl3rcrbikzwcdw08nlf8kwlocjb3': {
    role: 'admin',
    email: 'sanpimarkeplace@gmail.com',
    uid: 'jl3RcRbikZWCdw08NLf8kWLOcJB3',
    assignedBy: 'system_admin',
    assignedAt: '2026-09-14T00:00:00.000Z'
  },
  'jl3RcRbikZWCdw08NLf8kWLOcJB3': {
    role: 'admin',
    email: 'sanpimarkeplace@gmail.com',
    uid: 'jl3RcRbikZWCdw08NLf8kWLOcJB3',
    assignedBy: 'system_admin',
    assignedAt: '2026-09-14T00:00:00.000Z'
  },
  'sanpimarkeplace@gmail.com': {
    role: 'admin',
    email: 'sanpimarkeplace@gmail.com',
    uid: 'jl3RcRbikZWCdw08NLf8kWLOcJB3',
    assignedBy: 'system_admin',
    assignedAt: '2026-09-14T00:00:00.000Z'
  },
  'sanpimarketplace@gmail.com': {
    role: 'admin',
    email: 'sanpimarketplace@gmail.com',
    uid: 'jl3RcRbikZWCdw08NLf8kWLOcJB3',
    assignedBy: 'system_admin',
    assignedAt: '2026-09-14T00:00:00.000Z'
  }
};

export function getAllPersistentRoleAssignments(): Record<string, PersistentRoleAssignment> {
  const defaults: Record<string, PersistentRoleAssignment> = { ...DEFAULT_PERSISTENT_ASSIGNMENTS };
  try {
    const raw = localStorage.getItem(ROLE_ASSIGNMENTS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, PersistentRoleAssignment>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function getPersistentRoleAssignment(email?: string | null, uid?: string | null): PersistentRoleAssignment | null {
  const assignments = getAllPersistentRoleAssignments();
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    if (assignments[cleanEmail]) return assignments[cleanEmail];
  }
  if (uid) {
    if (assignments[uid]) return assignments[uid];
    const cleanUid = uid.trim().toLowerCase();
    if (assignments[cleanUid]) return assignments[cleanUid];
  }
  return null;
}

/**
 * Asynchronously fetches a persistent role assignment from Firestore or local cache.
 * Ensures that if an admin changes a role, it is never lost across sessions or devices.
 */
export async function fetchPersistentRoleAssignment(email?: string | null, uid?: string | null): Promise<PersistentRoleAssignment | null> {
  const local = getPersistentRoleAssignment(email, uid);
  
  // Try querying live Firestore collection 'user_role_assignments' to guarantee freshest persistent state
  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const emailKey = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') : '';

    if (uid) {
      const snap = await getDoc(doc(db, 'user_role_assignments', uid));
      if (snap.exists()) {
        const data = snap.data() as PersistentRoleAssignment;
        if (data && data.role) {
          savePersistentRoleAssignment({
            uid: data.uid || uid,
            email: data.email || cleanEmail,
            role: data.role,
            plan: data.plan,
            storeName: data.storeName,
            companyName: data.companyName,
            apiKey: data.apiKey,
            isProviderApproved: data.isProviderApproved,
            assignedBy: data.assignedBy
          });
          return data;
        }
      }
    }

    if (emailKey) {
      const emailSnap = await getDoc(doc(db, 'user_role_assignments', emailKey));
      if (emailSnap.exists()) {
        const data = emailSnap.data() as PersistentRoleAssignment;
        if (data && data.role) {
          savePersistentRoleAssignment({
            uid: data.uid || uid || emailKey,
            email: data.email || cleanEmail,
            role: data.role,
            plan: data.plan,
            storeName: data.storeName,
            companyName: data.companyName,
            apiKey: data.apiKey,
            isProviderApproved: data.isProviderApproved,
            assignedBy: data.assignedBy
          });
          return data;
        }
      }
    }
  } catch (err) {
    console.debug('Firestore persistent role assignment lookup notice:', err);
  }

  return local;
}

export function savePersistentRoleAssignment(params: {
  uid: string;
  email?: string;
  role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
  plan?: StorePlan;
  storeName?: string;
  companyName?: string;
  apiKey?: string;
  isProviderApproved?: boolean;
  assignedBy?: string;
}): PersistentRoleAssignment {
  const assignments = getAllPersistentRoleAssignments();
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : undefined;
  
  const record: PersistentRoleAssignment = {
    role: params.role,
    email: cleanEmail,
    uid: params.uid,
    plan: params.plan,
    storeName: params.storeName,
    companyName: params.companyName,
    apiKey: params.apiKey,
    isProviderApproved: params.isProviderApproved,
    assignedBy: params.assignedBy || 'admin_master',
    assignedAt: new Date().toISOString()
  };

  if (params.uid) {
    assignments[params.uid] = record;
    assignments[params.uid.trim().toLowerCase()] = record;
  }
  if (cleanEmail) {
    assignments[cleanEmail] = record;
  }

  try {
    localStorage.setItem(ROLE_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  } catch (e) {
    console.debug('Failed to write role assignments to localStorage', e);
  }

  // Also persist to Firestore user_role_assignments asynchronously
  try {
    if (params.uid) {
      setDoc(doc(db, 'user_role_assignments', params.uid), record, { merge: true }).catch(() => {});
    }
    if (cleanEmail) {
      const emailDocKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      setDoc(doc(db, 'user_role_assignments', emailDocKey), record, { merge: true }).catch(() => {});
    }
  } catch {}

  return record;
}

/**
 * Generates a memorable, unique Referral Code based on user role and identity
 */
export function generateUserReferralCode(
  role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin',
  name: string,
  email: string,
  storeName?: string
): string {
  const baseSource = (role === 'partner' && storeName ? storeName : name) || email.split('@')[0] || 'SANPI';
  const cleanBase = baseSource
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  
  if (role === 'partner') {
    return `SANPI-STORE-${cleanBase || 'TIENDA'}${randomSuffix.toString().slice(-2)}`;
  } else if (role === 'dropshipper') {
    return `SANPI-DS-${cleanBase || 'PRO'}${randomSuffix.toString().slice(-2)}`;
  } else if (role === 'supplier') {
    return `SANPI-PROV-${cleanBase || 'MAYORISTA'}${randomSuffix.toString().slice(-2)}`;
  } else if (role === 'carrier') {
    return `SANPI-CARRIER-${cleanBase || 'LOGISTICA'}${randomSuffix.toString().slice(-2)}`;
  } else if (role === 'admin') {
    return `SANPI-ADMIN-MASTER`;
  }
  return `SANPI-VIP-${cleanBase || 'USER'}${randomSuffix.toString().slice(-2)}`;
}

export function generateCarrierApiKey(companyName: string): string {
  const cleanPrefix = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'courier';
  const randomToken = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return `sanpi_live_${cleanPrefix}_${randomToken}`;
}

export const DEFAULT_REGISTERED_USERS: UserProfile[] = [
  {
    uid: 'admin_martin_master',
    email: 'martin.tavarez.gomez@gmail.com',
    displayName: 'Martín Tavárez Gómez (Super Admin)',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    phone: '809-555-0100',
    province: 'Distrito Nacional',
    companyName: 'Sanpi Market Dominicana SRL',
    referralCode: 'SANPI-ADMIN-MASTER',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    uid: 'partner_tecnostore',
    email: 'alejandro@tecnostorerd.com',
    displayName: 'Alejandro Morales',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'partner',
    storeName: 'TecnoStore RD',
    plan: 'enterprise',
    phone: '829-450-2020',
    province: 'Santiago',
    referralCode: 'SANPI-STORE-TECNO88',
    createdAt: '2026-02-10T10:00:00.000Z'
  },
  {
    uid: 'partner_modaexpress',
    email: 'paola@modaexpressrd.com',
    displayName: 'Paola Santana',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'partner',
    storeName: 'Moda Express Caribe',
    plan: 'pro',
    phone: '809-770-3344',
    province: 'Distrito Nacional',
    referralCode: 'SANPI-STORE-MODA42',
    createdAt: '2026-02-15T11:30:00.000Z'
  },
  {
    uid: 'dropship_carlos',
    email: 'carlos.dropship@gmail.com',
    displayName: 'Carlos Gómez',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'dropshipper',
    phone: '809-663-8899',
    province: 'Santo Domingo',
    referralCode: 'SANPI-DS-CARLOS91',
    createdAt: '2026-02-18T14:15:00.000Z'
  },
  {
    uid: 'dropship_andrea',
    email: 'andrea.ventasrd@gmail.com',
    displayName: 'Andrea Ramírez',
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    role: 'dropshipper',
    phone: '849-332-9011',
    province: 'La Vega',
    referralCode: 'SANPI-DS-ANDREA55',
    createdAt: '2026-02-22T09:40:00.000Z'
  },
  {
    uid: 'prov_mayorista_caribe',
    email: 'proveedor@mayoristacaribe.com.do',
    displayName: 'Ing. Roberto Almonte',
    companyName: 'Importadora Mayorista del Caribe SRL',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    role: 'supplier',
    supplierCategory: 'Tecnología & Gadgets',
    isProviderApproved: true,
    rnc: '131-89745-2',
    phone: '809-540-8800',
    province: 'Distrito Nacional',
    referralCode: 'SANPI-PROV-CARIBE22',
    createdAt: '2026-02-01T10:00:00.000Z'
  },
  {
    uid: 'prov_belleza_glow',
    email: 'ventas@bellezaglow.do',
    displayName: 'Carmen Vidal',
    companyName: 'Distribuidora Belleza Glow Oriental',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    role: 'supplier',
    supplierCategory: 'Belleza & Cuidado Personal',
    isProviderApproved: true,
    rnc: '132-44589-1',
    phone: '829-887-1234',
    province: 'Santo Domingo',
    referralCode: 'SANPI-PROV-GLOW19',
    createdAt: '2026-02-05T12:00:00.000Z'
  },
  {
    uid: 'carrier_sacha_pack',
    email: 'operaciones@sachapack.com',
    displayName: 'Lic. Fernando Castillo',
    companyName: 'Sacha Pack Logística & Couriers SRL',
    photoURL: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    role: 'carrier',
    apiKey: 'sanpi_live_sacha_pack_9921ab44',
    coverageProvinces: ['Todas las 32 Provincias'],
    phone: '809-567-7224',
    province: 'Distrito Nacional',
    referralCode: 'SANPI-CARRIER-SACHA01',
    createdAt: '2026-01-15T08:00:00.000Z'
  },
  {
    uid: 'carrier_vimenpaq',
    email: 'api@vimenpaq.com.do',
    displayName: 'Lic. Manuel De Los Santos',
    companyName: 'Vimenpaq Logística Express',
    photoURL: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    role: 'carrier',
    apiKey: 'sanpi_live_vimenpaq_8832fc11',
    coverageProvinces: ['Cibao', 'Metro', 'Este', 'Sur'],
    phone: '809-532-7381',
    province: 'Distrito Nacional',
    referralCode: 'SANPI-CARRIER-VIMEN77',
    createdAt: '2026-02-01T08:00:00.000Z'
  },
  {
    uid: 'cust_juan_perez',
    email: 'juan.perez@gmail.com',
    displayName: 'Juan Pérez',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    role: 'customer',
    phone: '809-555-1212',
    province: 'Santiago',
    referralCode: 'SANPI-VIP-JUAN12',
    createdAt: '2026-03-01T15:20:00.000Z'
  },
  {
    uid: 'jl3RcRbikZWCdw08NLf8kWLOcJB3',
    email: 'sanpimarkeplace@gmail.com',
    displayName: 'Sanpi Marketplace',
    companyName: 'Sanpi Marketplace Dominicana',
    photoURL: 'https://api.dicebear.com/7.x/initials/svg?seed=sanpimarkeplace%40gmail.com',
    role: 'admin',
    phone: '809-555-0199',
    province: 'Distrito Nacional',
    referralCode: 'SANPI-ADMIN-SP01',
    welcomeEmailSent: true,
    createdAt: '2026-09-14T00:00:00.000Z'
  },
  {
    uid: 'user_google_sanpimarketplace',
    email: 'sanpimarketplace@gmail.com',
    displayName: 'Sanpi Marketplace',
    companyName: 'Sanpi Marketplace Dominicana',
    photoURL: 'https://api.dicebear.com/7.x/initials/svg?seed=sanpimarketplace%40gmail.com',
    role: 'admin',
    phone: '809-555-0199',
    province: 'Distrito Nacional',
    referralCode: 'SANPI-ADMIN-SP02',
    welcomeEmailSent: true,
    createdAt: '2026-09-14T00:00:00.000Z'
  }
];

export function cacheRegisteredUserLocally(profile: UserProfile): void {
  try {
    const rawLocal = localStorage.getItem('sanpi_registered_users');
    let registeredList: UserProfile[] = rawLocal ? JSON.parse(rawLocal) : [];
    const cleanEmail = profile.email ? profile.email.trim().toLowerCase() : '';
    registeredList = registeredList.filter(u => u.uid !== profile.uid && (!cleanEmail || u.email?.toLowerCase().trim() !== cleanEmail));
    registeredList.unshift(profile);
    localStorage.setItem('sanpi_registered_users', JSON.stringify(registeredList));
  } catch {}
}

/**
 * Searches all registered sources (Super Admin, defaults, persistent assignments,
 * local storage registry, and Firestore collections) to determine if a user is registered.
 * Returns the registered UserProfile or null.
 * Enforces any persistent role changes made by administrators so they are never lost.
 */
export async function findRegisteredUser(emailOrUid?: string | null): Promise<UserProfile | null> {
  if (!emailOrUid) return null;
  const clean = emailOrUid.trim().toLowerCase();
  if (!clean) return null;

  // 1. Super Admin check
  if (isSuperAdmin(clean)) {
    const adminDefault = DEFAULT_REGISTERED_USERS.find(u => isSuperAdmin(u.email));
    return adminDefault || {
      uid: 'admin_martin_master',
      email: clean,
      displayName: 'Martín Tavárez Gómez (Super Admin)',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
      phone: '809-555-0100',
      province: 'Distrito Nacional',
      companyName: 'Sanpi Market Dominicana SRL',
      referralCode: 'SANPI-ADMIN-MASTER',
      createdAt: '2026-01-01T08:00:00.000Z'
    };
  }

  // Pre-fetch persistent role assignment from cache or Firestore to guarantee freshest assigned role
  await fetchPersistentRoleAssignment(clean, emailOrUid);

  const applyPersistentRole = (prof: UserProfile): UserProfile => {
    if (isSuperAdmin(prof.email)) {
      return { ...prof, role: 'admin' };
    }
    const cleanEmail = prof.email ? prof.email.trim().toLowerCase() : '';
    const persistent = getPersistentRoleAssignment(cleanEmail, prof.uid);
    if (persistent && persistent.role) {
      return {
        ...prof,
        role: persistent.role,
        plan: persistent.plan || prof.plan,
        storeName: persistent.storeName || prof.storeName,
        companyName: persistent.companyName || prof.companyName,
        apiKey: persistent.apiKey || prof.apiKey,
        isProviderApproved: persistent.isProviderApproved !== undefined ? persistent.isProviderApproved : prof.isProviderApproved
      };
    }
    return prof;
  };

  // 2. Check DEFAULT_REGISTERED_USERS
  const inDefaults = DEFAULT_REGISTERED_USERS.find(u => 
    u.email?.toLowerCase().trim() === clean || u.uid === emailOrUid || (u.uid && u.uid.toLowerCase() === clean)
  );
  if (inDefaults) {
    return applyPersistentRole(inDefaults);
  }

  // 3. Check persistent role assignments directly
  const assignments = getAllPersistentRoleAssignments();
  const directAssignment = assignments[clean] || assignments[emailOrUid];
  if (directAssignment && directAssignment.role) {
    const dispName = directAssignment.companyName || directAssignment.storeName || 'Usuario Asignado';
    return {
      uid: directAssignment.uid || emailOrUid || `user_${Date.now()}`,
      email: directAssignment.email || (clean.includes('@') ? clean : ''),
      displayName: dispName,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dispName)}`,
      role: directAssignment.role,
      plan: directAssignment.plan,
      storeName: directAssignment.storeName,
      companyName: directAssignment.companyName,
      apiKey: directAssignment.apiKey,
      phone: '809-000-0000',
      province: 'Distrito Nacional',
      createdAt: directAssignment.assignedAt || new Date().toISOString()
    };
  }

  // 4. Check localStorage registered users list
  try {
    const rawLocal = localStorage.getItem('sanpi_registered_users');
    if (rawLocal) {
      const list = JSON.parse(rawLocal) as UserProfile[];
      const found = list.find(u => 
        u.email?.toLowerCase().trim() === clean || u.uid === emailOrUid
      );
      if (found) return applyPersistentRole(found);
    }
  } catch (err) {
    console.debug('Local registered users cache lookup warning:', err);
  }

  // 5. Check Firestore collections
  const emailKey = clean.includes('@') ? clean.replace(/[^a-zA-Z0-9]/g, '_') : '';
  
  try {
    if (emailKey) {
      const emailSnap = await getDoc(doc(db, 'marketplace_users', emailKey));
      if (emailSnap.exists()) {
        const profile = applyPersistentRole(emailSnap.data() as UserProfile);
        cacheRegisteredUserLocally(profile);
        return profile;
      }
      const uSnap = await getDoc(doc(db, 'users', emailKey));
      if (uSnap.exists()) {
        const profile = applyPersistentRole(uSnap.data() as UserProfile);
        cacheRegisteredUserLocally(profile);
        return profile;
      }
    }

    const uidSnap = await getDoc(doc(db, 'marketplace_users', emailOrUid));
    if (uidSnap.exists()) {
      const profile = applyPersistentRole(uidSnap.data() as UserProfile);
      cacheRegisteredUserLocally(profile);
      return profile;
    }
    const uidSnap2 = await getDoc(doc(db, 'users', emailOrUid));
    if (uidSnap2.exists()) {
      const profile = applyPersistentRole(uidSnap2.data() as UserProfile);
      cacheRegisteredUserLocally(profile);
      return profile;
    }
  } catch (e) {
    console.debug('Direct doc lookup in Firestore notice:', e);
  }

  // Query by email
  if (clean.includes('@')) {
    try {
      const qMarket = query(collection(db, 'marketplace_users'), where('email', '==', clean));
      const qSnap = await getDocs(qMarket);
      if (!qSnap.empty) {
        const profile = applyPersistentRole(qSnap.docs[0].data() as UserProfile);
        cacheRegisteredUserLocally(profile);
        return profile;
      }
    } catch {}

    try {
      const qUsers = query(collection(db, 'users'), where('email', '==', clean));
      const qUsersSnap = await getDocs(qUsers);
      if (!qUsersSnap.empty) {
        const profile = applyPersistentRole(qUsersSnap.docs[0].data() as UserProfile);
        cacheRegisteredUserLocally(profile);
        return profile;
      }
    } catch {}

    try {
      const qStores = query(collection(db, 'stores'), where('ownerEmail', '==', clean));
      const qStoresSnap = await getDocs(qStores);
      if (!qStoresSnap.empty) {
        const storeData = qStoresSnap.docs[0].data();
        const dispName = storeData.ownerName || storeData.name || 'Socio Tienda';
        const profile: UserProfile = applyPersistentRole({
          uid: storeData.ownerId || `partner_${qStoresSnap.docs[0].id}`,
          email: clean,
          displayName: dispName,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dispName)}`,
          role: 'partner',
          storeName: storeData.name,
          phone: storeData.phone || '809-000-0000',
          province: storeData.province || 'Distrito Nacional',
          createdAt: storeData.createdAt || new Date().toISOString()
        });
        cacheRegisteredUserLocally(profile);
        return profile;
      }
    } catch {}

    try {
      const qSubs = query(collection(db, 'marketplace_subscriptions'), where('email', '==', clean));
      const qSubsSnap = await getDocs(qSubs);
      if (!qSubsSnap.empty) {
        const subData = qSubsSnap.docs[0].data();
        const dispName = subData.ownerName || subData.storeName || 'Socio Tienda';
        const profile: UserProfile = applyPersistentRole({
          uid: `sub_${qSubsSnap.docs[0].id}`,
          email: clean,
          displayName: dispName,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dispName)}`,
          role: 'partner',
          storeName: subData.storeName,
          phone: subData.phone || '809-000-0000',
          province: subData.province || 'Distrito Nacional',
          plan: subData.plan || 'pro',
          createdAt: subData.requestedAt || new Date().toISOString()
        });
        cacheRegisteredUserLocally(profile);
        return profile;
      }
    } catch {}
  }

  return null;
}

/**
 * Returns true if the email is registered in Sanpi Market.
 */
export async function isEmailRegistered(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const user = await findRegisteredUser(email);
  return user !== null;
}

export function getGoogleAuthProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}

export async function signInWithGoogle(registrationOptions?: {
  role?: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier';
  plan?: StorePlan;
  storeName?: string;
  companyName?: string;
  rnc?: string;
  phone?: string;
  province?: string;
  referredByCode?: string;
  isRegistration?: boolean;
}): Promise<{ user: FirebaseUser | null; profile: UserProfile | null; error?: string; isNewUser?: boolean; notRegistered?: boolean }> {
  try {
    const provider = getGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const fbUser = result.user;
    const cleanEmail = fbUser.email ? fbUser.email.trim().toLowerCase() : '';
    const isUserAdmin = isSuperAdmin(cleanEmail);

    // CRITICAL: Check if this user is already registered in the system
    const existingRegisteredUser = await findRegisteredUser(cleanEmail || fbUser.uid);
    const isRegistrationFlow = Boolean(registrationOptions?.isRegistration);

    // If NOT registered, NOT registration flow, and NOT super admin -> BLOCK ACCESS IMMEDIATELY
    if (!existingRegisteredUser && !isRegistrationFlow && !isUserAdmin) {
      console.warn(`[Sanpi Security] Blocked login for unregistered email: ${fbUser.email}`);
      await signOut(auth).catch(() => {});
      localStorage.removeItem('sanpi_auth_user');
      return {
        user: null,
        profile: null,
        error: `El correo "${fbUser.email}" no está registrado en Sanpi Market. Por seguridad, no se permite el acceso a correos no registrados. Si deseas crear una cuenta, hazlo desde la pestaña "Crear Cuenta (Registro)".`,
        notRegistered: true
      };
    }
    
    // Check if Super Admin assigned a permanent role to this user
    const persistentAssignment = getPersistentRoleAssignment(fbUser.email, fbUser.uid);
    const selectedRole = isUserAdmin 
      ? 'admin' 
      : (persistentAssignment?.role || existingRegisteredUser?.role || registrationOptions?.role || 'customer');
    const selectedPlan = persistentAssignment?.plan || existingRegisteredUser?.plan || registrationOptions?.plan || 'pro';
    let isNewUser = false;

    // Generated API key for carriers
    const apiKey = selectedRole === 'carrier' 
      ? (persistentAssignment?.apiKey || existingRegisteredUser?.apiKey || generateCarrierApiKey(registrationOptions?.companyName || fbUser.displayName || 'transport'))
      : undefined;

    // Build user profile
    let profile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || existingRegisteredUser?.displayName || (isUserAdmin ? 'Martín Tavárez Gómez (Super Admin)' : 'Usuario Google'),
      photoURL: fbUser.photoURL || existingRegisteredUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || 'Google')}`,
      role: selectedRole,
      plan: selectedRole === 'partner' ? selectedPlan : undefined,
      phone: registrationOptions?.phone || existingRegisteredUser?.phone || '809-000-0000',
      province: registrationOptions?.province || existingRegisteredUser?.province || 'Distrito Nacional',
      storeName: persistentAssignment?.storeName || registrationOptions?.storeName || existingRegisteredUser?.storeName || undefined,
      companyName: persistentAssignment?.companyName || registrationOptions?.companyName || existingRegisteredUser?.companyName || (selectedRole === 'carrier' ? (fbUser.displayName || 'Transportes Express RD') : undefined),
      apiKey,
      rnc: registrationOptions?.rnc || existingRegisteredUser?.rnc || undefined,
      coverageProvinces: selectedRole === 'carrier' ? ['Todas las 32 Provincias'] : undefined,
      isProviderApproved: selectedRole === 'supplier' ? true : undefined,
      referralCode: existingRegisteredUser?.referralCode || generateUserReferralCode(selectedRole, fbUser.displayName || '', fbUser.email || '', registrationOptions?.storeName),
      referredByCode: registrationOptions?.referredByCode?.trim() || existingRegisteredUser?.referredByCode || undefined,
      welcomeEmailSent: existingRegisteredUser?.welcomeEmailSent ?? false,
      createdAt: existingRegisteredUser?.createdAt || new Date().toISOString()
    };

    const emailKey = fbUser.email ? fbUser.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') : '';

    if (isRegistrationFlow && !existingRegisteredUser) {
      isNewUser = true;
      sendWelcomeEmail({
        name: profile.displayName || 'Socio Sanpi',
        email: profile.email || '',
        role: profile.role,
        plan: profile.plan,
        storeName: profile.storeName,
        referralCode: profile.referralCode || 'SANPI-SOCIO',
        phone: profile.phone,
        province: profile.province,
        referredByCode: profile.referredByCode
      }).catch(err => console.warn('Welcome email error:', err));
      profile.welcomeEmailSent = true;
    }

    try {
      const userDocRef = doc(db, 'marketplace_users', fbUser.uid);
      await setDoc(userDocRef, profile, { merge: true });
      if (emailKey) {
        await setDoc(doc(db, 'marketplace_users', emailKey), profile, { merge: true });
      }
      await setDoc(doc(db, 'users', fbUser.uid), profile, { merge: true });
      if (emailKey) {
        await setDoc(doc(db, 'users', emailKey), profile, { merge: true });
      }
    } catch (e) {
      console.warn('Firestore user profile sync warning:', e);
    }

    // Save to localStorage for quick restore
    try {
      localStorage.setItem('sanpi_auth_user', JSON.stringify(profile));
      cacheRegisteredUserLocally(profile);
    } catch {
      // Ignore localStorage error
    }

    // Broadcast synchronization event to admin panels
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sanpi_user_registered', { detail: profile }));
      window.dispatchEvent(new CustomEvent('sanpi_users_updated', { detail: profile }));
    }

    return { user: fbUser, profile, isNewUser };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    let errorMessage = 'No se pudo completar el inicio de sesión con Google.';
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'La ventana de Google fue cerrada antes de completar el acceso.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Acción cancelada.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'El navegador bloqueó la ventana emergente de Google. Por favor permite popups en tu navegador.';
    } else if (error.code === 'auth/argument-error') {
      errorMessage = 'Error de configuración de proveedor Google Auth. Se ha corregido la instancia de autenticación.';
    } else if (error.code === 'auth/unauthorized-domain') {
      errorMessage = `Este dominio (${window.location.hostname}) debe agregarse a los Dominios Autorizados en la consola de Firebase > Authentication > Settings > Authorized Domains.`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { user: null, profile: null, error: errorMessage };
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    await signOut(auth);
    localStorage.removeItem('sanpi_auth_user');
    // Restore anonymous auth for safe marketplace public reading
    await signInAnonymously(auth).catch(() => {});
  } catch (err) {
    console.error('Error signing out:', err);
  }
}

export async function signInWithEmailPassword(email: string, _password: string): Promise<{ profile: UserProfile | null; error?: string; notRegistered?: boolean }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { profile: null, error: 'Por favor ingresa un correo electrónico válido.' };
    }

    const isAdmin = isSuperAdmin(cleanEmail);
    let detectedProfile = await findRegisteredUser(cleanEmail);

    // STRICT REJECTION: Unregistered emails cannot log in!
    if (!detectedProfile && !isAdmin) {
      console.warn(`[Sanpi Security] Rejected login attempt for unregistered email: ${cleanEmail}`);
      return {
        profile: null,
        error: `El correo "${cleanEmail}" no está registrado en el sistema de Sanpi Market. Por seguridad, no se permite el acceso a correos no registrados. Si deseas crear una cuenta, hazlo desde la pestaña "Crear Cuenta (Registro)".`,
        notRegistered: true
      };
    }

    if (isAdmin) {
      if (!detectedProfile) {
        detectedProfile = {
          uid: 'admin_martin_master',
          email: cleanEmail,
          displayName: 'Martín Tavárez Gómez (Super Admin)',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'admin',
          phone: '809-555-0100',
          province: 'Distrito Nacional',
          companyName: 'Sanpi Market Dominicana SRL',
          referralCode: 'SANPI-ADMIN-MASTER',
          createdAt: '2026-01-01T08:00:00.000Z'
        };
      }
      detectedProfile.role = 'admin';
    } else if (detectedProfile) {
      // Check if Super Admin assigned a permanent role
      const persistentAssignment = getPersistentRoleAssignment(cleanEmail, detectedProfile.uid);
      if (persistentAssignment && persistentAssignment.role) {
        detectedProfile.role = persistentAssignment.role;
        if (persistentAssignment.plan) detectedProfile.plan = persistentAssignment.plan;
        if (persistentAssignment.storeName) detectedProfile.storeName = persistentAssignment.storeName;
        if (persistentAssignment.companyName) detectedProfile.companyName = persistentAssignment.companyName;
        if (persistentAssignment.apiKey) detectedProfile.apiKey = persistentAssignment.apiKey;
        if (persistentAssignment.isProviderApproved !== undefined) detectedProfile.isProviderApproved = persistentAssignment.isProviderApproved;
      }
    }

    if (detectedProfile) {
      if (!detectedProfile.referralCode) {
        detectedProfile.referralCode = generateUserReferralCode(
          detectedProfile.role,
          detectedProfile.displayName || '',
          detectedProfile.email || '',
          detectedProfile.storeName
        );
      }

      // Persist
      try {
        localStorage.setItem('sanpi_auth_user', JSON.stringify(detectedProfile));
        cacheRegisteredUserLocally(detectedProfile);
        const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'marketplace_users', detectedProfile.uid), detectedProfile, { merge: true }).catch(() => {});
        if (emailKey) {
          await setDoc(doc(db, 'marketplace_users', emailKey), detectedProfile, { merge: true }).catch(() => {});
          await setDoc(doc(db, 'users', emailKey), detectedProfile, { merge: true }).catch(() => {});
        }
        await setDoc(doc(db, 'users', detectedProfile.uid), detectedProfile, { merge: true }).catch(() => {});

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sanpi_user_registered', { detail: detectedProfile }));
        }
      } catch {}
    }

    return { profile: detectedProfile };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'Error al autenticar credenciales.' };
  }
}

export async function registerWithEmail(params: {
  name: string;
  email: string;
  password?: string;
  role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
  plan?: StorePlan;
  phone?: string;
  province?: string;
  storeName?: string;
  companyName?: string;
  rnc?: string;
  referredByCode?: string;
}): Promise<{ profile: UserProfile | null; error?: string }> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { profile: null, error: 'Por favor ingresa un correo electrónico válido.' };
    }

    // Check if already registered
    const alreadyRegistered = await findRegisteredUser(cleanEmail);
    if (alreadyRegistered) {
      return {
        profile: null,
        error: `El correo "${cleanEmail}" ya se encuentra registrado en Sanpi Market. Por favor selecciona la pestaña "Iniciar Sesión" para ingresar a tu cuenta.`
      };
    }
    if (!params.name.trim()) {
      return { profile: null, error: 'Por favor ingresa tu nombre completo o comercial.' };
    }
    if (params.role === 'partner' && !params.storeName?.trim()) {
      return { profile: null, error: 'Por favor ingresa el nombre comercial de tu tienda mayorista.' };
    }
    if (params.role === 'carrier' && !params.companyName?.trim() && !params.name?.trim()) {
      return { profile: null, error: 'Por favor ingresa el nombre de tu empresa de transporte o courier.' };
    }

    const isAdmin = isSuperAdmin(cleanEmail) || params.role === 'admin';
    const effectiveRole = isAdmin ? 'admin' : params.role;
    const effectivePlan = params.role === 'partner' ? (params.plan || 'pro') : undefined;
    const generatedReferralCode = generateUserReferralCode(
      effectiveRole,
      params.name.trim(),
      cleanEmail,
      params.storeName?.trim()
    );

    const effectiveCarrierKey = effectiveRole === 'carrier'
      ? generateCarrierApiKey(params.companyName || params.name || 'transport')
      : undefined;

    const profile: UserProfile = {
      uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      displayName: params.name.trim(),
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}`,
      role: effectiveRole,
      plan: effectivePlan,
      phone: params.phone?.trim() || '809-000-0000',
      province: params.province || 'Distrito Nacional',
      storeName: params.role === 'partner' ? params.storeName?.trim() : undefined,
      companyName: params.role === 'carrier' ? (params.companyName?.trim() || params.name.trim()) : undefined,
      apiKey: effectiveCarrierKey,
      rnc: params.rnc?.trim() || undefined,
      coverageProvinces: effectiveRole === 'carrier' ? ['Todas las 32 Provincias'] : undefined,
      isProviderApproved: effectiveRole === 'supplier' ? true : undefined,
      referralCode: generatedReferralCode,
      referredByCode: params.referredByCode?.trim() || undefined,
      welcomeEmailSent: true,
      createdAt: new Date().toISOString()
    };

    // 1. If Partner (Tienda), also register in StoreManager / Subscription
    if (params.role === 'partner' && params.storeName?.trim()) {
      try {
        let validatedReferrer: any = null;
        if (params.referredByCode?.trim()) {
          validatedReferrer = sanpiManager.findStoreByReferralCode(params.referredByCode.trim());
        }
        await sanpiManager.addSubscriptionRequest({
          storeName: params.storeName.trim(),
          ownerName: params.name.trim(),
          email: cleanEmail,
          phone: params.phone?.trim() || '809-000-0000',
          province: params.province || 'Distrito Nacional',
          plan: effectivePlan || 'pro',
          referralCodeUsed: params.referredByCode?.trim() || undefined,
          referredByStoreId: validatedReferrer?.id,
          referralDiscountPercent: validatedReferrer?.referralDiscountPercent || (params.referredByCode ? 10 : 0)
        });
      } catch (err) {
        console.warn('Subscription auto-request registration notice:', err);
      }
    }

    // 2. Send personalized welcome email
    sendWelcomeEmail({
      name: params.name.trim(),
      email: cleanEmail,
      role: effectiveRole,
      plan: effectivePlan,
      storeName: params.storeName?.trim(),
      referralCode: generatedReferralCode,
      phone: params.phone,
      province: params.province,
      referredByCode: params.referredByCode
    }).catch(e => console.warn('Welcome email async notice:', e));

    // 3. Persist to Firestore & LocalStorage
    try {
      localStorage.setItem('sanpi_auth_user', JSON.stringify(profile));
      const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'marketplace_users', profile.uid), profile, { merge: true });
      if (emailKey) {
        await setDoc(doc(db, 'marketplace_users', emailKey), profile, { merge: true });
        await setDoc(doc(db, 'users', emailKey), profile, { merge: true });
      }
      await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });

      const rawLocal = localStorage.getItem('sanpi_registered_users');
      let registeredList: UserProfile[] = rawLocal ? JSON.parse(rawLocal) : [];
      registeredList = registeredList.filter(u => u.uid !== profile.uid && u.email?.toLowerCase() !== cleanEmail);
      registeredList.unshift(profile);
      localStorage.setItem('sanpi_registered_users', JSON.stringify(registeredList));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sanpi_user_registered', { detail: profile }));
        window.dispatchEvent(new CustomEvent('sanpi_users_updated', { detail: profile }));
      }
    } catch (e) {
      console.debug('Firestore registration cache:', e);
    }

    return { profile };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'Error al procesar registro.' };
  }
}

export function getCurrentStoredUser(): UserProfile | null {
  try {
    const data = localStorage.getItem('sanpi_auth_user');
    if (!data) return null;
    const profile = JSON.parse(data) as UserProfile;
    if (!profile || !profile.email) return null;

    const cleanEmail = profile.email.trim().toLowerCase();
    if (isSuperAdmin(cleanEmail)) {
      profile.role = 'admin';
    } else {
      // Check if user is registered in synchronous cache sources
      const inDefaults = DEFAULT_REGISTERED_USERS.some(u => u.email?.toLowerCase().trim() === cleanEmail || u.uid === profile.uid);
      const inAssignments = Boolean(getAllPersistentRoleAssignments()[cleanEmail] || (profile.uid && getAllPersistentRoleAssignments()[profile.uid]));
      let inLocalRegistered = false;
      try {
        const rawLocal = localStorage.getItem('sanpi_registered_users');
        if (rawLocal) {
          const list = JSON.parse(rawLocal) as UserProfile[];
          inLocalRegistered = list.some(u => u.email?.toLowerCase().trim() === cleanEmail || u.uid === profile.uid);
        }
      } catch {}

      // If user is not in any known registered list, invalidate stored session
      if (!inDefaults && !inAssignments && !inLocalRegistered) {
        localStorage.removeItem('sanpi_auth_user');
        return null;
      }

      const assigned = getPersistentRoleAssignment(profile.email, profile.uid);
      if (assigned && assigned.role) {
        profile.role = assigned.role;
        if (assigned.plan) profile.plan = assigned.plan;
        if (assigned.storeName) profile.storeName = assigned.storeName;
        if (assigned.companyName) profile.companyName = assigned.companyName;
        if (assigned.apiKey) profile.apiKey = assigned.apiKey;
        if (assigned.isProviderApproved !== undefined) profile.isProviderApproved = assigned.isProviderApproved;
      }
    }
    if (!profile.referralCode) {
      profile.referralCode = generateUserReferralCode(
        profile.role,
        profile.displayName || '',
        profile.email || '',
        profile.storeName
      );
    }
    return profile;
  } catch {
    return null;
  }
}

export function updateStoredUserProfile(updated: Partial<UserProfile>): UserProfile | null {
  const current = getCurrentStoredUser();
  if (!current) return null;
  const merged = { ...current, ...updated };
  try {
    localStorage.setItem('sanpi_auth_user', JSON.stringify(merged));
    const userDocRef = doc(db, 'marketplace_users', merged.uid);
    setDoc(userDocRef, merged, { merge: true }).catch(() => {});
  } catch {
    // Ignore error
  }
  return merged;
}

/**
 * Fetch all registered users from Firestore (marketplace_users, users, stores, subscriptions) and local cache
 */
export async function fetchAllRegisteredUsers(): Promise<UserProfile[]> {
  // Map indexed by normalized email or uid
  const emailMap = new Map<string, UserProfile>();
  const uidMap = new Map<string, UserProfile>();

  const registerOrMerge = (user: UserProfile) => {
    if (!user) return;
    const cleanEmail = user.email ? user.email.trim().toLowerCase() : '';
    const key = cleanEmail || user.uid;
    if (!key) return;

    const existing = emailMap.get(key) || (user.uid ? uidMap.get(user.uid) : undefined);
    const merged: UserProfile = {
      ...(existing || {}),
      ...user,
      uid: user.uid || existing?.uid || `user_${Date.now()}`,
      email: cleanEmail || existing?.email || '',
      displayName: user.displayName || existing?.displayName || cleanEmail.split('@')[0] || 'Usuario Sanpi',
      photoURL: user.photoURL || existing?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail || 'user')}`,
      role: isSuperAdmin(cleanEmail) ? 'admin' : (user.role || existing?.role || 'customer'),
      createdAt: existing?.createdAt || user.createdAt || new Date().toISOString()
    };

    if (cleanEmail) emailMap.set(cleanEmail, merged);
    if (merged.uid) uidMap.set(merged.uid, merged);
  };

  // 1. Load defaults first (including sanpimarketplace@gmail.com)
  DEFAULT_REGISTERED_USERS.forEach(u => registerOrMerge({ ...u }));

  // 2. Load from localStorage cache
  try {
    const rawLocal = localStorage.getItem('sanpi_registered_users');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as UserProfile[];
      parsed.forEach(u => registerOrMerge(u));
    }
  } catch (e) {
    console.debug('Local storage users read cache warning:', e);
  }

  // 3. Current logged in user
  const currentUser = getCurrentStoredUser();
  if (currentUser?.uid || currentUser?.email) {
    registerOrMerge({
      ...currentUser,
      role: isSuperAdmin(currentUser.email) ? 'admin' : currentUser.role
    });
  }

  // 4. Fetch live from Firestore collection 'marketplace_users'
  try {
    const querySnap = await getDocs(collection(db, 'marketplace_users'));
    querySnap.forEach(docSnap => {
      const data = docSnap.data() as UserProfile;
      if (data) {
        const uid = data.uid || docSnap.id;
        registerOrMerge({
          ...data,
          uid,
          role: isSuperAdmin(data.email) ? 'admin' : (data.role || 'customer')
        });
      }
    });
  } catch (err) {
    console.warn('Firestore marketplace_users query fallback to cache:', err);
  }

  // 5. Fetch live from Firestore collection 'users'
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(docSnap => {
      const data = docSnap.data() as UserProfile;
      if (data) {
        const uid = data.uid || docSnap.id;
        registerOrMerge({
          ...data,
          uid,
          role: isSuperAdmin(data.email) ? 'admin' : (data.role || 'customer')
        });
      }
    });
  } catch (err) {
    console.debug('Firestore users collection query notice:', err);
  }

  // 6. Cross-reference partner store owners from Firestore 'stores'
  try {
    const storesSnap = await getDocs(collection(db, 'stores'));
    storesSnap.forEach(docSnap => {
      const s = docSnap.data() as any;
      if (s && s.ownerEmail) {
        const cleanEmail = s.ownerEmail.trim().toLowerCase();
        if (cleanEmail && !emailMap.has(cleanEmail)) {
          registerOrMerge({
            uid: s.ownerId || `partner_${docSnap.id}`,
            email: cleanEmail,
            displayName: s.ownerName || s.name || 'Socio Tienda',
            photoURL: s.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
            role: 'partner',
            storeName: s.name,
            phone: s.phone,
            province: s.province || 'Distrito Nacional',
            createdAt: s.createdAt || new Date().toISOString()
          });
        }
      }
    });
  } catch {}

  // 7. Cross-reference subscription applications from Firestore 'marketplace_subscriptions'
  try {
    const subSnap = await getDocs(collection(db, 'marketplace_subscriptions'));
    subSnap.forEach(docSnap => {
      const sub = docSnap.data() as any;
      if (sub && sub.email) {
        const cleanEmail = sub.email.trim().toLowerCase();
        if (cleanEmail && !emailMap.has(cleanEmail)) {
          registerOrMerge({
            uid: `sub_user_${docSnap.id}`,
            email: cleanEmail,
            displayName: sub.ownerName || sub.storeName || 'Socio Tienda',
            photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
            role: 'partner',
            storeName: sub.storeName,
            phone: sub.phone,
            province: sub.province || 'Distrito Nacional',
            plan: sub.plan || 'pro',
            createdAt: sub.requestedAt || new Date().toISOString()
          });
        }
      }
    });
  } catch {}

  // 8. Fetch live user_role_assignments from Firestore if available
  try {
    const roleSnap = await getDocs(collection(db, 'user_role_assignments'));
    roleSnap.forEach(docSnap => {
      const rData = docSnap.data() as PersistentRoleAssignment;
      if (rData && rData.role) {
        savePersistentRoleAssignment({
          uid: rData.uid || docSnap.id,
          email: rData.email,
          role: rData.role,
          plan: rData.plan,
          storeName: rData.storeName,
          companyName: rData.companyName,
          apiKey: rData.apiKey,
          isProviderApproved: rData.isProviderApproved,
          assignedBy: rData.assignedBy
        });
      }
    });
  } catch {}

  // 9. Apply persistent role assignments so Super Admin assignments are permanently enforced
  const persistentAssignments = getAllPersistentRoleAssignments();
  emailMap.forEach((user) => {
    if (isSuperAdmin(user.email)) {
      user.role = 'admin';
      return;
    }
    const cleanEmail = user.email ? user.email.trim().toLowerCase() : '';
    const assignment = (cleanEmail && persistentAssignments[cleanEmail]) || (user.uid && persistentAssignments[user.uid]);
    if (assignment && assignment.role) {
      user.role = assignment.role;
      if (assignment.plan) user.plan = assignment.plan;
      if (assignment.storeName) user.storeName = assignment.storeName;
      if (assignment.companyName) user.companyName = assignment.companyName;
      if (assignment.apiKey) user.apiKey = assignment.apiKey;
      if (assignment.isProviderApproved !== undefined) user.isProviderApproved = assignment.isProviderApproved;
    }
  });

  const allUsers = Array.from(emailMap.values());
  // Sort super admins first, then by date descending
  allUsers.sort((a, b) => {
    if (isSuperAdmin(a.email)) return -1;
    if (isSuperAdmin(b.email)) return 1;
    return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
  });

  try {
    localStorage.setItem('sanpi_registered_users', JSON.stringify(allUsers));
  } catch {
    // Ignore cache error
  }

  return allUsers;
}

/**
 * Updates a user's profile and role by an administrator
 */
export async function updateUserRoleAndProfile(
  uid: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const currentList = await fetchAllRegisteredUsers();
  const existing = currentList.find(u => u.uid === uid || (u.email && updates.email && u.email.toLowerCase() === updates.email.toLowerCase())) || {
    uid,
    email: updates.email || '',
    displayName: updates.displayName || 'Usuario',
    photoURL: null,
    role: 'customer' as const,
    createdAt: new Date().toISOString()
  };

  // If role is promoted to carrier and lacks an apiKey, generate one
  let apiKey = updates.apiKey || existing.apiKey;
  if (updates.role === 'carrier' && !apiKey) {
    apiKey = generateCarrierApiKey(updates.companyName || existing.companyName || existing.displayName || 'carrier');
  }

  // If role is promoted to supplier, approve by default if not set
  const isProviderApproved = updates.role === 'supplier'
    ? (updates.isProviderApproved ?? existing.isProviderApproved ?? true)
    : updates.isProviderApproved;

  const merged: UserProfile = {
    ...existing,
    ...updates,
    apiKey,
    isProviderApproved
  };

  // Enforce super admin protection if email is martin
  if (isSuperAdmin(merged.email)) {
    merged.role = 'admin';
  }

  // CRITICAL: Permanently record role assignment in local storage and Firestore
  savePersistentRoleAssignment({
    uid: merged.uid,
    email: merged.email,
    role: merged.role,
    plan: merged.plan,
    storeName: merged.storeName,
    companyName: merged.companyName,
    apiKey: merged.apiKey,
    isProviderApproved: merged.isProviderApproved,
    assignedBy: 'super_admin'
  });

  // Update in Firestore (both marketplace_users and users collections)
  try {
    const userDocRef = doc(db, 'marketplace_users', merged.uid);
    await setDoc(userDocRef, merged, { merge: true });
    await setDoc(doc(db, 'users', merged.uid), merged, { merge: true });
    if (merged.email) {
      const emailKey = merged.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'marketplace_users', emailKey), merged, { merge: true });
      await setDoc(doc(db, 'users', emailKey), merged, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore user update error:', err);
  }

  // Update in local cache
  const updatedList = currentList.map(u => (u.uid === merged.uid || (u.email && merged.email && u.email.toLowerCase() === merged.email.toLowerCase())) ? merged : u);
  if (!updatedList.some(u => u.uid === merged.uid)) {
    updatedList.unshift(merged);
  }
  try {
    localStorage.setItem('sanpi_registered_users', JSON.stringify(updatedList));
  } catch {
    // Ignore cache error
  }

  // If the edited user is the current logged-in user, update session profile
  const currentSessionUser = getCurrentStoredUser();
  const isSessionMatch = currentSessionUser && (
    currentSessionUser.uid === merged.uid ||
    (currentSessionUser.email && merged.email && currentSessionUser.email.trim().toLowerCase() === merged.email.trim().toLowerCase())
  );

  if (isSessionMatch) {
    updateStoredUserProfile(merged);
  }

  // Dispatch global custom event for instant UI reactivity across components
  try {
    window.dispatchEvent(new CustomEvent('sanpi_user_role_updated', { detail: merged }));
    window.dispatchEvent(new CustomEvent('sanpi_users_updated', { detail: merged }));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return merged;
}

/**
 * Creates a brand new user directly from Admin Panel
 */
export async function createRegisteredUser(
  userData: Partial<UserProfile>
): Promise<UserProfile> {
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  const uid = userData.uid || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const role = userData.role || 'customer';
  const name = (userData.displayName || 'Nuevo Usuario').trim();

  const apiKey = role === 'carrier'
    ? generateCarrierApiKey(userData.companyName || name)
    : undefined;

  const referralCode = generateUserReferralCode(
    role,
    name,
    cleanEmail,
    userData.storeName
  );

  const newUser: UserProfile = {
    uid,
    email: cleanEmail,
    displayName: name,
    photoURL: userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    role,
    phone: userData.phone || '809-000-0000',
    province: userData.province || 'Distrito Nacional',
    storeName: userData.storeName,
    companyName: userData.companyName,
    apiKey,
    rnc: userData.rnc,
    coverageProvinces: role === 'carrier' ? ['Todas las 32 Provincias'] : undefined,
    isProviderApproved: role === 'supplier' ? true : undefined,
    supplierCategory: userData.supplierCategory,
    plan: role === 'partner' ? (userData.plan || 'pro') : undefined,
    referralCode,
    welcomeEmailSent: false,
    createdAt: new Date().toISOString()
  };

  try {
    const emailKey = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') : '';
    await setDoc(doc(db, 'marketplace_users', uid), newUser, { merge: true });
    await setDoc(doc(db, 'users', uid), newUser, { merge: true });
    if (emailKey) {
      await setDoc(doc(db, 'marketplace_users', emailKey), newUser, { merge: true });
      await setDoc(doc(db, 'users', emailKey), newUser, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore create user error:', err);
  }

  const allUsers = await fetchAllRegisteredUsers();
  allUsers.unshift(newUser);
  try {
    localStorage.setItem('sanpi_registered_users', JSON.stringify(allUsers));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sanpi_user_registered', { detail: newUser }));
    window.dispatchEvent(new CustomEvent('sanpi_users_updated', { detail: newUser }));
  }

  return newUser;
}

/**
 * Deletes a registered user
 */
export async function deleteRegisteredUser(uid: string, email?: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'marketplace_users', uid));
    await deleteDoc(doc(db, 'users', uid));
    if (email) {
      const emailKey = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      await deleteDoc(doc(db, 'marketplace_users', emailKey)).catch(() => {});
      await deleteDoc(doc(db, 'users', emailKey)).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore delete user error:', err);
  }

  try {
    const rawLocal = localStorage.getItem('sanpi_registered_users');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as UserProfile[];
      const filtered = parsed.filter(u => u.uid !== uid && (!email || u.email?.toLowerCase() !== email.toLowerCase()));
      localStorage.setItem('sanpi_registered_users', JSON.stringify(filtered));
    }
  } catch {}

  return true;
}

/**
 * Global authentication observer that verifies and auto-syncs any signed in user
 * to the Firestore backend and local database immediately.
 */
export function setupGlobalAuthObserver(onUserLoaded?: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser && !fbUser.isAnonymous) {
      const cleanEmail = fbUser.email ? fbUser.email.trim().toLowerCase() : '';
      const isUserAdmin = isSuperAdmin(cleanEmail);

      // Verify whether this user is actually registered in Sanpi
      const registeredUser = await findRegisteredUser(cleanEmail || fbUser.uid);

      if (!registeredUser && !isUserAdmin) {
        console.warn(`[Sanpi Security] Blocked unauthorized entry in auth observer for unregistered email: ${fbUser.email || fbUser.uid}`);
        await signOut(auth).catch(() => {});
        localStorage.removeItem('sanpi_auth_user');
        if (onUserLoaded) onUserLoaded(null);
        return;
      }

      const persistentAssignment = await fetchPersistentRoleAssignment(cleanEmail, fbUser.uid);
      const emailKey = fbUser.email ? fbUser.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') : '';

      let profile: UserProfile = registeredUser || {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || (isUserAdmin ? 'Martín Tavárez Gómez (Super Admin)' : 'Usuario Sanpi'),
        photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || fbUser.email || 'Sanpi')}`,
        role: isUserAdmin ? 'admin' : (persistentAssignment?.role || 'customer'),
        phone: persistentAssignment?.phone || '809-000-0000',
        province: 'Distrito Nacional',
        referralCode: generateUserReferralCode('customer', fbUser.displayName || '', fbUser.email || ''),
        welcomeEmailSent: false,
        createdAt: new Date().toISOString()
      };

      if (isUserAdmin) {
        profile.role = 'admin';
      } else if (persistentAssignment?.role) {
        profile.role = persistentAssignment.role;
        if (persistentAssignment.plan) profile.plan = persistentAssignment.plan;
        if (persistentAssignment.storeName) profile.storeName = persistentAssignment.storeName;
        if (persistentAssignment.companyName) profile.companyName = persistentAssignment.companyName;
        if (persistentAssignment.apiKey) profile.apiKey = persistentAssignment.apiKey;
        if (persistentAssignment.isProviderApproved !== undefined) profile.isProviderApproved = persistentAssignment.isProviderApproved;
      }

      // Sync to Firestore
      try {
        await setDoc(doc(db, 'marketplace_users', fbUser.uid), profile, { merge: true });
        await setDoc(doc(db, 'users', fbUser.uid), profile, { merge: true });
        if (emailKey) {
          await setDoc(doc(db, 'marketplace_users', emailKey), profile, { merge: true });
          await setDoc(doc(db, 'users', emailKey), profile, { merge: true });
        }
      } catch (err) {
        console.debug('Global observer firestore sync:', err);
      }

      // Update local storage
      try {
        localStorage.setItem('sanpi_auth_user', JSON.stringify(profile));
        cacheRegisteredUserLocally(profile);
      } catch {}

      if (onUserLoaded) onUserLoaded(profile);
    } else {
      if (onUserLoaded) onUserLoaded(null);
    }
  });
}

/**
 * Guarda o actualiza la dirección de envío del cliente tanto en Firestore
 * como en localStorage, asegurando el llenado automático para compras.
 */
export async function saveCustomerShippingAddress(
  user: UserProfile,
  shippingAddress: CustomerShippingAddress
): Promise<UserProfile> {
  const updatedAddress: CustomerShippingAddress = {
    ...shippingAddress,
    updatedAt: new Date().toISOString()
  };

  const updatedUser: UserProfile = {
    ...user,
    phone: shippingAddress.phone || user.phone,
    province: shippingAddress.province || user.province,
    city: shippingAddress.city || user.city,
    address: shippingAddress.address || user.address,
    notes: shippingAddress.notes || user.notes,
    shippingAddress: updatedAddress
  };

  // 1. Guardar en localStorage
  try {
    localStorage.setItem('sanpi_auth_user', JSON.stringify(updatedUser));
    localStorage.setItem(`sanpi_shipping_addr_${user.uid}`, JSON.stringify(updatedAddress));
    if (user.email) {
      localStorage.setItem(`sanpi_shipping_addr_${user.email.toLowerCase()}`, JSON.stringify(updatedAddress));
    }

    const rawUsers = localStorage.getItem('sanpi_registered_users');
    if (rawUsers) {
      let list: UserProfile[] = JSON.parse(rawUsers);
      list = list.map(u => (u.uid === user.uid || (u.email && u.email.toLowerCase() === user.email?.toLowerCase())) ? updatedUser : u);
      localStorage.setItem('sanpi_registered_users', JSON.stringify(list));
    }
  } catch (e) {
    console.debug('Error local storage shipping address:', e);
  }

  // 2. Guardar en Firestore en ambas colecciones
  try {
    const emailKey = user.email ? user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') : '';
    await setDoc(doc(db, 'marketplace_users', user.uid), updatedUser, { merge: true });
    await setDoc(doc(db, 'users', user.uid), updatedUser, { merge: true });
    if (emailKey) {
      await setDoc(doc(db, 'marketplace_users', emailKey), updatedUser, { merge: true });
      await setDoc(doc(db, 'users', emailKey), updatedUser, { merge: true });
    }
  } catch (e) {
    console.debug('Error firestore shipping address:', e);
  }

  window.dispatchEvent(new CustomEvent('sanpi_user_address_updated', { detail: updatedUser }));
  return updatedUser;
}

/**
 * Obtiene la dirección de envío guardada para el usuario cliente.
 */
export function getCustomerSavedShippingAddress(user?: UserProfile | null): CustomerShippingAddress | null {
  if (!user) return null;
  if (user.shippingAddress && user.shippingAddress.address) {
    return user.shippingAddress;
  }
  try {
    const fromUid = localStorage.getItem(`sanpi_shipping_addr_${user.uid}`);
    if (fromUid) return JSON.parse(fromUid);
    if (user.email) {
      const fromEmail = localStorage.getItem(`sanpi_shipping_addr_${user.email.toLowerCase()}`);
      if (fromEmail) return JSON.parse(fromEmail);
    }
  } catch {}

  if (user.address || user.phone || user.province) {
    return {
      fullName: user.displayName || '',
      phone: user.phone || '',
      email: user.email || '',
      province: user.province || 'Distrito Nacional',
      city: user.city || '',
      address: user.address || '',
      notes: user.notes || ''
    };
  }
  return null;
}

