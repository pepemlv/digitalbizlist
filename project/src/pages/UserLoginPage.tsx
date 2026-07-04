import { useEffect, useState } from 'react';
import { getListings } from '../lib/firebase';

type Page = 'home' | 'browse' | 'post' | 'listing' | 'user' | 'login';

type Props = {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
};

type UserAccount = {
  email: string;
  phone: string;
  password: string;
};

const USER_PROFILE_STORAGE_KEY = 'digitalbizlist-user-profile';
const USER_ACCOUNTS_STORAGE_KEY = 'digitalbizlist-user-accounts';

function getStoredAccounts() {
  const raw = window.localStorage.getItem(USER_ACCOUNTS_STORAGE_KEY);
  if (!raw) return [] as UserAccount[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as UserAccount[];
  }
}

function saveStoredAccounts(accounts: UserAccount[]) {
  window.localStorage.setItem(USER_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function upsertStoredAccount(account: UserAccount) {
  const accounts = getStoredAccounts();
  const existingIndex = accounts.findIndex((item) => item.email.toLowerCase() === account.email.toLowerCase());
  if (existingIndex >= 0) {
    accounts[existingIndex] = { ...accounts[existingIndex], ...account };
  } else {
    accounts.push(account);
  }
  saveStoredAccounts(accounts);
}

export default function UserLoginPage({ onNavigate }: Props) {
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedProfile = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (storedProfile) {
      onNavigate('user');
    }
  }, [onNavigate]);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (mode === 'create') {
      if (!trimmedPassword || !confirmPassword.trim()) {
        setError('Please create and confirm a password.');
        return;
      }

      if (trimmedPassword !== confirmPassword.trim()) {
        setError('Your password and confirmation do not match.');
        return;
      }
    } else if (!trimmedPassword) {
      setError('Please enter your password.');
      return;
    }

    const accounts = getStoredAccounts();
    let existingAccount = accounts.find((account) => account.email.toLowerCase() === normalizedEmail);

    if (mode === 'login') {
      if (!existingAccount) {
        const listings = await getListings({ approvedOnly: false, sortBy: 'newest' });
        const matchingListing = listings.find((item) => {
          const listingEmail = (item.posted_by_email || item.contact_email || '').toLowerCase();
          return listingEmail === normalizedEmail && item.posting_password === trimmedPassword;
        });

        if (matchingListing) {
          existingAccount = {
            email: normalizedEmail,
            phone: matchingListing.posted_by_phone || matchingListing.contact_phone || normalizedPhone,
            password: trimmedPassword,
          };
          upsertStoredAccount(existingAccount);
        }
      }

      if (!existingAccount || existingAccount.password !== trimmedPassword) {
        setError('These details do not match our records.');
        return;
      }
    } else if (!existingAccount) {
      upsertStoredAccount({ email: normalizedEmail, phone: normalizedPhone, password: trimmedPassword });
    }

    const profile = {
      email: normalizedEmail,
      phone: normalizedPhone,
      password: trimmedPassword,
    };

    window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event('user-profile-changed'));
    onNavigate('user');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="border border-gray-300 bg-white p-5">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          {mode === 'login' ? 'User login' : 'Create account'}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          {mode === 'login'
            ? 'Sign in to open your dashboard and manage your listings.'
            : 'Create a profile so your posts can be linked to your account.'}
        </p>

        {error && <p className="text-[#cc0000] text-xs mb-3">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border border-gray-400 px-2 py-1.5 text-sm w-full focus:outline-none focus:border-blue-500"
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="border border-gray-400 px-2 py-1.5 text-sm w-full focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border border-gray-400 px-2 py-1.5 text-sm w-full focus:outline-none focus:border-blue-500"
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="border border-gray-400 px-2 py-1.5 text-sm w-full focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={handleSubmit} className="border border-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-1.5 text-sm transition">
              {mode === 'login' ? 'sign in' : 'create account'}
            </button>
            <button onClick={() => onNavigate('home')} className="text-[#00519b] hover:underline text-sm">
              cancel
            </button>
          </div>

          <button
            onClick={() => {
              setMode(mode === 'login' ? 'create' : 'login');
              setError('');
            }}
            className="text-[#00519b] hover:underline text-sm"
          >
            {mode === 'login' ? 'create account / sign up' : 'already have an account? sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
