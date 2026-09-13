import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInAnonymously,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, StorePlan } from '../types';
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
  plan?: StorePlan;
  storeName?: string;
  companyName?: string;
  apiKey?: string;
  isProviderApproved?: boolean;
  assignedBy?: string;
  assignedAt: string;
}

const ROLE_ASSIGNMENTS_STORAGE_KEY = 'sanpi_role_assignments';

export function getAllPersistentRoleAssignments(): Record<string, PersistentRoleAssignment> {
  try {
    const raw = localStorage.getItem(ROLE_ASSIGNMENTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PersistentRoleAssignment>;
  } catch {
    return {};
  }
}

export function getPersistentRoleAssignment(email?: string | null, uid?: string | null): PersistentRoleAssignment | null {
  const assignments = getAllPersistentRoleAssignments();
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    if (assignments[cleanEmail]) return assignments[cleanEmail];
  }
  if (uid && assignments[uid]) {
    return assignments[uid];
  }
  return null;
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
}): Promise<{ user: FirebaseUser | null; profile: UserProfile | null; error?: string; isNewUser?: boolean }> {
  try {
    const provider = getGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const fbUser = result.user;
    
    const isUserAdmin = isSuperAdmin(fbUser.email);
    // CRITICAL: Check if Super Admin assigned a permanent role to this user
    const persistentAssignment = getPersistentRoleAssignment(fbUser.email, fbUser.uid);
    const selectedRole = isUserAdmin 
      ? 'admin' 
      : (persistentAssignment?.role || registrationOptions?.role || 'customer');
    const selectedPlan = persistentAssignment?.plan || registrationOptions?.plan || 'pro';
    let isNewUser = false;

    // Generated API key for carriers
    const apiKey = selectedRole === 'carrier' 
      ? (persistentAssignment?.apiKey || generateCarrierApiKey(registrationOptions?.companyName || fbUser.displayName || 'transport'))
      : undefined;

    // Check or create user profile in Firestore
    let profile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || (isUserAdmin ? 'Martín Tavárez Gómez (Super Admin)' : 'Usuario Google'),
      photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || 'Google')}`,
      role: selectedRole,
      plan: selectedRole === 'partner' ? selectedPlan : undefined,
      phone: registrationOptions?.phone || '809-000-0000',
      province: registrationOptions?.province || 'Distrito Nacional',
      storeName: persistentAssignment?.storeName || registrationOptions?.storeName || undefined,
      companyName: persistentAssignment?.companyName || registrationOptions?.companyName || (selectedRole === 'carrier' ? (fbUser.displayName || 'Transportes Express RD') : undefined),
      apiKey,
      rnc: registrationOptions?.rnc || undefined,
      coverageProvinces: selectedRole === 'carrier' ? ['Todas las 32 Provincias'] : undefined,
      isProviderApproved: selectedRole === 'supplier' ? true : undefined,
      referralCode: generateUserReferralCode(selectedRole, fbUser.displayName || '', fbUser.email || '', registrationOptions?.storeName),
      referredByCode: registrationOptions?.referredByCode?.trim() || undefined,
      welcomeEmailSent: false,
      createdAt: new Date().toISOString()
    };

    try {
      const userDocRef = doc(db, 'marketplace_users', fbUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const existingData = docSnap.data() as UserProfile;
        profile = { 
          ...existingData, 
          ...profile, 
          role: isUserAdmin ? 'admin' : (persistentAssignment?.role || existingData.role || selectedRole),
          referralCode: existingData.referralCode || profile.referralCode,
          referredByCode: existingData.referredByCode || profile.referredByCode
        };
      } else {
        isNewUser = true;
        await setDoc(userDocRef, profile, { merge: true });
        
        // Dispatch Welcome Email automatically for new user
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
    } catch (e) {
      console.debug('Firestore user profile sync in memory cache:', e);
    }

    // Save to localStorage for quick restore
    try {
      localStorage.setItem('sanpi_auth_user', JSON.stringify(profile));
    } catch {
      // Ignore localStorage error
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

export async function signInWithEmailPassword(email: string, _password: string): Promise<{ profile: UserProfile | null; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { profile: null, error: 'Por favor ingresa un correo electrónico válido.' };
    }

    const isAdmin = isSuperAdmin(cleanEmail);
    let detectedProfile: UserProfile | null = null;

    // 1. Check local cache
    const existingRaw = localStorage.getItem('sanpi_auth_user');
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (parsed.email?.toLowerCase() === cleanEmail) {
          detectedProfile = parsed;
        }
      } catch {}
    }

    // 2. Try to check Firestore database if available
    if (!detectedProfile) {
      try {
        const userDocRef = doc(db, 'marketplace_users', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          detectedProfile = snap.data() as UserProfile;
        }
      } catch {}
    }

    // 3. If new or not in registry, generate with detected role
    if (!detectedProfile) {
      const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const role = isAdmin ? 'admin' : 'customer';
      const refCode = generateUserReferralCode(role, capitalized, cleanEmail);
      
      detectedProfile = {
        uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: cleanEmail,
        displayName: isAdmin ? 'Martín Tavárez Gómez (Super Admin)' : capitalized,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
        role,
        referralCode: refCode,
        welcomeEmailSent: false,
        createdAt: new Date().toISOString()
      };
    }

    if (isAdmin) {
      detectedProfile.role = 'admin';
    } else {
      // Check if Super Admin assigned a permanent role
      const persistentAssignment = getPersistentRoleAssignment(cleanEmail, detectedProfile?.uid);
      if (persistentAssignment && persistentAssignment.role) {
        detectedProfile.role = persistentAssignment.role;
        if (persistentAssignment.plan) detectedProfile.plan = persistentAssignment.plan;
        if (persistentAssignment.storeName) detectedProfile.storeName = persistentAssignment.storeName;
        if (persistentAssignment.companyName) detectedProfile.companyName = persistentAssignment.companyName;
        if (persistentAssignment.apiKey) detectedProfile.apiKey = persistentAssignment.apiKey;
        if (persistentAssignment.isProviderApproved !== undefined) detectedProfile.isProviderApproved = persistentAssignment.isProviderApproved;
      }
    }

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
      const userDocRef = doc(db, 'marketplace_users', detectedProfile.uid);
      setDoc(userDocRef, detectedProfile, { merge: true }).catch(() => {});
    } catch {}

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
      const userDocRef = doc(db, 'marketplace_users', profile.uid);
      await setDoc(userDocRef, profile, { merge: true });
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
    if (isSuperAdmin(profile.email)) {
      profile.role = 'admin';
    } else {
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
  }
];

/**
 * Fetch all registered users from Firestore and local cache
 */
export async function fetchAllRegisteredUsers(): Promise<UserProfile[]> {
  const usersMap = new Map<string, UserProfile>();

  // 1. Load defaults first
  DEFAULT_REGISTERED_USERS.forEach(u => {
    usersMap.set(u.uid, { ...u });
  });

  // 2. Load from localStorage cache
  try {
    const rawLocal = localStorage.getItem('sanpi_registered_users');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as UserProfile[];
      parsed.forEach(u => {
        if (u.uid) usersMap.set(u.uid, { ...usersMap.get(u.uid), ...u });
      });
    }
  } catch (e) {
    console.debug('Local storage users read cache warning:', e);
  }

  // 3. Current logged in user
  const currentUser = getCurrentStoredUser();
  if (currentUser?.uid) {
    usersMap.set(currentUser.uid, {
      ...usersMap.get(currentUser.uid),
      ...currentUser,
      role: isSuperAdmin(currentUser.email) ? 'admin' : currentUser.role
    });
  }

  // 4. Fetch live from Firestore
  try {
    const querySnap = await getDocs(collection(db, 'marketplace_users'));
    querySnap.forEach(docSnap => {
      const data = docSnap.data() as UserProfile;
      if (data && docSnap.id) {
        const uid = data.uid || docSnap.id;
        usersMap.set(uid, {
          ...data,
          uid,
          role: isSuperAdmin(data.email) ? 'admin' : (data.role || 'customer')
        });
      }
    });
  } catch (err) {
    console.warn('Firestore marketplace_users query fallback to cache:', err);
  }

  // 5. Fetch live user_role_assignments from Firestore if available
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

  // 6. Apply persistent role assignments so Super Admin assignments are permanently enforced
  const persistentAssignments = getAllPersistentRoleAssignments();
  usersMap.forEach((user) => {
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

  const allUsers = Array.from(usersMap.values());
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

  // Update in Firestore
  try {
    const userDocRef = doc(db, 'marketplace_users', merged.uid);
    await setDoc(userDocRef, merged, { merge: true });
    if (merged.email) {
      const emailDocRef = doc(db, 'marketplace_users', merged.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'));
      await setDoc(emailDocRef, merged, { merge: true });
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
    const userDocRef = doc(db, 'marketplace_users', uid);
    await setDoc(userDocRef, newUser, { merge: true });
  } catch (err) {
    console.warn('Firestore create user error:', err);
  }

  const allUsers = await fetchAllRegisteredUsers();
  allUsers.unshift(newUser);
  try {
    localStorage.setItem('sanpi_registered_users', JSON.stringify(allUsers));
  } catch {}

  return newUser;
}

/**
 * Deletes a registered user
 */
export async function deleteRegisteredUser(uid: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'marketplace_users', uid);
    await deleteDoc(userDocRef);
  } catch (err) {
    console.warn('Firestore delete user error:', err);
  }

  try {
    const rawLocal = localStorage.getItem('sanpi_registered_users');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as UserProfile[];
      const filtered = parsed.filter(u => u.uid !== uid);
      localStorage.setItem('sanpi_registered_users', JSON.stringify(filtered));
    }
  } catch {}

  return true;
}

