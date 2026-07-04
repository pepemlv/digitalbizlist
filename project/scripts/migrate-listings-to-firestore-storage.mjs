import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadString } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAV087GU2EiD4N5ljU5wUkRWHeR6TGKdkE',
  authDomain: 'assistmetech-45347.firebaseapp.com',
  databaseURL: 'https://assistmetech-45347-default-rtdb.firebaseio.com',
  projectId: 'assistmetech-45347',
  storageBucket: 'assistmetech-45347.firebasestorage.app',
  messagingSenderId: '121696551475',
  appId: '1:121696551475:web:c557dc0212216f0e40d946',
};

const databaseUrl = firebaseConfig.databaseURL;
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const storage = getStorage(app);
const maxListings = Number(process.env.MIGRATION_LIMIT || 50);
const startAt = Number(process.env.MIGRATION_START || 0);

async function requestJson(path) {
  const response = await fetch(`${databaseUrl}${path}.json`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

async function migrateImages(listingId, images) {
  if (!Array.isArray(images) || images.length === 0) return [];

  const migrated = [];
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!image) continue;
    if (!isDataUrl(image)) {
      migrated.push(image);
      continue;
    }

    const imageRef = storageRef(storage, `listings/${listingId}/image-${index + 1}.jpg`);
    await uploadString(imageRef, image, 'data_url');
    migrated.push(await getDownloadURL(imageRef));
  }

  return migrated;
}

const realtimeListings = await requestJson('/listings');
const entries = Object.entries(realtimeListings ?? {}).slice(startAt, startAt + maxListings);
let migratedCount = 0;
let skippedCount = 0;

for (const [id, item] of entries) {
  const listingDoc = doc(firestore, 'listings', id);
  const existing = await getDoc(listingDoc);
  if (existing.exists()) {
    skippedCount += 1;
    continue;
  }

  const images = await migrateImages(id, item.images);
  await setDoc(listingDoc, {
    ...item,
    images,
    subcategory: item.subcategory ?? null,
    price: item.price ?? null,
    contact_email: item.contact_email ?? null,
    contact_phone: item.contact_phone ?? null,
    show_contact_email: item.show_contact_email ?? true,
    show_contact_phone: item.show_contact_phone ?? true,
    video_url: item.video_url ?? null,
    vehicle_details: item.vehicle_details ?? null,
    is_sold: item.is_sold ?? false,
    is_paid: item.is_paid ?? false,
    is_active: item.is_active ?? true,
    approval_status: item.approval_status ?? 'approved',
    posted_by_email: item.posted_by_email ?? null,
    posted_by_phone: item.posted_by_phone ?? null,
    posting_password: item.posting_password ?? null,
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at ?? item.created_at ?? new Date().toISOString(),
  });

  migratedCount += 1;
  console.log(`migrated ${id} ${item.title ?? ''}`);
}

console.log(`Processed ${entries.length} listings this run, starting at ${startAt}.`);
console.log(`Migrated ${migratedCount} listings to Firestore.`);
console.log(`Skipped ${skippedCount} listings already in Firestore.`);
