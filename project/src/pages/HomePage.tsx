import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { Listing } from '../lib/firebase';
import { categoryGroups } from '../data/categories';
import { cityGroups as defaultCityGroups } from '../data/cities';

type Page = 'home' | 'browse' | 'post' | 'listing';

type Props = {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  city: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCity: string;
  onSelectedCityChange: (city: string) => void;
  view?: string;
};

const localCityGroups = defaultCityGroups.map((group) => ({
  id: group.state.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'city-group',
  state: group.state,
  cities: group.cities,
}));

export default function HomePage({ onNavigate, city, searchQuery, onSearchChange, selectedCity, onSelectedCityChange, view }: Props) {
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const cityGroups = localCityGroups;
  const [showCityDirectory, setShowCityDirectory] = useState(false);
  const [showCategoryHome, setShowCategoryHome] = useState(view === 'categories');
  const [latestCategory, setLatestCategory] = useState('');
  const [escrowModalOpen, setEscrowModalOpen] = useState(false);

  const welcomeCategoryOrder = ['for sale', 'services', 'autos', 'housing', 'jobs'];
  const latestCategoryOptions = categoryGroups.filter((group) => ['for sale', 'services', 'autos', 'housing'].includes(group.id));
  const orderedCategories = [
    ...welcomeCategoryOrder
      .map((id) => categoryGroups.find((group) => group.id === id))
      .filter((group): group is (typeof categoryGroups)[number] => Boolean(group)),
    ...categoryGroups.filter((group) => !welcomeCategoryOrder.includes(group.id)),
  ];

  useEffect(() => {
    setShowCategoryHome(view === 'categories');
  }, [view]);

  useEffect(() => {
    const fetchRecentListings = async () => {
      const { getListings } = await import('../lib/firebase');
      const recent = await getListings({ limit: 50, sortBy: 'newest' });
      setRecentListings(recent);
    };
    fetchRecentListings();
  }, []);

  const handleWelcomeSearch = () => {
    const trimmedQuery = searchQuery.trim();
    const params: Record<string, string> = {};
    if (trimmedQuery) params.search = trimmedQuery;
    if (selectedCity) params.city = selectedCity;
    onNavigate('browse', params);
  };

  const cityBrowseParams = (params: Record<string, string> = {}) => ({
    ...(selectedCity ? { city: selectedCity } : {}),
    ...params,
  });

  const openCityPage = (nextCity: string) => {
    onSelectedCityChange(nextCity);
    setShowCityDirectory(false);
    onNavigate('home');
  };

  const openCategoryHome = () => {
    setShowCategoryHome(true);
    onNavigate('home', { view: 'categories' });
  };

  const openLatestHome = () => {
    setShowCategoryHome(false);
    onNavigate('home');
  };

  const formatPrice = (price: number | null) => {
    if (price == null) return 'price not listed';
    return price === 0 ? 'free' : `$${price.toLocaleString()}`;
  };
  const latestListings = latestCategory
    ? recentListings.filter((listing) => listing.category === latestCategory)
    : recentListings;

  return (
    <div className="max-w-5xl mx-auto px-2 py-2 sm:px-4 sm:py-4">
      {showCategoryHome && (
        <div className="text-center mb-4">
          <button
            onClick={() => setShowCityDirectory(true)}
            className="text-2xl font-bold text-[#00519b] tracking-tight underline hover:text-blue-800"
          >
            {city}
          </button>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs">
            <button onClick={() => onNavigate('post')} className="text-[#00519b] hover:underline">post an ad</button>
            <span className="text-gray-400">&bull;</span>
            <button onClick={() => onNavigate('browse', cityBrowseParams())} className="text-[#00519b] hover:underline">browse all</button>
          </div>
        </div>
      )}

      {showCityDirectory && (
        <section className="mb-6 border border-gray-300 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-gray-900">select a city</h1>
            <button onClick={() => setShowCityDirectory(false)} className="text-xs text-[#00519b] hover:underline">
              back to {city}
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {cityGroups.map((group) => (
              <div key={group.id}>
                <p className="mb-1 border-b border-gray-300 pb-0.5 text-xs font-semibold text-gray-600">{group.state}</p>
                <ul className="space-y-0.5">
                  {group.cities.map((cityName) => (
                    <li key={`${group.id}-${cityName}`}>
                      <button
                        onClick={() => openCityPage(cityName)}
                        className={`text-sm hover:underline text-left ${selectedCity === cityName ? 'font-semibold text-gray-800' : 'text-[#00519b]'}`}
                      >
                        {cityName}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {!showCityDirectory && !showCategoryHome && (
        <>
      <div className="mb-2 flex flex-col gap-2 border border-gray-300 bg-white p-2 sm:mb-4 sm:gap-3 sm:p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] text-green-700 sm:text-[11px]">
            Escrow service available for some services and products.{' '}
            <button onClick={() => setEscrowModalOpen(true)} className="font-semibold text-[#00519b] hover:underline">
              Learn More
            </button>
          </p>
        </div>
        <button
          onClick={openCategoryHome}
          className="border border-[#00519b] bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#00519b] hover:bg-blue-100 sm:text-sm"
        >
          go to all categories
        </button>
      </div>

      <div className="mb-2 border border-gray-300 bg-white p-2 sm:mb-5 sm:p-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <input
            type="text"
            placeholder="search announcements..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleWelcomeSearch()}
            className="border border-gray-400 px-2 py-1 text-xs focus:outline-none focus:border-blue-500 flex-1 sm:py-1.5 sm:text-sm"
          />
          <select
            value={selectedCity}
            onChange={(event) => onSelectedCityChange(event.target.value)}
            className="border border-gray-400 px-2 py-1 text-xs text-[#00519b] bg-white focus:outline-none focus:border-blue-500 sm:w-56 sm:py-1.5 sm:text-sm"
            aria-label="Select city"
          >
            <option value="">all cities</option>
            {cityGroups.map((group) => (
              <optgroup key={group.id} label={group.state}>
                {group.cities.map((option) => (
                  <option key={`${group.id}-${option}`} value={option}>{option}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={handleWelcomeSearch}
            className="border border-gray-400 bg-gray-100 hover:bg-gray-200 px-3 py-1 text-xs transition flex items-center justify-center gap-1 sm:py-1.5 sm:text-sm"
          >
            <Search size={14} /> search
          </button>
        </div>
      </div>

      <div className="mb-2 border border-gray-300 bg-white p-1 sm:mb-4 sm:p-2">
        <div className="grid grid-cols-5 items-center gap-1 text-[10px] sm:flex sm:flex-nowrap sm:gap-4 sm:text-xs">
          <span className="hidden font-semibold text-gray-600 sm:inline">categories</span>
          <label className="flex min-w-0 items-center justify-center gap-0.5 whitespace-nowrap font-semibold text-gray-700 sm:justify-start sm:gap-1">
            <input
              type="radio"
              name="latest-category"
              checked={!latestCategory}
              onChange={() => setLatestCategory('')}
              className="h-3 w-3 shrink-0"
            />
            all
          </label>
          {latestCategoryOptions.map((group) => (
            <label key={group.id} className="flex min-w-0 items-center justify-center gap-0.5 whitespace-nowrap font-semibold text-gray-700 sm:justify-start sm:gap-1">
              <input
                type="radio"
                name="latest-category"
                checked={latestCategory === group.id}
                onChange={() => setLatestCategory(group.id)}
                className="h-3 w-3 shrink-0"
              />
              <span className="min-w-0 truncate">{group.emoji}{group.label.toLowerCase()}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:gap-5 md:grid-cols-[220px_1fr]">
        <aside className="hidden space-y-5 md:block">
          <div className="border border-gray-300 bg-white p-3">
            <p className="mb-2 border-b border-gray-300 pb-1 text-xs font-semibold text-gray-600">categories</p>
            <ul className="space-y-1">
              {orderedCategories.map((group) => (
                <li key={group.id}>
                  <button
                    onClick={() => onNavigate('browse', cityBrowseParams({ category: group.id }))}
                    className="text-left text-sm text-[#00519b] hover:underline"
                  >
                    <span className="mr-1">{group.emoji}</span>{group.label.toLowerCase()}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-gray-300 bg-white p-3">
            <p className="mb-2 border-b border-gray-300 pb-1 text-xs font-semibold text-gray-600">quick links</p>
            <ul className="space-y-1 text-xs">
              <li><button onClick={() => onNavigate('post')} className="text-[#00519b] hover:underline">post an ad</button></li>
              <li><button onClick={openCategoryHome} className="text-[#00519b] hover:underline">all categories</button></li>
            </ul>
          </div>
        </aside>

        <section className="min-w-0">
          {recentListings.length === 0 ? (
            <p className="text-sm text-gray-500">Loading latest ads...</p>
          ) : latestListings.length === 0 ? (
            <p className="text-xs text-gray-500">No latest ads in this category.</p>
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                {latestListings.map((listing) => {
                  const mainImage = listing.images?.find(Boolean);
                  return (
                    <li key={listing.id} className="border border-gray-300 bg-white">
                      <button
                        onClick={() => onNavigate('listing', { id: listing.id })}
                        className="block w-full text-left"
                      >
                        <div className="relative aspect-[4/3] bg-gray-100">
                          {mainImage ? (
                            <img
                              src={mainImage}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-gray-400">
                              no image
                            </span>
                          )}
                          <div className="absolute inset-x-0 top-0 bg-black/65 px-2 py-1.5 text-white">
                            <div className="flex items-center justify-between gap-2">
                              <p className="min-w-0 truncate text-sm font-semibold leading-snug sm:text-xs">{listing.title}</p>
                              <span className="shrink-0 text-sm font-semibold text-green-300 sm:text-[11px]">{formatPrice(listing.price)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 sm:p-3">
                          <p className="truncate text-[11px] text-gray-500 sm:text-xs">
                            {listing.location} - {listing.subcategory || listing.category}
                            {listing.is_sold ? ' - sold' : ''}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => onNavigate('browse', cityBrowseParams())}
                  className="border border-[#00519b] bg-blue-50 px-4 py-1.5 text-xs font-semibold text-[#00519b] hover:bg-blue-100 sm:text-sm"
                >
                  see all
                </button>
              </div>
            </>
          )}
        </section>
      </div>
        </>
      )}

      {!showCityDirectory && showCategoryHome && (
        <>
      <div className="mb-4 flex justify-end">
        <button onClick={openLatestHome} className="text-sm text-[#00519b] hover:underline">
          back to latest ads
        </button>
      </div>
      <div className="mb-5 border border-gray-300 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="search announcements..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleWelcomeSearch()}
            className="border border-gray-400 px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 flex-1"
          />
          <select
            value={selectedCity}
            onChange={(event) => onSelectedCityChange(event.target.value)}
            className="border border-gray-400 px-2 py-1.5 text-sm text-[#00519b] bg-white focus:outline-none focus:border-blue-500 sm:w-56"
            aria-label="Select city"
          >
            <option value="">all cities</option>
            {cityGroups.map((group) => (
              <optgroup key={group.id} label={group.state}>
                {group.cities.map((option) => (
                  <option key={`${group.id}-${option}`} value={option}>{option}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={handleWelcomeSearch}
            className="border border-gray-400 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm transition flex items-center justify-center gap-1"
          >
            <Search size={14} /> search
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left: categories */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
            {orderedCategories.map(group => (
              <div key={group.id}>
                <button
                  onClick={() => onNavigate('browse', cityBrowseParams({ category: group.id }))}
                  className="font-semibold text-[#00519b] hover:underline text-[15px] block mb-1"
                >
                  <span className="mr-1">{group.emoji}</span>
                  {group.label.toLowerCase()}
                </button>
                <ul className="space-y-0.5">
                  {group.subcategories.slice(0, 10).map(sub => (
                    <li key={sub}>
                      <button
                        onClick={() => onNavigate('browse', cityBrowseParams({ category: group.id, subcategory: sub }))}
                        className="text-[#00519b] hover:underline text-sm leading-snug text-left"
                      >
                        {sub}
                      </button>
                    </li>
                  ))}
                  {group.subcategories.length > 10 && (
                    <li>
                      <button
                        onClick={() => onNavigate('browse', cityBrowseParams({ category: group.id }))}
                        className="text-[#00519b] hover:underline text-sm italic"
                      >
                        more...
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 md:hidden">
            <p className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-0.5 mb-2">all cities</p>
            <ul className="columns-2 gap-x-6 space-y-0.5">
              {cityGroups.flatMap((group) => group.cities.map((cityName) => (
                <li key={`${group.id}-${cityName}`} className="break-inside-avoid">
                  <button
                    onClick={() => openCityPage(cityName)}
                    className={`text-xs hover:underline text-left ${selectedCity === cityName ? 'font-semibold text-gray-800' : 'text-[#00519b]'}`}
                  >
                    {cityName}
                  </button>
                </li>
              )))}
            </ul>
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="w-44 flex-shrink-0 hidden md:block space-y-5">
          {/* Info links */}
          <div>
            <p className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-0.5 mb-1">info</p>
            <ul className="space-y-1">
              {['help / faq', 'avoid scams', 'safety tips', 'about us', "what's new"].map(item => (
                <li key={item}>
                  <span className="text-[#00519b] hover:underline text-xs cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* City links */}
          <div>
            <p className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-0.5 mb-1">all cities</p>
            <ul className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
              {cityGroups.flatMap((group) => group.cities.map((cityName) => (
                <li key={`${group.id}-${cityName}`}>
                  <button
                    onClick={() => openCityPage(cityName)}
                    className={`text-xs hover:underline text-left ${selectedCity === cityName ? 'font-semibold text-gray-800' : 'text-[#00519b]'}`}
                  >
                    {cityName}
                  </button>
                </li>
              )))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent listings */}
      {recentListings.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-300">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            recent listings &mdash;{' '}
            <button onClick={() => onNavigate('browse', cityBrowseParams())} className="text-[#00519b] hover:underline font-normal">
              view all
            </button>
          </p>
          <ul className="columns-1 sm:columns-2 md:columns-3 gap-x-8 space-y-0.5">
            {recentListings.map(listing => (
              <li key={listing.id} className="break-inside-avoid text-xs leading-snug">
                <button
                  onClick={() => onNavigate('listing', { id: listing.id })}
                  className="text-[#00519b] hover:underline text-left"
                >
                  {listing.title}
                </button>
                {listing.price != null && (
                  <span className="text-gray-500 ml-1">
                    ({listing.price === 0 ? 'free' : `$${listing.price.toLocaleString()}`})
                  </span>
                )}
                {listing.is_sold && (
                  <span className="text-[#cc0000] font-semibold ml-1">(sold)</span>
                )}
                <span className="text-gray-400 ml-1">({listing.subcategory || listing.category})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
        </>
      )}
      {escrowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-gray-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-green-700">Escrow Service Assistance</p>
                <h2 className="text-lg font-semibold text-gray-900">DigitalBizList Escrow Service Assistance</h2>
              </div>
              <button onClick={() => setEscrowModalOpen(false)} className="text-sm text-[#00519b] hover:underline">
                close
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <p>Protect your transaction with our optional escrow assistance.</p>
              <p>
                For eligible products and services valued at $1,000 or less, either the buyer or the seller may request escrow assistance through DigitalBizList.
              </p>

              <div>
                <p className="mb-1 font-semibold text-gray-900">How It Works</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>The buyer and seller agree to use escrow.</li>
                  <li>The buyer submits payment to the escrow account.</li>
                  <li>The seller delivers the product or completes the service.</li>
                  <li>The buyer confirms satisfactory delivery.</li>
                  <li>The funds are released to the seller.</li>
                </ol>
              </div>

              <div>
                <p className="mb-1 font-semibold text-gray-900">Benefits</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Secure payment handling</li>
                  <li>Reduced risk of fraud</li>
                  <li>Protection for both buyers and sellers</li>
                  <li>Neutral assistance if an issue arises</li>
                  <li>Greater confidence for online transactions</li>
                </ul>
              </div>

              <div>
                <p className="mb-1 font-semibold text-gray-900">Eligibility</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Products and services listed on DigitalBizList</li>
                  <li>Transactions up to $1,000</li>
                  <li>Subject to DigitalBizList Escrow Terms & Conditions</li>
                </ul>
              </div>

              <div className="border border-green-200 bg-green-50 p-3">
                <p className="font-semibold text-green-900">Need escrow for your transaction?</p>
                <p className="mt-1 text-green-900">Either the buyer or the seller can request escrow assistance before payment is made.</p>
                <button className="mt-3 border border-green-700 bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800">
                  Request Escrow Assistance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
