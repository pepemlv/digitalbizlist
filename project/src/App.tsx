import { lazy, Suspense, useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';

const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const PostAdPage = lazy(() => import('./pages/PostAdPage'));
const ListingPage = lazy(() => import('./pages/ListingPage'));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'));
const UserLoginPage = lazy(() => import('./pages/UserLoginPage'));

type Page = 'home' | 'browse' | 'post' | 'listing' | 'user' | 'login';

type NavState = {
  page: Page;
  params?: Record<string, string>;
};

const DEFAULT_CITY = 'Charlotte';
const SELECTED_CITY_STORAGE_KEY = 'digitalbizlist-selected-city';

const pages: Page[] = ['home', 'browse', 'post', 'listing', 'user', 'login'];

function buildHash(page: Page, params?: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return `#/${page === 'home' ? '' : page}${query ? `?${query}` : ''}`;
}

function parseHash(): NavState {
  const rawHash = window.location.hash.replace(/^#\/?/, '');
  const [rawPage, rawQuery = ''] = rawHash.split('?');
  const page = pages.includes(rawPage as Page) ? rawPage as Page : 'home';
  const params = Object.fromEntries(new URLSearchParams(rawQuery).entries());
  return { page, params };
}

export default function App() {
  const [nav, setNav] = useState<NavState>(() => parseHash());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(() => parseHash().params?.city || window.localStorage.getItem(SELECTED_CITY_STORAGE_KEY) || '');

  const onNavigate = (page: Page, params?: Record<string, string>) => {
    setNav({ page, params });
    const nextHash = buildHash(page, params);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const nextNav = parseHash();
      setNav(nextNav);
      if (nextNav.params?.city) {
        setSelectedCity(nextNav.params.city);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (selectedCity) {
      window.localStorage.setItem(SELECTED_CITY_STORAGE_KEY, selectedCity);
    } else {
      window.localStorage.removeItem(SELECTED_CITY_STORAGE_KEY);
    }
  }, [selectedCity]);

  const renderPage = () => {
    switch (nav.page) {
      case 'home':
        return (
          <HomePage
            onNavigate={onNavigate}
            city={selectedCity || DEFAULT_CITY}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCity={selectedCity}
            onSelectedCityChange={setSelectedCity}
            view={nav.params?.view}
          />
        );
      case 'browse':
        return (
          <BrowsePage
            onNavigate={onNavigate}
            initialCategory={nav.params?.category}
            initialSubcategory={nav.params?.subcategory}
            initialSearch={nav.params?.search}
            initialCity={nav.params?.city}
          />
        );
      case 'post':
        return <PostAdPage onNavigate={onNavigate} />;
      case 'listing':
        return <ListingPage listingId={nav.params?.id || ''} onNavigate={onNavigate} />;
      case 'login':
        return <UserLoginPage onNavigate={onNavigate} />;
      case 'user':
        return <UserDashboardPage onNavigate={onNavigate} />;
      default:
        return (
          <HomePage
            onNavigate={onNavigate}
            city={selectedCity || DEFAULT_CITY}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCity={selectedCity}
            onSelectedCityChange={setSelectedCity}
            view={nav.params?.view}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onNavigate={onNavigate}
      />
      <main className="flex-1">
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-6 text-sm text-gray-500">loading...</div>}>
          {renderPage()}
        </Suspense>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
