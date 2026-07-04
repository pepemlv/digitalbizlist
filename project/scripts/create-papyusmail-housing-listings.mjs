const databaseUrl = 'https://assistmetech-45347-default-rtdb.firebaseio.com';
const ownerEmail = 'papyusmail@gmail.com';
const createdAt = new Date().toISOString();

const rawListings = [
  {
    title: 'SOUTH VAN WERT',
    price: 703,
    location: 'Villa Rica',
    address: '1907 South Van Wert Road, Villa Rica, GA',
    details: '3 bedroom housing listing.',
    sourceUrl: 'https://www.craigslist.org/view/d/villa-rica-south-van-wert/21EuGxLZgfVLY88Rxbzx1q',
  },
  {
    title: '1bd house 4 rent',
    price: 725,
    location: 'Torrington',
    address: 'Torrington',
    details: '1 bedroom, 800 ft2 house for rent.',
    sourceUrl: 'https://www.craigslist.org/view/d/torrington-1bd-house-rent/7St6joBYc9LBJtG7dFNAqC',
  },
  {
    title: 'Mesa No Credit Check No Fees 2 Bed 2 Bath Immed Move In Covered Parking',
    price: 1300,
    location: 'Mesa',
    address: '1224 E Evergreen Street, Mesa, AZ',
    details: '2 bedroom, 2 bath, 875 ft2. Immediate move in with covered parking.',
    sourceUrl: 'https://www.craigslist.org/view/d/mesa-mesa-no-credit-check-no-fees-bed/dfvz94S5Xunxk1nbv6RnyV',
  },
  {
    title: 'Everything you need. All right here. Lakota lake apartments.',
    price: 1119,
    location: 'West Chester',
    address: 'Near Liberty shopping center, West Chester, OH',
    details: '1 bedroom, 650 ft2 apartment near Liberty shopping center.',
    sourceUrl: 'https://www.craigslist.org/view/d/west-chester-everything-you-need-all/navLmPEsqwY5UXBhdMmmvQ',
  },
  {
    title: 'Cincinnati OH, 2/bd 1/ba, Flex Rent Payments',
    price: 1350,
    location: 'Cincinnati',
    address: '11365 Lippelman Rd, Cincinnati, OH',
    details: '2 bedroom, 1 bath, 1050 ft2 apartment with flex rent payments.',
    sourceUrl: 'https://www.craigslist.org/view/d/cincinnati-cincinnati-oh-bd-ba-flex/mGWjcPYQdL6vJsTpEprVQL',
  },
  {
    title: 'Free Parking, Handicapped Accessible, Fully Furnished',
    price: 387,
    location: 'Florence',
    address: '8035 Action Blvd, Florence, KY',
    details: 'Fully furnished housing with free parking and handicapped accessibility.',
    sourceUrl: 'https://www.craigslist.org/view/d/florence-free-parking-handicapped/dfSWWccfoyJiLNqt2rkZPM',
  },
  {
    title: '2BD 1BA, Off Street Parking, Swimming Pool',
    price: 1154,
    location: 'West Chester',
    address: '6615 Fountains Blvd, West Chester, OH',
    details: '2 bedroom, 1 bath, 830 ft2 apartment with off street parking and swimming pool.',
    sourceUrl: 'https://www.craigslist.org/view/d/west-chester-2bd-1ba-off-street-parking/9Cyp4mYf35mBwGggWY5vou',
  },
  {
    title: 'Dishwasher, Playground, Volleyball Court',
    price: 1350,
    location: 'Cincinnati',
    address: '11365 Lippelman Rd, Cincinnati, OH',
    details: '2 bedroom, 1 bath, 1050 ft2 apartment with dishwasher, playground, and volleyball court.',
    sourceUrl: 'https://www.craigslist.org/view/d/cincinnati-dishwasher-playground/gqhYjyJXWHuQ8X44Q2K6Kd',
  },
  {
    title: 'Free Parking, Flat Screen TVs, Handicapped Accessible',
    price: 387,
    location: 'Florence',
    address: '8035 Action Blvd, Florence, KY',
    details: 'Housing with free parking, flat screen TVs, and handicapped accessibility.',
    sourceUrl: 'https://www.craigslist.org/view/d/florence-free-parking-flat-screen-tvs/5JWobT1AWTB42Xj5RA93DT',
  },
  {
    title: '2/bd, Ceiling Fans, Located in West Chester',
    price: 1154,
    location: 'West Chester',
    address: '6615 Fountains Blvd, West Chester, OH',
    details: '2 bedroom, 830 ft2 apartment with ceiling fans in West Chester.',
    sourceUrl: 'https://www.craigslist.org/view/d/west-chester-bd-ceiling-fans-located-in/ghySTQ5dJ6RA8qnVdUmLfZ',
  },
  {
    title: 'Oversized Closets, In West Chester, On Special!',
    price: 1119,
    location: 'West Chester',
    address: '6757 Lakeside Dr, West Chester, OH',
    details: '1 bedroom, 650 ft2 apartment with oversized closets in West Chester.',
    sourceUrl: 'https://www.craigslist.org/view/d/west-chester-oversized-closets-in-west/jgQxfWXmQVRkrwX7a2eVe2',
  },
  {
    title: 'Patio, Full Basement, 3/bd 2/ba',
    price: 25,
    location: 'Fond du Lac',
    address: '409 North Peters Avenue, Fond du Lac, WI',
    details: '3 bedroom, 2 bath, 1189 ft2 housing with patio and full basement.',
    sourceUrl: 'https://www.craigslist.org/view/d/fond-du-lac-patio-full-basement-bd-ba/uQ3UNo1GkTLyJkWqYXyWWC',
  },
  {
    title: 'TWO BEDROOM $975, SOUTHSIDE INDY',
    price: 975,
    location: 'Indianapolis',
    address: 'Southside Indianapolis, IN',
    details: '2 bedroom housing on Southside Indianapolis.',
    sourceUrl: 'https://www.craigslist.org/view/d/indianapolis-two-bedroom-975-southside/dCtpxkb6kBm1ko7dkFXBFD',
  },
  {
    title: 'TWO BEDROOM $975, SOUTHSIDE INDY',
    price: 975,
    location: 'Indianapolis',
    address: 'Southside Indianapolis, IN',
    details: '2 bedroom housing on Southside Indianapolis.',
    sourceUrl: 'https://www.craigslist.org/view/d/indianapolis-two-bedroom-975-southside/ffV9sDJKqT3a6yVEPhybSH',
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
const ownerListing = Object.values(existingListings ?? {}).find((item) => {
  const email = String(item.posted_by_email || item.contact_email || '').trim().toLowerCase();
  return email === ownerEmail;
});

const ownerPhone = ownerListing?.posted_by_phone || ownerListing?.contact_phone || null;
const ownerPassword = ownerListing?.posting_password || null;

const created = [];
for (const item of rawListings) {
  const payload = {
    title: item.title,
    description: `${item.details}\n\nAddress: ${item.address}\nSource: ${item.sourceUrl}`,
    category: 'housing',
    subcategory: 'apts / housing',
    price: item.price,
    location: item.location,
    contact_email: ownerEmail,
    contact_phone: ownerPhone,
    images: [],
    video_url: null,
    vehicle_details: null,
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

console.log(`Created ${created.length} housing listings for ${ownerEmail}.`);
for (const item of created) {
  console.log(`${item.id} ${item.title}`);
}
