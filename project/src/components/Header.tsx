import { useEffect, useState } from 'react';

const USER_PROFILE_STORAGE_KEY = 'digitalbizlist-user-profile';

type StoredUserProfile = {
  email: string;
  phone: string;
  password: string;
};

type Page = 'home' | 'browse' | 'post' | 'listing' | 'user' | 'login';

type Props = {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
};

export default function Header({ onNavigate }: Props) {
  const [currentUser, setCurrentUser] = useState<StoredUserProfile | null>(null);

  const syncCurrentUser = () => {
    const rawProfile = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!rawProfile) {
      setCurrentUser(null);
      return;
    }

    try {
      setCurrentUser(JSON.parse(rawProfile) as StoredUserProfile);
    } catch {
      setCurrentUser(null);
    }
  };

  const handleDashboardClick = () => {
    onNavigate(currentUser ? 'user' : 'login');
  };

  useEffect(() => {
    syncCurrentUser();

    const handleProfileChange = () => {
      syncCurrentUser();
    };

    window.addEventListener('user-profile-changed', handleProfileChange);
    return () => window.removeEventListener('user-profile-changed', handleProfileChange);
  }, []);

  return (
    <div className="border-b border-gray-300 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-4 flex-wrap">
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="font-bold text-xl tracking-tight hover:underline"
        >
          <span className="text-[#cc0000]">Digital</span>
          <span className="text-[#00519b]">Biz</span>
          <span className="text-black">List</span>
        </button>

        <nav className="ml-auto flex items-center gap-3">
          <button
            onClick={() => onNavigate('post')}
            className="border border-[#00519b] bg-[#00519b] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#003f78] transition"
          >
            post an ad
          </button>
          <button onClick={handleDashboardClick} className="text-[#00519b] text-xs hover:underline whitespace-nowrap">
            My dashaboard
          </button>
        </nav>
      </div>
    </div>
  );
}
