import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, get, limitToLast, onValue, orderByChild, push, query as databaseQuery, ref, remove, serverTimestamp, update } from 'firebase/database';
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit as firestoreLimit, orderBy, query as firestoreQuery, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadString } from 'firebase/storage';
import { categoryGroups } from '../data/categories';
import { cityGroups, cityOptions } from '../data/cities';

const firebaseConfig = {
  apiKey: 'AIzaSyAV087GU2EiD4N5ljU5wUkRWHeR6TGKdkE',
  authDomain: 'assistmetech-45347.firebaseapp.com',
  databaseURL: 'https://assistmetech-45347-default-rtdb.firebaseio.com',
  projectId: 'assistmetech-45347',
  storageBucket: 'assistmetech-45347.firebasestorage.app',
  messagingSenderId: '121696551475',
  appId: '1:121696551475:web:c557dc0212216f0e40d946',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

export interface ContactFormData {
  company: string;
  website: string;
  name: string;
  email: string;
  phone: string;
  services: string[];
  message: string;
  requestType: string;
  source?: string;
  selectedAction?: string;
  demoBusinessName?: string;
  demoIndustry?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface ContactMessage extends ContactFormData {
  id: string;
  status: 'new' | 'contacted' | 'completed';
  createdAt?: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  price: number | null;
  location: string;
  contact_email: string | null;
  contact_phone: string | null;
  show_contact_email?: boolean;
  show_contact_phone?: boolean;
  images: string[] | null;
  video_url?: string | null;
  vehicle_details?: VehicleDetails | null;
  is_sold?: boolean;
  is_paid?: boolean;
  payment_plan_id?: PricingPlanId | null;
  is_active: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  posted_by_email?: string | null;
  posted_by_phone?: string | null;
  posting_password?: string | null;
  created_at: string;
  updated_at: string;
}

export type PricingPlanId = 'free' | 'starter' | 'business';

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  priceLabel: string;
  adLimit: number;
  publishWindowDays: number | null;
  activeDays: number;
  description: string;
}

export interface UserPlan {
  id: string;
  email: string;
  plan_id: PricingPlanId;
  ads_limit: number;
  ads_used: number;
  period_started_at: string | null;
  period_ends_at: string | null;
  payment_intent_id?: string | null;
  updated_at?: string | null;
}

export interface VehicleDetails {
  vin?: string | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  year?: number | null;
  body_style?: string | null;
  mileage?: number | null;
  odometer?: number | null;
  engine_size?: string | null;
  cylinders?: string | null;
  horsepower?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  drive_type?: string | null;
  condition?: string | null;
  title_status?: string | null;
  exterior_color?: string | null;
  doors?: number | null;
  wheels?: string | null;
  sunroof?: boolean;
  tinted_windows?: boolean;
  seat_material?: string | null;
  seat_capacity?: number | null;
  features?: string[];
  seller_type?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  gps_location?: string | null;
  contact_methods?: string[];
  availability?: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  category: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ListingInquiry {
  id: string;
  listing_id: string;
  listing_title: string;
  recipient_email: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  message: string;
  status: 'new' | 'read';
  created_at: string;
}

export interface ListingReport {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_location: string;
  reporter_email: string | null;
  reporter_phone: string | null;
  reason: string;
  message: string;
  status: 'new' | 'reviewed';
  created_at: string;
}

export interface CityGroup {
  id: string;
  state: string;
  cities: string[];
  created_at: string;
  updated_at: string;
}

const citiesCollection = collection(firestore, 'cities');
const listingsCollection = collection(firestore, 'listings');
const userPlansCollection = collection(firestore, 'userPlans');

export const pricingPlans: Record<PricingPlanId, PricingPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceLabel: '$0',
    adLimit: 1,
    publishWindowDays: 7,
    activeDays: 60,
    description: '1 active ad, one free post every 7 days.',
  },
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    priceLabel: '$5',
    adLimit: 5,
    publishWindowDays: null,
    activeDays: 60,
    description: 'Publish up to 5 ads now or over time.',
  },
  business: {
    id: 'business',
    name: 'Business Plan',
    priceLabel: '$10',
    adLimit: 15,
    publishWindowDays: 30,
    activeDays: 60,
    description: 'Publish up to 15 ads during 30 days.',
  },
};

