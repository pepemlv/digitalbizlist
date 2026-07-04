import { useEffect, useMemo, useState } from 'react';
import { deleteListing, getListingInquiries, getListings, getUserPlan, hideListing, Listing, ListingInquiry, pricingPlans, updateListingDetails, updateListingSoldStatus, UserPlan } from '../lib/firebase';
import PlanPaymentForm from '../components/PlanPaymentForm';

type Page = 'home' | 'browse' | 'post' | 'listing' | 'user';

type Props = {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
};

type UserProfile = {
  email: string;
  phone: string;
  password: string;
};

type DashboardSection = 'announcements' | 'plans' | 'settings' | 'messages';

type MessageItem = {
  id: number;
  title: string;
  preview: string;
  time: string;
  unread: boolean;
};

type EditListingForm = {
  title: string;
  description: string;
  price: string;
  location: string;
  contact_email: string;
  contact_phone: string;
  show_contact_email: boolean;
  show_contact_phone: boolean;
  images: string[];
};

const PROFILE_STORAGE_KEY = 'digitalbizlist-user-profile';
const MAX_LISTING_IMAGES = 15;

export default function UserDashboardPage({ onNavigate }: Props) {
  const [profile, setProfile] = useState<UserProfile>({ email: '', phone: '', password: '' });
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<ListingInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState<DashboardSection>('announcements');
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditListingForm>({
    title: '',
    description: '',
    price: '',
    location: '',
    contact_email: '',
    contact_phone: '',
    show_contact_email: true,
    show_contact_phone: true,
    images: [],
  });
  const [listingActionMessage, setListingActionMessage] = useState('');
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [planMessage, setPlanMessage] = useState('');
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<'starter' | 'business' | null>(null);
  const [messages] = useState<MessageItem[]>([
    {
      id: 1,
      title: 'New inquiry for your listing',
      preview: 'A buyer asked about your price and availability.',
      time: '10 min ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Listing published',
      preview: 'Your listing has been published and is now live.',
      time: '1 day ago',
      unread: false,
    },
  ]);

  useEffect(() => {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      const [data, inquiryData] = await Promise.all([
        getListings({ approvedOnly: false, sortBy: 'newest' }),
        getListingInquiries(),
      ]);
      setListings(data);
      setInquiries(inquiryData);
      setLoading(false);
    };

    loadListings();
  }, []);

  useEffect(() => {
    if (!profile.email.trim()) {
      setUserPlan(null);
      return;
    }

    let cancelled = false;
    const loadPlan = async () => {
      try {
        const plan = await getUserPlan(profile.email);
        if (!cancelled) setUserPlan(plan);
      } catch {
        if (!cancelled) setUserPlan(null);
      }
    };

    void loadPlan();
    return () => {
      cancelled = true;
    };
  }, [profile.email]);

  const refreshListings = async () => {
    setLoading(true);
    const [data, inquiryData] = await Promise.all([
      getListings({ approvedOnly: false, sortBy: 'newest' }),
      getListingInquiries(),
    ]);
    setListings(data);
    setInquiries(inquiryData);
    setLoading(false);
  };

  const myListings = useMemo(() => {
    if (!profile.email && !profile.phone && !profile.password) {
      return [];
    }

    return listings.filter((item) => {
      const matchesEmail = profile.email && item.contact_email?.toLowerCase() === profile.email.toLowerCase();
      const matchesPhone = profile.phone && item.contact_phone === profile.phone;
      const matchesPassword = profile.password && item.posting_password === profile.password;
      return matchesEmail || matchesPhone || matchesPassword;
    });
  }, [listings, profile]);

  const myListingIds = useMemo(() => new Set(myListings.map((item) => item.id)), [myListings]);
  const myInquiries = useMemo(() => inquiries.filter((item) => myListingIds.has(item.listing_id)), [inquiries, myListingIds]);
  const activeListings = useMemo(() => myListings.filter((item) => item.is_active !== false && !item.is_sold), [myListings]);
  const effectivePlan = userPlan ?? {
    id: 'free',
    email: profile.email,
    plan_id: 'free' as const,
    ads_limit: pricingPlans.free.adLimit,
    ads_used: 0,
    period_started_at: null,
    period_ends_at: null,
  };
  const planDefinition = pricingPlans[effectivePlan.plan_id];
  const planUsedCount = effectivePlan.plan_id === 'free' ? activeListings.length : effectivePlan.ads_used;
  const adsRemaining = Math.max(0, effectivePlan.ads_limit - planUsedCount);
  const progressPercent = effectivePlan.ads_limit > 0 ? Math.min(100, Math.round((planUsedCount / effectivePlan.ads_limit) * 100)) : 0;
  const timeLeftLabel = (() => {
    if (effectivePlan.plan_id === 'starter') return 'Valid until all 5 ads are used';
    if (!effectivePlan.period_ends_at) return effectivePlan.plan_id === 'free' ? '7-day free posting rule' : 'No active window';
    const days = Math.max(0, Math.ceil((new Date(effectivePlan.period_ends_at).getTime() - Date.now()) / 86400000));
    return `${days} Day${days === 1 ? '' : 's'} Remaining`;
  })();

  const getListingDaysLeft = (item: Listing) => {
    const createdAt = new Date(item.created_at).getTime();
    if (!Number.isFinite(createdAt)) return null;
    return Math.max(0, Math.ceil((createdAt + planDefinition.activeDays * 86400000 - Date.now()) / 86400000));
  };

  const handleUpgrade = async (planId: 'starter' | 'business') => {
    const email = profile.email.trim().toLowerCase();
    if (!email) {
      setPlanMessage('Add your email in account settings before upgrading.');
      return;
    }

    setPlanMessage('');
    setActiveSection('plans');
    setSelectedPaymentPlan(planId);
  };

  const refreshPlanAfterPayment = async () => {
    setSelectedPaymentPlan(null);
    setPlanMessage('Payment complete. Your plan is active.');
    if (profile.email.trim()) {
      const plan = await getUserPlan(profile.email);
      setUserPlan(plan);
    }
  };

  const logoutToHome = () => {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    window.dispatchEvent(new Event('user-profile-changed'));
    onNavigate('home');
  };

  const saveProfile = () => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event('user-profile-changed'));
    setMessage('Account settings saved.');
  };

  const openListingDetails = (item: Listing) => {
    const nextId = expandedListingId === item.id ? null : item.id;
    setExpandedListingId(nextId);
    setEditingListingId(null);
    setListingActionMessage('');
  };

  const startEditingListing = (item: Listing) => {
    setExpandedListingId(item.id);
    setEditingListingId(item.id);
    setListingActionMessage('');
    setEditForm({
      title: item.title,
      description: item.description,
      price: item.price == null ? '' : String(item.price),
      location: item.location,
      contact_email: item.contact_email || '',
      contact_phone: item.contact_phone || '',
      show_contact_email: item.show_contact_email !== false,
      show_contact_phone: item.show_contact_phone !== false,
      images: item.images || [],
    });
  };

  const readPhotoFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const uploadEditImage = async (slotIndex: number, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setListingActionMessage('Please upload image files only.');
      return;
    }

    try {
      const image = await readPhotoFile(file);
      setEditForm((prev) => {
        const next = [...prev.images];
        next[slotIndex] = image;
        return { ...prev, images: next.filter(Boolean).slice(0, MAX_LISTING_IMAGES) };
      });
      setListingActionMessage('');
    } catch {
      setListingActionMessage('Could not read that image. Try another file.');
    }
  };

  const removeEditImage = (slotIndex: number) => {
    setEditForm((prev) => ({ ...prev, images: prev.images.filter((_, index) => index !== slotIndex) }));
  };

  const moveEditImage = (fromIndex: number, toIndex: number) => {
    setEditForm((prev) => {
      if (toIndex < 0 || toIndex >= prev.images.length) return prev;
      const next = [...prev.images];
      const [image] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, image);
      return { ...prev, images: next };
    });
  };

  const makeMainEditImage = (index: number) => {
    moveEditImage(index, 0);
  };

  const saveListingEdit = async (id: string) => {
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.location.trim()) {
      setListingActionMessage('Title, description, and city are required.');
      return;
    }

    await updateListingDetails(id, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      price: editForm.price.trim() ? Number(editForm.price) : null,
      location: editForm.location.trim(),
      contact_email: editForm.contact_email.trim() || null,
      contact_phone: editForm.contact_phone.trim() || null,
      show_contact_email: editForm.show_contact_email,
      show_contact_phone: editForm.show_contact_phone,
      images: editForm.images,
    });
    setEditingListingId(null);
    setListingActionMessage('Announcement updated and published.');
    await refreshListings();
  };

  const handleHideListing = async (id: string) => {
    await hideListing(id);
    setExpandedListingId(null);
    setListingActionMessage('Announcement hidden.');
    await refreshListings();
  };

  const handleDeleteListing = async (id: string) => {
    const shouldDelete = window.confirm('Delete this announcement permanently?');
    if (!shouldDelete) return;

    await deleteListing(id);
    setExpandedListingId(null);
    setListingActionMessage('Announcement deleted.');
    await refreshListings();
  };

  const handleToggleSold = async (id: string, isSold: boolean) => {
    await updateListingSoldStatus(id, isSold);
    setListingActionMessage(isSold ? 'Announcement marked as sold.' : 'Sold mark removed.');
    await refreshListings();
  };

  const navButtonClass = (section: DashboardSection) =>
    `w-full text-left px-3 py-2 text-sm border ${
      activeSection === section
        ? 'border-[#00519b] bg-blue-50 text-[#00519b] font-semibold'
        : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-[#00519b]'
    }`;
  const dashboardTitle = `${profile.email || 'User'} dashboard`;

  const renderAccountSummary = () => (
    <section className="border border-gray-300 bg-white p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Account Summary</p>
          <h2 className="text-lg font-semibold text-gray-900">
            Current Plan: {planDefinition.name} ({planDefinition.priceLabel})
          </h2>
          <p className="text-sm text-gray-600">{planDefinition.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('plans')}
            className="border border-gray-400 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            view plans details
          </button>
          <button
            type="button"
            onClick={() => handleUpgrade('starter')}
            className="border border-[#00519b] bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#00519b] hover:bg-blue-100 disabled:opacity-50"
          >
            Publish 5 Ads - $5
          </button>
          <button
            type="button"
            onClick={() => handleUpgrade('business')}
            className="border border-[#00519b] bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#00519b] hover:bg-blue-100 disabled:opacity-50"
          >
            Publish 15 Ads - $10
          </button>
        </div>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Ads Remaining</p>
          <p className="font-semibold text-gray-900">{adsRemaining} / {effectivePlan.ads_limit}</p>
        </div>
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Active Ads</p>
          <p className="font-semibold text-gray-900">{activeListings.length}</p>
        </div>
        <div className="border border-gray-200 p-3 sm:col-span-2">
          <p className="text-xs text-gray-500">Time Left to Publish</p>
          <p className="font-semibold text-gray-900">{timeLeftLabel}</p>
        </div>
      </div>
      <div>
        <div className="h-2 overflow-hidden bg-gray-200">
          <div className="h-full bg-[#00519b]" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500">{planUsedCount} of {effectivePlan.ads_limit} ads used</p>
      </div>
      {planMessage && <p className="text-xs text-[#cc0000]">{planMessage}</p>}
    </section>
  );

  const renderAnnouncements = () => (
    <section className="border border-gray-300 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Your announcements</h2>
        <button onClick={() => onNavigate('post')} className="text-[#00519b] hover:underline text-sm">+ new</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading your announcements...</p>
      ) : myListings.length === 0 ? (
        <div className="text-sm text-gray-600 space-y-2">
          <p>No announcements match your saved details yet.</p>
          <button onClick={() => onNavigate('post')} className="text-[#00519b] hover:underline">Post a new announcement</button>
        </div>
      ) : (
        <div className="space-y-2">
          {myListings.map((item) => (
            <div key={item.id} className="border border-gray-200 px-3 py-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold text-gray-900">{item.title}</p>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                    <span>{item.price == null ? 'no price' : item.price === 0 ? 'free' : `$${item.price.toLocaleString()}`}</span>
                    <span className={item.is_sold ? 'font-semibold text-[#cc0000]' : ''}>
                      {item.is_sold ? 'Sold' : item.approval_status === 'approved' ? 'Published' : item.approval_status === 'rejected' ? 'Rejected' : 'In review'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                  <p className="min-w-0 truncate text-gray-600">{item.category}{item.subcategory ? ` / ${item.subcategory}` : ''} - {item.location}</p>
                  <div className="flex shrink-0 flex-wrap justify-end gap-3">
                    <button onClick={() => openListingDetails(item)} className="text-[#00519b] hover:underline">
                      {expandedListingId === item.id ? 'Hide details' : 'Show details'}
                    </button>
                    <button onClick={() => onNavigate('listing', { id: item.id })} className="text-[#00519b] hover:underline">
                      View
                    </button>
                    <button
                      onClick={() => handleToggleSold(item.id, !item.is_sold)}
                      className="text-[#cc0000] hover:underline"
                    >
                      {item.is_sold ? 'unsold' : 'sold'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>Days Left: {getListingDaysLeft(item) ?? 'n/a'}</span>
                  <span>Views: --</span>
                  <span>Messages: {myInquiries.filter((inquiry) => inquiry.listing_id === item.id).length}</span>
                </div>
              </div>
              {expandedListingId === item.id && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  {listingActionMessage && <p className="text-sm text-gray-600 mb-2">{listingActionMessage}</p>}
                  {editingListingId === item.id ? (
                    <div className="space-y-3 text-sm">
                      <label className="block">
                        <span className="block text-gray-600 mb-1">Title</span>
                        <input
                          value={editForm.title}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                          className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-gray-600 mb-1">Description</span>
                        <textarea
                          value={editForm.description}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                          rows={5}
                          className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                        />
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="block text-gray-600 mb-1">Price</span>
                          <input
                            type="number"
                            value={editForm.price}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                            className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-gray-600 mb-1">City</span>
                          <input
                            value={editForm.location}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))}
                            className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-gray-600 mb-1">Email</span>
                          <input
                            value={editForm.contact_email}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                            className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          />
                          <span className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={editForm.show_contact_email}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, show_contact_email: event.target.checked }))}
                            />
                            show email on announcement
                          </span>
                        </label>
                        <label className="block">
                          <span className="block text-gray-600 mb-1">Phone</span>
                          <input
                            value={editForm.contact_phone}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
                            className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          />
                          <span className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={editForm.show_contact_phone}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, show_contact_phone: event.target.checked }))}
                            />
                            show phone on announcement
                          </span>
                        </label>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-700">Images</p>
                          <span className="text-xs text-gray-500">{editForm.images.length}/{MAX_LISTING_IMAGES}</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          {Array.from({ length: MAX_LISTING_IMAGES }).map((_, index) => {
                            const image = editForm.images[index];
                            return (
                              <div key={index} className="border border-gray-300 bg-white p-1">
                                {image ? (
                                  <div className="space-y-1">
                                    <img src={image} alt={`announcement ${index + 1}`} className="aspect-square w-full object-cover border border-gray-200" />
                                    <p className="text-[11px] text-gray-500">{index === 0 ? 'main image' : `image ${index + 1}`}</p>
                                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
                                      {index > 0 && (
                                        <button type="button" onClick={() => makeMainEditImage(index)} className="text-[#00519b] hover:underline">
                                          main
                                        </button>
                                      )}
                                      <button type="button" onClick={() => moveEditImage(index, index - 1)} disabled={index === 0} className="text-[#00519b] hover:underline disabled:text-gray-300">
                                        up
                                      </button>
                                      <button type="button" onClick={() => moveEditImage(index, index + 1)} disabled={index >= editForm.images.length - 1} className="text-[#00519b] hover:underline disabled:text-gray-300">
                                        down
                                      </button>
                                      <button type="button" onClick={() => removeEditImage(index)} className="text-[#cc0000] hover:underline">
                                        remove
                                      </button>
                                    </div>
                                    <label className="block text-[11px] text-[#00519b] hover:underline cursor-pointer">
                                      replace
                                      <input type="file" accept="image/*" onChange={(event) => uploadEditImage(index, event.target.files)} className="hidden" />
                                    </label>
                                  </div>
                                ) : (
                                  <label className="flex aspect-square cursor-pointer items-center justify-center text-xs text-[#00519b] hover:bg-gray-50">
                                    upload
                                    <input type="file" accept="image/*" onChange={(event) => uploadEditImage(index, event.target.files)} className="hidden" />
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => saveListingEdit(item.id)} className="border border-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5">
                          Save changes
                        </button>
                        <button onClick={() => setEditingListingId(null)} className="text-[#00519b] hover:underline">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="whitespace-pre-line text-gray-700">{item.description}</div>
                      <div className="grid gap-1 text-gray-500 md:grid-cols-2">
                        <p>Category: {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}</p>
                        <p>City: {item.location}</p>
                        <p>Price: {item.price == null ? 'not listed' : item.price === 0 ? 'free' : `$${item.price.toLocaleString()}`}</p>
                        <p>
                          Contact: {[
                            item.show_contact_email !== false ? item.contact_email : '',
                            item.show_contact_phone !== false ? item.contact_phone : '',
                          ].filter(Boolean).join(' / ') || 'hidden'}
                        </p>
                        {item.vehicle_details?.make && <p>Vehicle: {[item.vehicle_details.year, item.vehicle_details.make, item.vehicle_details.model].filter(Boolean).join(' ')}</p>}
                        {item.vehicle_details?.title_status && <p>Title status: {item.vehicle_details.title_status}</p>}
                        {item.is_sold && <p className="font-semibold text-[#cc0000]">Sold</p>}
                      </div>
                      {item.images && item.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {item.images.slice(0, MAX_LISTING_IMAGES).map((image) => (
                            <img key={image} src={image} alt={item.title} className="aspect-square w-full object-cover border border-gray-200" />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => startEditingListing(item)} className="border border-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5">
                          Edit
                        </button>
                        <button onClick={() => handleUpgrade(effectivePlan.plan_id === 'business' ? 'business' : 'starter')} className="border border-[#00519b] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 text-[#00519b]">
                          Renew
                        </button>
                        <button onClick={() => handleHideListing(item.id)} className="border border-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-amber-700">
                          Hide
                        </button>
                        <button onClick={() => handleDeleteListing(item.id)} className="border border-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-red-700">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderPlans = () => (
    <section className="border border-gray-300 bg-white p-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">DigitalBizList Pricing</p>
          <h2 className="text-lg font-semibold text-gray-900">Choose a posting plan</h2>
          <p className="text-sm text-gray-600">Pay securely on this page to activate Starter or Business on your dashboard email.</p>
        </div>
        <button onClick={() => setActiveSection('announcements')} className="text-sm text-[#00519b] hover:underline">
          back to dashboard
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-500">Free Plan</p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-900">$0</h3>
          <p className="mt-1 text-sm text-gray-600">Perfect for trying DigitalBizList.</p>
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            <li>1 active ad at a time</li>
            <li>Publish 1 ad every 7 days</li>
            <li>Ad stays online for 60 days</li>
            <li>Edit your ad anytime</li>
            <li>Renew after expiration</li>
          </ul>
          <button disabled className="mt-4 w-full border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500">
            current free option
          </button>
        </div>

        <div className={`border p-4 ${selectedPaymentPlan === 'starter' ? 'border-[#00519b] bg-blue-50 ring-2 ring-blue-200' : 'border-[#00519b] bg-blue-50'}`}>
          <p className="text-sm font-semibold text-[#00519b]">Starter Plan</p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-900">$5</h3>
          <p className="mt-1 text-sm text-gray-600">Great for small businesses.</p>
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            <li>Publish up to 5 ads</li>
            <li>Ads remain active for 60 days</li>
            <li>Edit ads anytime</li>
            <li>Publish all 5 immediately or over time</li>
            <li>Valid until all 5 ads are used</li>
          </ul>
          <button
            type="button"
            onClick={() => handleUpgrade('starter')}
            className="mt-4 w-full border border-[#00519b] bg-[#00519b] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            pay $5
          </button>
        </div>

        <div className={`border bg-white p-4 ${selectedPaymentPlan === 'business' ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-900'}`}>
          <p className="text-sm font-semibold text-gray-900">Business Plan</p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-900">$10</h3>
          <p className="mt-1 text-sm text-gray-600">Best for businesses posting often.</p>
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            <li>Publish up to 15 ads</li>
            <li>Publish anytime during 30 days</li>
            <li>Every ad stays online for 60 days</li>
            <li>Edit ads anytime</li>
            <li>Dashboard with usage statistics</li>
          </ul>
          <button
            type="button"
            onClick={() => handleUpgrade('business')}
            className="mt-4 w-full border border-gray-900 bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            pay $10
          </button>
        </div>
      </div>

      {selectedPaymentPlan && (
        <PlanPaymentForm
          planId={selectedPaymentPlan}
          email={profile.email.trim().toLowerCase()}
          onCancel={() => setSelectedPaymentPlan(null)}
          onSuccess={refreshPlanAfterPayment}
        />
      )}

      <div className="border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        <p className="font-semibold text-gray-800">After payment</p>
        <p className="mt-1">Your card is processed by Stripe inside this page. The backend activates your plan after payment succeeds.</p>
      </div>
      {planMessage && <p className="text-xs text-[#cc0000]">{planMessage}</p>}
    </section>
  );

  const renderSettings = () => (
    <section className="border border-gray-300 bg-white p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Account settings</h2>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-gray-600 block mb-1">Email</span>
          <input
            value={profile.email}
            onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-gray-600 block mb-1">Phone</span>
          <input
            value={profile.phone}
            onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
            className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-gray-600 block mb-1">Posting password</span>
          <input
            type="password"
            value={profile.password}
            onChange={(event) => setProfile((prev) => ({ ...prev, password: event.target.value }))}
            className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </label>
        <button onClick={saveProfile} className="border border-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm">
          Save settings
        </button>
        {message && <p className="text-sm text-green-700">{message}</p>}
      </div>
    </section>
  );

  const renderMessages = () => (
    <section className="border border-gray-300 bg-white p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
      <div className="space-y-2">
        {myInquiries.map((item) => (
          <div key={item.id} className="border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">Reply for {item.listing_title}</p>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  from {item.sender_name || item.sender_email || item.sender_phone || 'buyer'} - {item.sender_email || item.sender_phone || 'no contact provided'}
                </p>
              </div>
              {item.status === 'new' && <span className="text-[11px] text-[#00519b] font-semibold">new</span>}
            </div>
            <p className="text-xs text-gray-500 mt-2">{new Date(item.created_at).toLocaleString()}</p>
          </div>
        ))}
        {messages.map((item) => (
          <div key={item.id} className="border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600 mt-1">{item.preview}</p>
              </div>
              {item.unread && <span className="text-[11px] text-[#00519b] font-semibold">new</span>}
            </div>
            <p className="text-xs text-gray-500 mt-2">{item.time}</p>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <button type="button" onClick={logoutToHome} className="text-2xl font-semibold text-gray-900 text-left hover:text-[#00519b] break-all">
            {dashboardTitle}
          </button>
          <p className="text-sm text-gray-600 mt-1">Manage your announcements, update your account details, and review your messages.</p>
        </div>
        <div className="flex items-start gap-3">
          <button onClick={logoutToHome} className="border border-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm">
            back to home
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="border border-gray-300 bg-white p-3 h-fit md:sticky md:top-4">
          <nav className="space-y-1">
            <button onClick={() => setActiveSection('announcements')} className={navButtonClass('announcements')}>
              My announcements
            </button>
            <button onClick={() => setActiveSection('plans')} className={navButtonClass('plans')}>
              Plans details
            </button>
            <button onClick={() => setActiveSection('settings')} className={navButtonClass('settings')}>
              Account settings
            </button>
            <button onClick={() => setActiveSection('messages')} className={navButtonClass('messages')}>
              Messages
            </button>
            <button onClick={logoutToHome} className="w-full text-left px-3 py-2 text-sm border border-transparent text-[#cc0000] hover:bg-red-50">
              Logout
            </button>
          </nav>
        </aside>

        <div className="space-y-4">
          {activeSection === 'announcements' && (
            <>
              {renderAccountSummary()}
              {renderAnnouncements()}
            </>
          )}
          {activeSection === 'plans' && renderPlans()}
          {activeSection === 'settings' && renderSettings()}
          {activeSection === 'messages' && renderMessages()}
        </div>
      </div>
    </div>
  );
}
