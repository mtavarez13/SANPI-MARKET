import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInAnonymously,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

/**
 * Generates a memorable, unique Referral Code based on user role and identity
 */
export function generateUserReferralCode(
  role: 'customer' | 'dropshipper' | 'partner' | 'admin',
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
  } else if (role === 'admin') {
    return `SANPI-ADMIN-MASTER`;
  }
  return `SANPI-VIP-${cleanBase || 'USER'}${randomSuffix.toString().slice(-2)}`;
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
  role?: 'customer' | 'dropshipper' | 'partner';
  plan?: StorePlan;
  storeName?: string;
  phone?: string;
  province?: string;
  referredByCode?: string;
}): Promise<{ user: FirebaseUser | null; profile: UserProfile | null; error?: string; isNewUser?: boolean }> {
  try {
    const provider = getGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const fbUser = result.user;
    
    const isUserAdmin = isSuperAdmin(fbUser.email);
    const selectedRole = isUserAdmin ? 'admin' : (registrationOptions?.role || 'customer');
    const selectedPlan = registrationOptions?.plan || 'pro';
    let isNewUser = false;

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
      storeName: registrationOptions?.storeName || undefined,
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
          role: isUserAdmin ? 'admin' : (existingData.role || selectedRole),
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
  role: 'customer' | 'dropshipper' | 'partner' | 'admin';
  plan?: StorePlan;
  phone?: string;
  province?: string;
  storeName?: string;
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

    const isAdmin = isSuperAdmin(cleanEmail) || params.role === 'admin';
    const effectiveRole = isAdmin ? 'admin' : params.role;
    const effectivePlan = params.role === 'partner' ? (params.plan || 'pro') : undefined;
    const generatedReferralCode = generateUserReferralCode(
      effectiveRole,
      params.name.trim(),
      cleanEmail,
      params.storeName?.trim()
    );

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