function toArray<T extends { id?: string }>(snapshot: { val?: () => Record<string, unknown> | null }) {
  const value = snapshot.val?.();
  if (!value) return [] as T[];
  return Object.entries(value).map(([id, item]) => ({ ...(item as object), id } as T));
}

function toObject<T>(snapshot: { val?: () => T | null }) {
  const value = snapshot.val?.();
  return value ?? null;
}

function normalizeListing(item: Listing): Listing {
  return {
    ...item,
    subcategory: item.subcategory ?? null,
    price: item.price ?? null,
    contact_email: item.contact_email ?? null,
    contact_phone: item.contact_phone ?? null,
    show_contact_email: item.show_contact_email ?? true,
    show_contact_phone: item.show_contact_phone ?? true,
    images: item.images ?? null,
    video_url: item.video_url ?? null,
    vehicle_details: item.vehicle_details ?? null,
    is_sold: item.is_sold ?? false,
    is_paid: item.is_paid ?? false,
    payment_plan_id: item.payment_plan_id ?? null,
    is_active: item.is_active ?? true,
    approval_status: item.approval_status ?? 'approved',
    posted_by_email: item.posted_by_email ?? null,
    posted_by_phone: item.posted_by_phone ?? null,
    posting_password: item.posting_password ?? null,
  };
}

function accountDocId(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_') || 'unknown';
}

function freeUserPlan(email: string): UserPlan {
  return {
    id: accountDocId(email),
    email: email.trim().toLowerCase(),
    plan_id: 'free',
    ads_limit: pricingPlans.free.adLimit,
    ads_used: 0,
    period_started_at: null,
    period_ends_at: null,
  };
}

function isDataUrl(value: string) {
  return value.startsWith('data:image/');
}

async function uploadListingImages(listingId: string, images: string[] | null | undefined) {
  if (!images || images.length === 0) return [] as string[];

  return Promise.all(
    images.map(async (image, index) => {
      if (!isDataUrl(image)) return image;
      const imageRef = storageRef(storage, `listings/${listingId}/image-${index + 1}-${Date.now()}.jpg`);
      await uploadString(imageRef, image, 'data_url');
      return getDownloadURL(imageRef);
    })
  );
}

async function getFirestoreListings(options: {
  category?: string;
  subcategory?: string;
  search?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  make?: string;
  model?: string;
  minMileage?: number;
  maxMileage?: number;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  bodyStyle?: string;
  titleStatus?: string;
  color?: string;
  sellerType?: string;
  condition?: string;
  features?: string[];
  limit?: number;
  excludeId?: string;
  sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}) {
  const shouldLimitNewest = Boolean(options.limit)
    && (!options.sortBy || options.sortBy === 'newest')
    && !options.category
    && !options.subcategory
    && !options.search
    && !options.city
    && options.minPrice === undefined
    && options.maxPrice === undefined
    && options.minYear === undefined
    && options.maxYear === undefined
    && !options.make
    && !options.model
    && options.minMileage === undefined
    && options.maxMileage === undefined
    && !options.fuelType
    && !options.transmission
    && !options.driveType
    && !options.bodyStyle
    && !options.titleStatus
    && !options.color
    && !options.sellerType
    && !options.condition
    && !options.excludeId
    && !(options.features && options.features.length > 0);
  const snapshot = await getDocs(shouldLimitNewest
    ? firestoreQuery(listingsCollection, orderBy('created_at', 'desc'), firestoreLimit(options.limit ?? 50))
    : firestoreQuery(listingsCollection, orderBy('created_at', options.sortBy === 'oldest' ? 'asc' : 'desc')));

  return snapshot.docs.map((listingDoc) => normalizeListing({ ...(listingDoc.data() as Listing), id: listingDoc.id }));
}

