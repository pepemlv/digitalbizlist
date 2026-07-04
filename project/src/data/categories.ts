export type CategoryGroup = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  subcategories: string[];
};

export const categoryGroups: CategoryGroup[] = [
  {
    id: 'community',
    label: 'Community',
    emoji: '🌈',
    color: 'blue',
    subcategories: [
      'activities', 'artists', 'childcare', 'classes', 'events', 'general',
      'groups', 'local news', 'lost + found', 'missed connections', 'musicians',
      'pets', 'politics', 'rants & raves', 'rideshare', 'volunteers',
    ],
  },
  {
    id: 'services',
    label: 'Services',
    emoji: '🛠',
    color: 'orange',
    subcategories: [
      'automotive', 'beauty', 'cell / mobile', 'computer', 'creative', 'cycle',
      'event', 'farm + garden', 'financial', 'health / well', 'household',
      'labor / move', 'legal', 'lessons', 'marine', 'pet', 'real estate',
      'skilled trade', 'sm biz ads', 'travel / vac', 'write / ed / tran',
    ],
  },
  {
    id: 'housing',
    label: 'Housing',
    emoji: '🏠',
    color: 'green',
    subcategories: [
      'apts / housing', 'housing swap', 'office / commercial', 'parking / storage',
      'real estate for sale', 'rooms / shared', 'rooms wanted', 'sublets / temporary',
      'vacation rentals', 'wanted: apts', 'wanted: real estate', 'wanted: sublet / temp',
    ],
  },
  {
    id: 'autos',
    label: 'Autos',
    emoji: '🚗',
    color: 'red',
    subcategories: [
      'atv / utv / sno', 'auto parts', 'aviation', 'boat parts', 'boats',
      'cars + trucks', 'heavy equip', 'motorcycle parts', 'motorcycles',
      'rvs + camp', 'trailers', 'wheels + tires',
    ],
  },
  {
    id: 'for sale',
    label: 'For Sale',
    emoji: '📚',
    color: 'purple',
    subcategories: [
      'antiques', 'appliances', 'arts + crafts', 'baby + kid', 'barter',
      'beauty + hlth', 'bike parts', 'bikes', 'books', 'business', 'cds / dvd / vhs',
      'cell phones', 'clothes + acc', 'collectibles', 'computer parts', 'computers',
      'electronics', 'farm + garden', 'free', 'furniture', 'garage sale', 'general',
      'household', 'jewelry', 'materials', 'music instr', 'photo + video',
      'sporting', 'tickets', 'tools', 'toys + games', 'video gaming', 'wanted',
    ],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    emoji: '🌞',
    color: 'yellow',
    subcategories: [
      'accounting + finance', 'admin / office', 'arch / engineering', 'art / media / design',
      'biotech / science', 'business / mgmt', 'customer service', 'education', 'etc / misc',
      'food / bev / hosp', 'general labor', 'government', 'human resources', 'legal / paralegal',
      'manufacturing', 'marketing / pr / ad', 'medical / health', 'nonprofit sector',
      'real estate', 'retail / wholesale', 'sales / biz dev', 'salon / spa / fitness',
      'security', 'skilled trade / craft', 'software / qa / dba', 'systems / network',
      'technical support', 'transport', 'tv / film / video', 'web / info design', 'writing / editing',
    ],
  },
  {
    id: 'gigs',
    label: 'Gigs',
    emoji: '📎',
    color: 'teal',
    subcategories: [
      'computer', 'creative', 'crew', 'domestic', 'event', 'labor', 'talent', 'writing',
    ],
  },
];

export const allCategories = categoryGroups.map(g => g.id);

export const getCategoryColor = (id: string): string => {
  const map: Record<string, string> = {
    community: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
    services: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100',
    housing: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
    autos: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100',
    'for sale': 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100',
    jobs: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
    gigs: 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100',
  };
  return map[id] || 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100';
};

export const getCategoryHeaderColor = (id: string): string => {
  const map: Record<string, string> = {
    community: 'text-blue-700 border-blue-300',
    services: 'text-orange-700 border-orange-300',
    housing: 'text-green-700 border-green-300',
    autos: 'text-red-700 border-red-300',
    'for sale': 'text-violet-700 border-violet-300',
    jobs: 'text-amber-700 border-amber-300',
    gigs: 'text-teal-700 border-teal-300',
  };
  return map[id] || 'text-gray-700 border-gray-300';
};
