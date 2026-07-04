const databaseUrl = 'https://assistmetech-45347-default-rtdb.firebaseio.com';

const ownerEmail = process.env.OWNER_EMAIL || 'papyusmail@gmail.com';
const ownerPhone = process.env.OWNER_PHONE || null;
const ownerPassword = process.env.POSTING_PASSWORD;
const count = Number(process.env.AD_COUNT || 20);
const createdAt = new Date().toISOString();
const batchId = createdAt.replace(/[-:.TZ]/g, '').slice(0, 14);

if (!ownerPassword) {
  throw new Error('POSTING_PASSWORD is required.');
}

const categories = [
  {
    category: 'community',
    subcategories: ['activities', 'classes', 'events', 'general', 'lost + found', 'pets', 'volunteers'],
    templates: [
      ['Free beginner chess meetup', 'Casual local meetup for beginners and returning players. Boards provided, all ages welcome.'],
      ['Community garden volunteer day', 'Help clean beds, plant seasonal vegetables, and meet neighbors. No experience required.'],
      ['Weekend language exchange group', 'Friendly conversation group for practicing English, Spanish, French, and other languages.'],
    ],
  },
  {
    category: 'services',
    subcategories: ['automotive', 'computer', 'creative', 'household', 'labor / move', 'lessons', 'skilled trade'],
    templates: [
      ['Same-day computer tuneup service', 'Help with slow laptops, software cleanup, backups, printer setup, and basic troubleshooting.'],
      ['Handyman help for small repairs', 'Available for shelves, doors, fixtures, patching, mounting, and general household fixes.'],
      ['Private music lessons for beginners', 'Patient beginner-friendly lessons with flexible scheduling for kids, teens, and adults.'],
    ],
  },
  {
    category: 'housing',
    subcategories: ['apts / housing', 'office / commercial', 'parking / storage', 'rooms / shared', 'sublets / temporary'],
    templates: [
      ['Furnished room near downtown', 'Clean furnished room with utilities included and easy access to shops, dining, and transit.'],
      ['Small office suite available', 'Quiet office space suitable for consulting, bookkeeping, design work, or small teams.'],
      ['Secure storage unit month to month', 'Dry private storage space for furniture, tools, inventory, or seasonal items.'],
    ],
  },
  {
    category: 'autos',
    subcategories: ['auto parts', 'boats', 'cars + trucks', 'motorcycles', 'rvs + camp', 'wheels + tires'],
    templates: [
      ['Set of all-season tires', 'Four matching all-season tires with good tread remaining. Local pickup preferred.'],
      ['Reliable pickup truck for light work', 'Clean work truck with solid maintenance history, cold AC, and good tires.'],
      ['Motorcycle helmet and jacket bundle', 'Protective riding gear in good condition. Great starter bundle for a new rider.'],
    ],
  },
  {
    category: 'for sale',
    subcategories: ['appliances', 'books', 'computers', 'electronics', 'furniture', 'household', 'tools'],
    templates: [
      ['Kitchen appliance bundle', 'Lightly used countertop appliances, all tested and ready for pickup.'],
      ['Solid wood bookshelf', 'Sturdy bookshelf with adjustable shelves. Good for office, living room, or bedroom.'],
      ['Cordless drill and tool bag', 'Working cordless drill with charger, bits, and a small tool bag.'],
    ],
  },
  {
    category: 'jobs',
    subcategories: ['admin / office', 'customer service', 'food / bev / hosp', 'general labor', 'retail / wholesale', 'sales / biz dev'],
    templates: [
      ['Part-time office helper needed', 'Small business needs help with calls, scheduling, filing, and light computer work.'],
      ['Retail associate weekend shifts', 'Friendly local shop hiring for weekend register, stocking, and customer service help.'],
      ['Warehouse helper morning shift', 'Entry-level help needed for packing, sorting, and organizing inventory.'],
    ],
  },
  {
    category: 'gigs',
    subcategories: ['computer', 'creative', 'domestic', 'event', 'labor', 'writing'],
    templates: [
      ['Need help assembling furniture', 'Short paid gig assembling flat-pack furniture and moving boxes within the home.'],
      ['Flyer design for local event', 'Looking for a simple flyer layout for social media and print distribution.'],
      ['One-day event check-in assistant', 'Help greet attendees, check names, hand out badges, and answer basic questions.'],
    ],
  },
];

const cities = [
  'Charlotte',
  'Atlanta',
  'Dallas/Fort Worth',
  'Miami',
  'New York City',
  'Chicago',
  'Los Angeles',
  'Phoenix',
  'Denver',
  'Seattle-Tacoma',
  'Orlando',
  'Raleigh',
  'Houston',
  'Cincinnati',
  'San Diego',
];

function pick(items, index, offset = 0) {
  return items[(index + offset) % items.length];
}

function priceFor(category, index) {
  if (category === 'community') return index % 3 === 0 ? 0 : 10 + index;
  if (category === 'jobs') return 15 + (index % 15);
  if (category === 'gigs') return 60 + index * 5;
  if (category === 'housing') return 650 + index * 75;
  if (category === 'autos') return 120 + index * 320;
  return 20 + index * 12;
}

function vehicleDetails(title, location, index) {
  if (!title.toLowerCase().includes('pickup truck')) return null;

  return {
    vin: null,
    make: 'Ford',
    model: 'F-150',
    trim: 'XL',
    year: 2016 + (index % 5),
    body_style: 'Truck',
    mileage: 78000 + index * 1100,
    odometer: 78000 + index * 1100,
    engine_size: '3.5L',
    cylinders: '6 cylinders',
    horsepower: null,
    fuel_type: 'Gasoline',
    transmission: 'Automatic',
    drive_type: 'RWD',
    condition: 'Good',
    title_status: 'Clean',
    exterior_color: 'White',
    doors: 4,
    wheels: 'Steel',
    sunroof: false,
    tinted_windows: false,
    seat_material: 'Cloth',
    seat_capacity: 5,
    features: ['Backup Camera', 'Bluetooth'],
    seller_type: 'Owner',
    city: location,
    state: null,
    zip_code: null,
    gps_location: null,
    contact_methods: ['Phone', 'Text', 'Email'],
    availability: 'Available',
  };
}

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

const created = [];

for (let index = 0; index < count; index += 1) {
  const group = pick(categories, index, Math.floor(index / categories.length));
  const [baseTitle, baseDescription] = pick(group.templates, index);
  const subcategory = pick(group.subcategories, index, 1);
  const location = pick(cities, index, 2);
  const title = `${baseTitle} #${batchId}-${String(index + 1).padStart(2, '0')}`;

  const payload = {
    title,
    description: `${baseDescription}\n\nExample ad generated for testing category browsing, search, dashboard ownership, and listing detail pages.`,
    category: group.category,
    subcategory,
    price: priceFor(group.category, index),
    location,
    contact_email: ownerEmail,
    contact_phone: ownerPhone,
    images: [],
    video_url: null,
    vehicle_details: vehicleDetails(baseTitle, location, index),
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
  created.push({ id: result.name, title, category: group.category, subcategory });
}

console.log(`Created ${created.length} random example ads for ${ownerEmail}.`);
for (const item of created) {
  console.log(`${item.id} ${item.category} / ${item.subcategory} / ${item.title}`);
}