async function getRealtimeListings(options: { limit?: number; sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' }) {
  const canLimitOnServer = Boolean(options.limit) && (!options.sortBy || options.sortBy === 'newest');
  const listingsRef = ref(database, 'listings');
  const snapshot = await get(canLimitOnServer
    ? databaseQuery(listingsRef, orderByChild('created_at'), limitToLast(options.limit ?? 50))
    : listingsRef);

  return toArray<Listing>(snapshot).map(normalizeListing);
}

let seedPromise: Promise<void> | null = null;

function createSeedListings() {
  const baseDate = new Date();
  const createdAt = baseDate.toISOString();
  const seededCities = cityOptions.length > 0 ? cityOptions : ['Charlotte'];
  const listingSeedData = categoryGroups.flatMap((group, groupIndex) => [
    {
      title: `${group.label} announcement ${groupIndex + 1}`,
      description: `A welcoming ${group.label.toLowerCase()} announcement for local residents and visitors.`,
      category: group.id,
      subcategory: group.subcategories[0],
      price: groupIndex % 2 === 0 ? null : 25 + groupIndex,
      location: seededCities[groupIndex % seededCities.length],
      contact_email: `${group.id}@digitalbizlist.local`,
      contact_phone: null,
      images: [],
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      title: `${group.label} spotlight ${groupIndex + 2}`,
      description: `A fresh community update highlighting ${group.label.toLowerCase()} opportunities this week.`,
      category: group.id,
      subcategory: group.subcategories[Math.min(1, group.subcategories.length - 1)],
      price: groupIndex % 3 === 0 ? 0 : 40 + groupIndex * 5,
      location: seededCities[(groupIndex + 3) % seededCities.length],
      contact_email: `${group.id}-help@digitalbizlist.local`,
      contact_phone: null,
      images: [],
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      title: `${group.label} featured post ${groupIndex + 3}`,
      description: `An active ${group.label.toLowerCase()} announcement designed to fill the app with useful local content.`,
      category: group.id,
      subcategory: group.subcategories[Math.min(2, group.subcategories.length - 1)],
      price: groupIndex % 4 === 0 ? 15 : null,
      location: seededCities[(groupIndex + 6) % seededCities.length],
      contact_email: `${group.id}-info@digitalbizlist.local`,
      contact_phone: null,
      images: [],
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]);

  const eventSeedData = categoryGroups.map((group, index) => ({
    title: `${group.label} meetup ${index + 1}`,
    description: `Join neighbors for a ${group.label.toLowerCase()} gathering this week.`,
    event_date: new Date(baseDate.getTime() + (index + 1) * 86400000).toISOString().split('T')[0],
    event_time: '18:00',
      location: 'City Center',
    category: group.id,
    contact_email: `${group.id}-event@digitalbizlist.local`,
    is_active: true,
    created_at: createdAt,
  }));

  return { listingSeedData, eventSeedData };
}

function cityGroupId(state: string) {
  return state.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'city-group';
}

async function syncDefaultCityGroups(hasExistingCities: boolean) {
  const createdAt = new Date().toISOString();

  await Promise.all(
    cityGroups.map((group) => {
      const cityDoc = doc(firestore, 'cities', cityGroupId(group.state));

      if (!hasExistingCities) {
        return setDoc(cityDoc, {
          state: group.state,
          cities: group.cities,
          created_at: createdAt,
          updated_at: createdAt,
        });
      }

      return setDoc(cityDoc, {
        state: group.state,
        cities: arrayUnion(...group.cities),
        updated_at: createdAt,
      }, { merge: true });
    })
  );
}

export async function ensureSeedData() {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const [listingsSnapshot, eventsSnapshot, citiesSnapshot] = await Promise.all([
      get(ref(database, 'listings')),
      get(ref(database, 'events')),
      getDocs(citiesCollection),
    ]);

    const hasListings = listingsSnapshot.exists() && Object.keys(listingsSnapshot.val() ?? {}).length > 0;
    const hasEvents = eventsSnapshot.exists() && Object.keys(eventsSnapshot.val() ?? {}).length > 0;
    const hasCities = !citiesSnapshot.empty;

    if (!hasListings) {
      const { listingSeedData } = createSeedListings();
      await Promise.all(listingSeedData.map((item) => push(ref(database, 'listings'), item)));
    }

    if (!hasEvents) {
      const { eventSeedData } = createSeedListings();
      await Promise.all(eventSeedData.map((item) => push(ref(database, 'events'), item)));
    }

    await syncDefaultCityGroups(hasCities);
  })();

  return seedPromise;
}

