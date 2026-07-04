const databaseUrl = 'https://assistmetech-45347-default-rtdb.firebaseio.com';

const ownerEmail = process.env.OWNER_EMAIL || 'papyusmail@gmail.com';
const ownerPhone = process.env.OWNER_PHONE || null;
const ownerPassword = process.env.POSTING_PASSWORD;
const createdAt = new Date().toISOString();
const batchId = createdAt.replace(/[-:.TZ]/g, '').slice(0, 14);

if (!ownerPassword) {
  throw new Error('POSTING_PASSWORD is required.');
}

const carModels = [
  ['Toyota', 'Camry', 'LE', 2017, 76000, 'Silver', 9800],
  ['Honda', 'Accord', 'Sport', 2019, 69000, 'Black', 14900],
  ['Ford', 'F-150', 'XLT', 2018, 92000, 'White', 18900],
  ['Chevrolet', 'Malibu', 'LT', 2020, 54000, 'Blue', 13500],
  ['Nissan', 'Altima', 'SV', 2018, 81000, 'Gray', 10500],
  ['Hyundai', 'Elantra', 'SEL', 2021, 43000, 'Red', 14200],
  ['Kia', 'Sorento', 'LX', 2019, 73000, 'Black', 15800],
  ['Subaru', 'Outback', 'Premium', 2017, 88000, 'Green', 12900],
  ['Mazda', 'CX-5', 'Touring', 2020, 61000, 'White', 17900],
  ['Jeep', 'Wrangler', 'Sport', 2016, 97000, 'Yellow', 20500],
];

const housingAds = [
  ['Sunny 1 bedroom apartment near shops', 'apts / housing', 'Charlotte', 1125],
  ['Updated 2 bedroom duplex with parking', 'apts / housing', 'Atlanta', 1450],
  ['Private room in quiet shared house', 'rooms / shared', 'Raleigh', 650],
  ['Downtown studio sublet available', 'sublets / temporary', 'Chicago', 1250],
  ['Small office suite with utilities included', 'office / commercial', 'Orlando', 850],
  ['Garage parking space month to month', 'parking / storage', 'New York City', 275],
  ['Family home with fenced backyard', 'apts / housing', 'Dallas/Fort Worth', 1850],
  ['Furnished short-term rental near campus', 'sublets / temporary', 'Austin', 980],
  ['Clean room close to transit', 'rooms / shared', 'Philadelphia', 725],
  ['Commercial storefront for small business', 'office / commercial', 'Miami', 2200],
];

const forSaleAds = [
  ['Modern gray sofa in good condition', 'furniture', 'Charlotte', 240],
  ['Washer and dryer matching set', 'appliances', 'Atlanta', 520],
  ['Gaming laptop with charger', 'computers', 'Dallas/Fort Worth', 680],
  ['Dining table with four chairs', 'furniture', 'Orlando', 300],
  ['Cordless tool kit with batteries', 'tools', 'Raleigh', 165],
  ['Mountain bike ready to ride', 'bikes', 'Denver', 275],
  ['Flat screen smart TV 55 inch', 'electronics', 'Phoenix', 260],
  ['Bookshelf and storage cabinet', 'household', 'Chicago', 120],
  ['Baby stroller and car seat bundle', 'baby + kid', 'Houston', 190],
  ['Acoustic guitar with soft case', 'music instr', 'Seattle-Tacoma', 150],
];

const autoPartAds = [
  ['Set of Honda Civic alloy wheels', 'Los Angeles', 420],
  ['Ford F-150 bed liner', 'Dallas/Fort Worth', 180],
  ['Toyota Camry headlight pair', 'Phoenix', 95],
  ['Jeep Wrangler soft top', 'Denver', 550],
  ['Universal roof rack cross bars', 'Miami', 130],
];

function carVehicleDetails([make, model, trim, year, mileage, color]) {
  const bodyStyle = model === 'F-150' ? 'Truck' : model === 'Wrangler' ? 'SUV' : 'Sedan';
  return {
    vin: null,
    make,
    model,
    trim,
    year,
    body_style: bodyStyle,
    mileage,
    odometer: mileage,
    engine_size: bodyStyle === 'Truck' ? '3.5L' : '2.4L',
    cylinders: bodyStyle === 'Truck' ? '6 cylinders' : '4 cylinders',
    horsepower: null,
    fuel_type: 'Gasoline',
    transmission: 'Automatic',
    drive_type: bodyStyle === 'Truck' || bodyStyle === 'SUV' ? '4WD' : 'FWD',
    condition: 'Good',
    title_status: 'Clean',
    exterior_color: color,
    doors: bodyStyle === 'Truck' || bodyStyle === 'SUV' ? 4 : 4,
    wheels: 'Alloy',
    sunroof: false,
    tinted_windows: false,
    seat_material: 'Cloth',
    seat_capacity: 5,
    features: ['Backup Camera', 'Bluetooth', 'Keyless Entry'],
    seller_type: 'Owner',
    city: null,
    state: null,
    zip_code: null,
    gps_location: null,
    contact_methods: ['Phone', 'Text', 'Email'],
    availability: 'Available',
  };
}

function basePayload(item) {
  return {
    ...item,
    contact_email: ownerEmail,
    contact_phone: ownerPhone,
    images: [],
    video_url: null,
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
}

const listings = [
  ...carModels.map((car, index) => {
    const [make, model, trim, year, mileage, color, price] = car;
    const location = ['Charlotte', 'Atlanta', 'Dallas/Fort Worth', 'Miami', 'Phoenix'][index % 5];
    const details = carVehicleDetails(car);
    details.city = location;
    return basePayload({
      title: `${year} ${make} ${model} ${trim} for sale #${batchId}-car-${index + 1}`,
      description: `${color} ${year} ${make} ${model} ${trim} with ${mileage.toLocaleString()} miles, clean title, cold AC, and current maintenance. Example cars + trucks listing.`,
      category: 'autos',
      subcategory: 'cars + trucks',
      price,
      location,
      vehicle_details: details,
    });
  }),
  ...housingAds.map(([title, subcategory, location, price], index) => basePayload({
    title: `${title} #${batchId}-housing-${index + 1}`,
    description: `${title}. Example housing listing with realistic details for browsing, filtering, and dashboard testing.`,
    category: 'housing',
    subcategory,
    price,
    location,
    vehicle_details: null,
  })),
  ...forSaleAds.map(([title, subcategory, location, price], index) => basePayload({
    title: `${title} #${batchId}-sale-${index + 1}`,
    description: `${title}. Clean, ready for pickup, and priced for a quick local sale. Example for-sale listing.`,
    category: 'for sale',
    subcategory,
    price,
    location,
    vehicle_details: null,
  })),
  ...autoPartAds.map(([title, location, price], index) => basePayload({
    title: `${title} #${batchId}-parts-${index + 1}`,
    description: `${title}. Used auto part in good working condition. Buyer should confirm fitment before pickup.`,
    category: 'autos',
    subcategory: 'auto parts',
    price,
    location,
    vehicle_details: null,
  })),
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

const created = [];

for (const payload of listings) {
  const result = await requestJson('/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  created.push({ id: result.name, category: payload.category, subcategory: payload.subcategory, title: payload.title });
}

console.log(`Created ${created.length} targeted example ads for ${ownerEmail}.`);
for (const item of created) {
  console.log(`${item.id} ${item.category} / ${item.subcategory} / ${item.title}`);
}
