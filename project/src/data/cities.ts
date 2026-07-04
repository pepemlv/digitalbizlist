export type CityGroup = {
  state: string;
  cities: string[];
};

export const cityGroups: CityGroup[] = [
  {
    state: 'California',
    cities: ['Los Angeles', 'San Francisco Bay Area', 'San Diego', 'Orange County', 'Sacramento', 'Inland Empire', 'Fresno', 'Bakersfield', 'Palm Springs', 'Monterey'],
  },
  {
    state: 'Texas',
    cities: ['Dallas/Fort Worth', 'Houston', 'Austin', 'San Antonio', 'El Paso', 'Corpus Christi', 'Lubbock'],
  },
  {
    state: 'Florida',
    cities: ['Miami', 'Orlando', 'Tampa Bay', 'Jacksonville', 'Fort Myers', 'Tallahassee', 'Pensacola', 'Sarasota'],
  },
  {
    state: 'New York',
    cities: ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse', 'Long Island'],
  },
  {
    state: 'Illinois',
    cities: ['Chicago', 'Rockford', 'Peoria', 'Springfield'],
  },
  {
    state: 'Pennsylvania',
    cities: ['Philadelphia', 'Pittsburgh', 'Harrisburg', 'Erie', 'Scranton'],
  },
  {
    state: 'Ohio',
    cities: ['Cleveland', 'Columbus', 'Cincinnati', 'Toledo', 'Akron/Canton', 'Dayton'],
  },
  {
    state: 'North Carolina',
    cities: ['Charlotte', 'Raleigh', 'Greensboro', 'Fayetteville', 'Asheville', 'Wilmington', 'Winston-Salem'],
  },
  {
    state: 'Georgia',
    cities: ['Atlanta', 'Savannah', 'Augusta', 'Macon', 'Columbus'],
  },
  {
    state: 'Virginia',
    cities: ['Northern Virginia', 'Richmond', 'Hampton Roads', 'Roanoke'],
  },
  {
    state: 'Maryland',
    cities: ['Baltimore', 'Annapolis', 'Frederick', 'Hagerstown', 'Eastern Shore', 'Southern Maryland', 'Western Maryland'],
  },
  {
    state: 'Washington',
    cities: ['Seattle-Tacoma', 'Spokane', 'Bellingham', 'Olympia'],
  },
  {
    state: 'Oregon',
    cities: ['Portland', 'Eugene', 'Bend', 'Salem', 'Medford'],
  },
  {
    state: 'Colorado',
    cities: ['Denver', 'Colorado Springs', 'Fort Collins', 'Boulder'],
  },
  {
    state: 'Arizona',
    cities: ['Phoenix', 'Tucson', 'Flagstaff', 'Prescott'],
  },
  {
    state: 'Nevada',
    cities: ['Las Vegas', 'Reno'],
  },
  {
    state: 'Tennessee',
    cities: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga'],
  },
  {
    state: 'Missouri',
    cities: ['St. Louis', 'Kansas City', 'Springfield'],
  },
  {
    state: 'Michigan',
    cities: ['Detroit', 'Grand Rapids', 'Lansing', 'Ann Arbor', 'Flint'],
  },
  {
    state: 'Indiana',
    cities: ['Indianapolis', 'Fort Wayne', 'South Bend', 'Evansville'],
  },
  {
    state: 'Wisconsin',
    cities: ['Milwaukee', 'Madison', 'Green Bay'],
  },
  {
    state: 'Minnesota',
    cities: ['Minneapolis/St. Paul', 'Duluth', 'Rochester'],
  },
  {
    state: 'Louisiana',
    cities: ['New Orleans', 'Baton Rouge', 'Lafayette', 'Shreveport'],
  },
  {
    state: 'Alabama',
    cities: ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery'],
  },
  {
    state: 'South Carolina',
    cities: ['Columbia', 'Charleston', 'Greenville', 'Myrtle Beach'],
  },
  {
    state: 'Kentucky',
    cities: ['Louisville', 'Lexington', 'Bowling Green'],
  },
  {
    state: 'Oklahoma',
    cities: ['Oklahoma City', 'Tulsa'],
  },
  {
    state: 'Arkansas',
    cities: ['Little Rock', 'Fayetteville'],
  },
  {
    state: 'Kansas',
    cities: ['Wichita', 'Topeka'],
  },
  {
    state: 'Nebraska',
    cities: ['Omaha', 'Lincoln'],
  },
  {
    state: 'Iowa',
    cities: ['Des Moines', 'Cedar Rapids'],
  },
  {
    state: 'Mississippi',
    cities: ['Jackson', 'Gulfport'],
  },
  {
    state: 'Utah',
    cities: ['Salt Lake City', 'Provo', 'St. George'],
  },
  {
    state: 'Idaho',
    cities: ['Boise', 'Idaho Falls'],
  },
  {
    state: 'New Mexico',
    cities: ['Albuquerque', 'Santa Fe'],
  },
  {
    state: 'Alaska',
    cities: ['Anchorage', 'Fairbanks'],
  },
  {
    state: 'Hawaii',
    cities: ['Honolulu', 'Maui', 'Big Island', 'Kauai'],
  },
];

export const cityOptions = cityGroups.flatMap((group) => group.cities);