export async function getListings(options: {
  category?: string;
  subcategory?: string;
  search?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  make?: string;
  model?: string;
  minMileage?: number;
  maxMileage?: number;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  bodyStyle?: string;
  titleStatus?: string;
  color?: string;
  sellerType?: string;
  condition?: string;
  features?: string[];
  sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  limit?: number;
  excludeId?: string;
  approvedOnly?: boolean;
} = {}) {
  let items = await getFirestoreListings(options);
  if (items.length === 0) {
    items = await getRealtimeListings(options);
  }

  items = items
    .filter((item) => item.is_active !== false)
    .filter((item) => !options.excludeId || item.id !== options.excludeId);

  const searchTerms = options.search?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const city = options.city?.trim().toLowerCase();
  const make = options.make?.trim().toLowerCase();
  const model = options.model?.trim().toLowerCase();
  const color = options.color?.trim().toLowerCase();
  const features = options.features ?? [];
  const filtered = items.filter((item) => {
    const vehicle = item.vehicle_details;
    if (options.approvedOnly !== false && item.approval_status !== 'approved') return false;
    if (options.category && item.category !== options.category) return false;
    if (options.subcategory && item.subcategory !== options.subcategory) return false;
    if (options.minPrice !== undefined && (item.price == null || item.price < options.minPrice)) return false;
    if (options.maxPrice !== undefined && (item.price == null || item.price > options.maxPrice)) return false;
    if (searchTerms.length > 0) {
      const title = item.title.toLowerCase();
      if (!searchTerms.some((term) => title.includes(term))) return false;
    }
    if (city && item.location?.trim().toLowerCase() !== city) return false;
    if (options.minYear !== undefined && (vehicle?.year == null || vehicle.year < options.minYear)) return false;
    if (options.maxYear !== undefined && (vehicle?.year == null || vehicle.year > options.maxYear)) return false;
    if (make && vehicle?.make?.toLowerCase() !== make) return false;
    if (model && !vehicle?.model?.toLowerCase().includes(model)) return false;
    if (options.minMileage !== undefined && (vehicle?.mileage == null || vehicle.mileage < options.minMileage)) return false;
    if (options.maxMileage !== undefined && (vehicle?.mileage == null || vehicle.mileage > options.maxMileage)) return false;
    if (options.fuelType && vehicle?.fuel_type !== options.fuelType) return false;
    if (options.transmission && vehicle?.transmission !== options.transmission) return false;
    if (options.driveType && vehicle?.drive_type !== options.driveType) return false;
    if (options.bodyStyle && vehicle?.body_style !== options.bodyStyle) return false;
    if (options.titleStatus && vehicle?.title_status !== options.titleStatus) return false;
    if (color && !vehicle?.exterior_color?.toLowerCase().includes(color)) return false;
    if (options.sellerType && vehicle?.seller_type !== options.sellerType) return false;
    if (options.condition && vehicle?.condition !== options.condition) return false;
    if (features.length > 0 && !features.every((feature) => vehicle?.features?.includes(feature))) return false;
    return true;
  });

  filtered.sort((a, b) => {
    switch (options.sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'price_asc':
        return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
      case 'price_desc':
        return (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.POSITIVE_INFINITY);
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return filtered.slice(0, options.limit ?? filtered.length);
}

export async function getListingById(id: string) {
  const listingDoc = await getDoc(doc(firestore, 'listings', id));
  if (listingDoc.exists()) {
    return normalizeListing({ ...(listingDoc.data() as Listing), id });
  }

  const snapshot = await get(ref(database, `listings/${id}`));
  const item = toObject<Listing>(snapshot);
  return item ? normalizeListing({ ...item, id }) : null;
}

export async function getCities() {
  const snapshot = await getDocs(firestoreQuery(citiesCollection, orderBy('state')));
  return snapshot.docs.map((cityDoc) => {
    const data = cityDoc.data() as Omit<CityGroup, 'id'>;
    return {
      id: cityDoc.id,
      state: data.state,
      cities: Array.isArray(data.cities) ? data.cities : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  });
}

export async function createCityGroup(data: { state: string; cities: string[] }) {
  const createdAt = new Date().toISOString();
  const id = cityGroupId(data.state);
  const cities = data.cities.map((city) => city.trim()).filter(Boolean);
  await setDoc(doc(firestore, 'cities', id), {
    state: data.state.trim(),
    cities: arrayUnion(...cities),
    created_at: createdAt,
    updated_at: createdAt,
  }, { merge: true });

  return { id };
}

export async function getUserPlan(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return freeUserPlan('');

  const planDoc = await getDoc(doc(userPlansCollection, accountDocId(normalizedEmail)));
  if (!planDoc.exists()) return freeUserPlan(normalizedEmail);

  const data = planDoc.data() as Partial<UserPlan>;
  const planId = data.plan_id && pricingPlans[data.plan_id] ? data.plan_id : 'free';
  return {
    ...freeUserPlan(normalizedEmail),
    ...data,
    id: planDoc.id,
    email: data.email || normalizedEmail,
    plan_id: planId,
    ads_limit: data.ads_limit ?? pricingPlans[planId].adLimit,
    ads_used: data.ads_used ?? 0,
  };
}

const stripeBackendUrl = (import.meta.env.VITE_STRIPE_BACKEND_URL || 'https://digitalbizlist.onrender.com').replace(/\/+$/, '');

export async function createPlanPaymentIntent(planId: Exclude<PricingPlanId, 'free'>, email: string) {
  const response = await fetch(`${stripeBackendUrl}/api/stripe/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId,
      email: email.trim().toLowerCase(),
    }),
  });

  if (!response.ok) {
    throw new Error('Could not start payment.');
  }

  const data = await response.json() as { clientSecret?: string; paymentIntentId?: string };
  if (!data.clientSecret || !data.paymentIntentId) {
    throw new Error('Stripe payment intent was not created.');
  }

  return data;
}

export async function confirmPlanPayment(paymentIntentId: string) {
  const response = await fetch(`${stripeBackendUrl}/api/stripe/confirm-plan-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentIntentId }),
  });

  if (!response.ok) {
    throw new Error('Could not activate plan after payment.');
  }

  return response.json() as Promise<{ ok: boolean; planId: PricingPlanId }>;
}

export async function createListing(data: Omit<Listing, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'approval_status'> & { approval_status?: Listing['approval_status']; posted_by_email?: string | null; posted_by_phone?: string | null; posting_password?: string | null; }) {
  const createdAt = new Date().toISOString();
  const listingDoc = doc(listingsCollection);
  const images = await uploadListingImages(listingDoc.id, data.images);
  await setDoc(listingDoc, {
    ...data,
    images,
    approval_status: data.approval_status ?? 'approved',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  });

  return { id: listingDoc.id };
}

export async function updateListingApproval(id: string, approvalStatus: NonNullable<Listing['approval_status']>) {
  const payload = {
    approval_status: approvalStatus,
    updated_at: new Date().toISOString(),
  };
  const listingDoc = doc(firestore, 'listings', id);
  if ((await getDoc(listingDoc)).exists()) return updateDoc(listingDoc, payload);
  return update(ref(database, `listings/${id}`), payload);
}

export async function updateListingDetails(
  id: string,
  data: Partial<Pick<Listing, 'title' | 'description' | 'price' | 'location' | 'contact_email' | 'contact_phone' | 'show_contact_email' | 'show_contact_phone' | 'images'>>,
) {
  const images = 'images' in data ? await uploadListingImages(id, data.images) : undefined;
  const payload = {
    ...data,
    ...(images ? { images } : {}),
    approval_status: 'approved',
    updated_at: new Date().toISOString(),
  };
  const listingDoc = doc(firestore, 'listings', id);
  if ((await getDoc(listingDoc)).exists()) return updateDoc(listingDoc, payload);
  return update(ref(database, `listings/${id}`), payload);
}

export async function updateListingSoldStatus(id: string, isSold: boolean) {
  const payload = {
    is_sold: isSold,
    updated_at: new Date().toISOString(),
  };
  const listingDoc = doc(firestore, 'listings', id);
  if ((await getDoc(listingDoc)).exists()) return updateDoc(listingDoc, payload);
  return update(ref(database, `listings/${id}`), payload);
}

export async function hideListing(id: string) {
  const payload = {
    is_active: false,
    updated_at: new Date().toISOString(),
  };
  const listingDoc = doc(firestore, 'listings', id);
  if ((await getDoc(listingDoc)).exists()) return updateDoc(listingDoc, payload);
  return update(ref(database, `listings/${id}`), payload);
}

export async function deleteListing(id: string) {
  const listingDoc = doc(firestore, 'listings', id);
  if ((await getDoc(listingDoc)).exists()) return deleteDoc(listingDoc);
  return remove(ref(database, `listings/${id}`));
}

export async function createListingInquiry(data: Omit<ListingInquiry, 'id' | 'status' | 'created_at'>) {
  const inquiryRef = push(ref(database, 'listingInquiries'), {
    ...data,
    status: 'new',
    created_at: new Date().toISOString(),
  });

  return { id: inquiryRef.key ?? '' };
}

export async function getListingInquiries() {
  const snapshot = await get(ref(database, 'listingInquiries'));
  return toArray<ListingInquiry>(snapshot).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createListingReport(data: Omit<ListingReport, 'id' | 'status' | 'created_at'>) {
  const reportRef = push(ref(database, 'listingReports'), {
    ...data,
    status: 'new',
    created_at: new Date().toISOString(),
  });

  return { id: reportRef.key ?? '' };
}

export async function getListingReports() {
  const snapshot = await get(ref(database, 'listingReports'));
  return toArray<ListingReport>(snapshot).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateListingReportStatus(id: string, status: ListingReport['status']) {
  return update(ref(database, `listingReports/${id}`), { status });
}

export async function getEvents(options: { futureOnly?: boolean; limit?: number } = {}) {
  const snapshot = await get(ref(database, 'events'));
  const items = toArray<Event>(snapshot)
    .filter((item) => item.is_active !== false)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  if (options.futureOnly) {
    const today = new Date().toISOString().split('T')[0];
    return items.filter((item) => item.event_date >= today).slice(0, options.limit ?? items.length);
  }

  return items.slice(0, options.limit ?? items.length);
}

export async function createEvent(data: Omit<Event, 'id' | 'created_at' | 'is_active'>) {
  const createdAt = new Date().toISOString();
  const eventRef = push(ref(database, 'events'), {
    ...data,
    is_active: true,
    created_at: createdAt,
  });

  return { id: eventRef.key ?? '' };
}

export function saveContactMessage(data: ContactFormData) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  return push(ref(database, 'contactedClients'), {
    ...cleanData,
    status: 'new',
    createdAt: serverTimestamp(),
  });
}

export function subscribeToContactMessages(
  onMessages: (messages: ContactMessage[]) => void,
  onError: (error: Error) => void,
) {
  return onValue(
    ref(database, 'contactedClients'),
    (snapshot) => {
      const messages = snapshot.val() as Record<string, Omit<ContactMessage, 'id'>> | null;
      const sortedMessages = Object.entries(messages ?? {})
        .map(([id, message]) => ({ ...message, id }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      onMessages(sortedMessages);
    },
    onError,
  );
}

export function updateContactMessageStatus(id: string, status: ContactMessage['status']) {
  return update(ref(database, `contactedClients/${id}`), { status });
}
