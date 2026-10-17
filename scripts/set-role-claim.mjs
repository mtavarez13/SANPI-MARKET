/** Assign a trusted Firebase Auth role. Run only in an administrator environment. */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFile } from 'node:fs/promises';

const identifier = process.argv[2];
const role = process.argv[3];
if (!identifier || !['admin','fulfillment','carrier'].includes(role)) {
  throw new Error('Uso: node scripts/set-role-claim.mjs UID-o-correo admin|fulfillment|carrier');
}
const config = JSON.parse(await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
const auth = getAuth(app);
const user = identifier.includes('@') ? await auth.getUserByEmail(identifier.trim().toLowerCase()) : await auth.getUser(identifier);
if (role === 'admin' && (!user.emailVerified || !user.providerData.some(provider => provider.providerId === 'google.com'))) {
  throw new Error('Para asignar admin, la cuenta debe tener correo verificado e inicio de sesión con Google.');
}
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role });
console.log(`Rol ${role} asignado a ${user.email || user.uid} (UID ${user.uid}). La cuenta debe renovar su sesión.`);
