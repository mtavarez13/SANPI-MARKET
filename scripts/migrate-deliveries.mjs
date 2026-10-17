/** Dry run by default. Requires a service account via GOOGLE_APPLICATION_CREDENTIALS. */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
const db = getFirestore(app, config.firestoreDatabaseId);
const apply = process.argv.includes('--apply');
const normalize = value => value === 'en_transito' ? 'en tránsito' : value === 'intento_fallido' ? 'pendiente de retorno' : value;
const snapshot = await db.collection('deliveries').get();
let changes = 0;
for (const document of snapshot.docs) {
  const old = document.data();
  const status = normalize(old.status);
  const tracking = old.trackingNumber || document.id;
  const cod = old.paymentMethod === 'COD' || old.paymentMethod === 'contra entrega';
  const next = {
    ...old,
    id: tracking,
    trackingNumber: tracking,
    status,
    history: (old.history || []).map(h => ({ ...h, status: normalize(h.status) })),
    deliveryFee: old.deliveryFee ?? old.shippingFee ?? 0,
    deliveryPayment: old.deliveryPayment ?? 0,
    isPaidToOffice: old.isPaidToOffice ?? false,
    totalToCollect: old.totalToCollect ?? (cod ? (old.basePrice || 0) + (old.shippingFee || 0) : 0)
  };
  if (JSON.stringify(next) === JSON.stringify(old) && document.id === tracking) continue;
  changes++;
  if (!apply) { process.stdout.write(`${document.id} -> ${tracking}: ${old.status} -> ${status}\n`); continue; }
  const destination = db.collection('deliveries').doc(tracking);
  if (destination.id !== document.id && (await destination.get()).exists) {
    throw new Error(`La guía ${tracking} ya existe; se detuvo para evitar sobrescribir.`);
  }
  const batch = db.batch();
  batch.set(destination, next);
  if (destination.id !== document.id) batch.delete(document.ref);
  await batch.commit();
}
process.stdout.write(`${changes} documentos ${apply ? 'migrados' : 'por migrar (vista previa)'}.\n`);
