const databaseUrl = 'https://assistmetech-45347-default-rtdb.firebaseio.com';

const ownerEmail = process.env.OWNER_EMAIL || 'papyusmail@gmail.com';
const ownerPhone = process.env.OWNER_PHONE || null;
const ownerPassword = process.env.POSTING_PASSWORD;
const createdAt = new Date().toISOString();

if (!ownerPassword) {
  throw new Error('POSTING_PASSWORD is required.');
}

const exampleAds = [
  {
    title: 'Local moving help available this week',
    description: 'Two-person moving help for apartments, small offices, storage units, furniture pickup, and loading or unloading. Same-day availability when the schedule allows.',
    category: 'services',
    subcategory: 'labor / move',
    price: 45,
    location: 'Charlotte',
  },
  {
    title: 'Clean 2 bedroom apartment near transit',
    description: 'Bright 2 bedroom apartment with parking, laundry access, and easy access to shopping and public transportation. Example housing ad for testing the listing flow.',
    category: 'housing',
    subcategory: 'apts / housing',
    price: 1350,
    location: 'Atlanta',
  },
  {
    title: '2018 Honda Civic EX clean title',
    description: 'Reliable commuter car with clean title, cold AC, backup camera, Bluetooth, and recent oil change. Test vehicle listing with full vehicle details.',
    category: 'autos',
    subcategory: 'cars + trucks',
    price: 11900,
    location: 'Dallas/Fort Worth',
    vehicle_details: {
      vin: null,
      make: 'Honda',
      model: 'Civic',
      trim: 'EX',
      year: 2018,
      body_style: 'Sedan',
      mileage: 82000,
      odometer: 82000,
      engine_size: '2.0L',
      cylinders: '4 cylinders',
      horsepower: null,
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      drive_type: 'FWD',
      condition: 'Good',
      title_status: 'Clean',
      exterior_color: 'Silver',
      doors: 4,
      wheels: 'Alloy',
      sunroof: true,
      tinted_windows: false,
      seat_material: 'Cloth',
      seat_capacity: 5,
      features: ['Backup Camera', 'Bluetooth', 'Keyless Entry'],
      seller_type: 'Owner',
      city: 'Dallas/Fort Worth',
      state: 'TX',
      zip_code: null,
      gps_location: null,
      contact_methods: ['Phone', 'Text', 'Email'],
      availability: 'Available',
    },
  },
  {
    title: 'Standing desk and office chair bundle',
    description: 'Adjustable standing desk with a comfortable office chair. Good setup for a home office, student desk, or small business workspace.',
    category: 'for sale',
    subcategory: 'furniture',
    price: 180,
    location: 'Orlando',
  },
  {
    title: 'Weekend event setup crew needed',
    description: 'Need reliable help setting up tables, banners, chairs, and light equipment for a local weekend event. Paid same day after completion.',
    category: 'gigs',
    subcategory: 'event',
    price: 120,
    location: 'Miami',
  },
  {
    title: 'Part-time customer service assistant',
    description: 'Small local business looking for a part-time customer service assistant. Duties include answering messages, scheduling appointments, and basic data entry.',
    category: 'jobs',
    subcategory: 'customer service',
    price: 18,
    location: 'New York City',
  },
  {
    title: 'Community yard sale this Saturday',
    description: 'Neighborhood yard sale with household goods, tools, toys, clothes, books, and small furniture. Families welcome.',
    category: 'community',
    subcategory: 'events',
    price: 0,
    location: 'Raleigh',
  },
];

async function requestJson(path, options = {}) {
  const response = await fetch(`${databaseUrl}${path}.json`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

const existingListings = await requestJson('/listings');
const existingForOwner = Object.entries(existingListings ?? {}).filter(([, item]) => {
  const email = String(item.posted_by_email || item.contact_email || '').trim().toLowerCase();
  return email === ownerEmail.toLowerCase();
});
const existingTitles = new Set(existingForOwner.map(([, item]) => String(item.title || '').trim().toLowerCase()));

const created = [];
const skipped = [];

for (const item of exampleAds) {
  if (existingTitles.has(item.title.toLowerCase())) {
    skipped.push(item.title);
    continue;
  }

  const payload = {
    title: item.title,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    price: item.price,
    location: item.location,
    contact_email: ownerEmail,
    contact_phone: ownerPhone,
    images: [],
    video_url: null,
    vehicle_details: item.vehicle_details ?? null,
    is_sold: false,
    is_paid: true,
    is_active: true,
    approval_status: 'approved',
    posted_by_email: ownerEmail,
    posted_by_phone: ownerPhone,
    posting_password: ownerPassword,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const result = await requestJson('/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  created.push({ id: result.name, title: item.title });
}

console.log(`Created ${created.length} example ads for ${ownerEmail}.`);
for (const item of created) {
  console.log(`${item.id} ${item.title}`);
}

if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length} existing ads.`);
  for (const title of skipped) {
    console.log(`existing ${title}`);
  }
}
