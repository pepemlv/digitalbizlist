import { useEffect, useState } from 'react';
import { CityGroup, createListing, getCities, getListings, getPricingPlans, getUserPlan, pricingPlans, UserPlan, VehicleDetails } from '../lib/firebase';
import { categoryGroups } from '../data/categories';
import PlanPaymentForm from '../components/PlanPaymentForm';
import {
  availabilityOptions,
  bodyStyles,
  carMakes,
  carModelsByMake,
  cylinderOptions,
  driveTypes,
  fuelTypes,
  seatMaterials,
  sellerTypes,
  titleStatuses,
  transmissionTypes,
  vehicleConditions,
  vehicleFeatureGroups,
} from '../data/vehicle';

const USER_PROFILE_STORAGE_KEY = 'digitalbizlist-user-profile';
const USER_ACCOUNTS_STORAGE_KEY = 'digitalbizlist-user-accounts';

type StoredUserProfile = {
  email: string;
  phone: string;
  password: string;
};

type Page = 'home' | 'browse' | 'post' | 'listing';

type Props = {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
};

type Step = 'category' | 'details' | 'contact' | 'success';

type FormData = {
  category: string;
  subcategory: string;
  title: string;
  description: string;
  price: string;
  location: string;
  contact_email: string;
  contact_phone: string;
};

type VehicleFormData = {
  vin: string;
  make: string;
  model: string;
  trim: string;
  year: string;
  body_style: string;
  mileage: string;
  odometer: string;
  engine_size: string;
  cylinders: string;
  horsepower: string;
  fuel_type: string;
  transmission: string;
  drive_type: string;
  condition: string;
  title_status: string;
  exterior_color: string;
  doors: string;
  wheels: string;
  sunroof: boolean;
  tinted_windows: boolean;
  seat_material: string;
  seat_capacity: string;
  features: string[];
  seller_type: string;
  state: string;
  zip_code: string;
  gps_location: string;
  contact_methods: string[];
  availability: string;
};

const initialForm: FormData = {
  category: '', subcategory: '', title: '', description: '',
  price: '', location: '', contact_email: '', contact_phone: '',
};

const MAX_PHOTOS = 15;

const initialVehicleForm: VehicleFormData = {
  vin: '',
  make: '',
  model: '',
  trim: '',
  year: '',
  body_style: '',
  mileage: '',
  odometer: '',
  engine_size: '',
  cylinders: '',
  horsepower: '',
  fuel_type: '',
  transmission: '',
  drive_type: '',
  condition: '',
  title_status: '',
  exterior_color: '',
  doors: '',
  wheels: '',
  sunroof: false,
  tinted_windows: false,
  seat_material: '',
  seat_capacity: '',
  features: [],
  seller_type: '',
  state: '',
  zip_code: '',
  gps_location: '',
  contact_methods: [],
  availability: 'Available',
};

export default function PostAdPage({ onNavigate }: Props) {
  const [step, setStep] = useState<Step>('category');
  const [form, setForm] = useState<FormData>(initialForm);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormData>(initialVehicleForm);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newListingId, setNewListingId] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<'starter' | 'business' | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUserProfile | null>(null);
  const [discoveredAccount, setDiscoveredAccount] = useState<StoredUserProfile | null>(null);
  const [accountLookupLoading, setAccountLookupLoading] = useState(false);
  const [accountLookupPending, setAccountLookupPending] = useState(false);
  const [cityGroups, setCityGroups] = useState<CityGroup[]>([]);
  const [planSettings, setPlanSettings] = useState(pricingPlans);

  const selectedGroup = categoryGroups.find(g => g.id === form.category);
  const isVehicleListing = form.category === 'autos' && form.subcategory === 'cars + trucks';

  const update = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'contact_email') {
      setAccountPassword('');
      setConfirmPassword('');
    }
    setError('');
  };

  const updateVehicle = (field: keyof VehicleFormData, value: string | boolean | string[]) => {
    setVehicleForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const updateVehicleMake = (make: string) => {
    setVehicleForm(prev => ({ ...prev, make, model: '' }));
    setError('');
  };

  const toggleVehicleListValue = (field: 'features' | 'contact_methods', value: string) => {
    setVehicleForm(prev => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const getStoredAccounts = () => {
    const raw = window.localStorage.getItem(USER_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [] as Array<{ email: string; phone: string; password: string }>;

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as Array<{ email: string; phone: string; password: string }>;
    }
  };

  const saveStoredAccounts = (accounts: StoredUserProfile[]) => {
    window.localStorage.setItem(USER_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  };

  const upsertStoredAccount = (profile: StoredUserProfile) => {
    const accounts = getStoredAccounts();
    const existingIndex = accounts.findIndex((user) => user.email.toLowerCase() === profile.email.toLowerCase());
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...profile };
    } else {
      accounts.push(profile);
    }
    saveStoredAccounts(accounts);
  };

  const persistCurrentUser = (profile: { email: string; phone: string; password: string }) => {
    window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    upsertStoredAccount(profile);
    setCurrentUser(profile);
    window.dispatchEvent(new Event('user-profile-changed'));
  };

  const contactEmail = form.contact_email.trim().toLowerCase();
  const matchingAccount = contactEmail
    ? getStoredAccounts().find((user) => user.email.toLowerCase() === contactEmail)
      || (currentUser?.email.toLowerCase() === contactEmail ? currentUser : null)
      || (discoveredAccount?.email.toLowerCase() === contactEmail ? discoveredAccount : null)
    : null;
  const isLoggedInUser = Boolean(currentUser);
  const isNewContactEmail = Boolean(contactEmail && !accountLookupLoading && !matchingAccount && !isLoggedInUser);
  const isCheckingAccount = accountLookupPending || accountLookupLoading;
  const passwordMismatch = Boolean(
    !isLoggedInUser
      && matchingAccount
      && accountPassword.trim()
      && matchingAccount.password !== accountPassword.trim()
  );

  const getOwnerListings = async (email: string) => {
    const listings = await getListings({ approvedOnly: false, sortBy: 'newest' });
    return listings.filter((item) => {
      const listingEmail = (item.posted_by_email || item.contact_email || '').toLowerCase();
      return listingEmail === email;
    });
  };

  const getPlanBlockedMessage = (plan: UserPlan, ownerListings: Awaited<ReturnType<typeof getOwnerListings>>) => {
    const now = Date.now();
    const activeListings = ownerListings.filter((item) => item.is_active !== false && !item.is_sold);

    if (plan.plan_id === 'free') {
      const recentFreePost = ownerListings.find((item) => {
        const createdAt = new Date(item.created_at).getTime();
        return Number.isFinite(createdAt) && now - createdAt < 7 * 24 * 60 * 60 * 1000;
      });

      if (activeListings.length >= 1) {
        return 'Free plan allows 1 active ad at a time. Delete, hide, or upgrade before posting another ad.';
      }

      if (recentFreePost) {
        const nextDate = new Date(new Date(recentFreePost.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
        return `Free plan allows 1 ad every 7 days. Next free ad available ${nextDate.toLocaleString()}.`;
      }
    }

    if (plan.plan_id === 'starter' && plan.ads_used >= planSettings.starter.adLimit) {
      return `Starter Plan has used all ${planSettings.starter.adLimit} ads. Upgrade to Business or wait for a new purchase.`;
    }

    if (plan.plan_id === 'business') {
      const periodEnds = plan.period_ends_at ? new Date(plan.period_ends_at).getTime() : null;
      if (periodEnds && now > periodEnds) {
        return 'Business Plan publishing window has expired. Renew to publish more ads.';
      }

      if (plan.ads_used >= planSettings.business.adLimit) {
        return `Business Plan has used all ${planSettings.business.adLimit} ads. Renew to publish more ads.`;
      }
    }

    return '';
  };

  const handleUpgrade = async (planId: 'starter' | 'business') => {
    const email = form.contact_email.trim().toLowerCase() || currentUser?.email.trim().toLowerCase() || '';
    if (!email) {
      setError('Enter your email first so Stripe can connect the plan to your account.');
      return;
    }

    setError('');
    setSelectedPaymentPlan(planId);
  };

  useEffect(() => {
    const rawProfile = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!rawProfile) {
      setCurrentUser(null);
      return;
    }

    try {
      const parsedProfile = JSON.parse(rawProfile) as StoredUserProfile;
      setCurrentUser(parsedProfile);
      setForm((prev) => ({
        ...prev,
        contact_email: parsedProfile.email || prev.contact_email,
        contact_phone: parsedProfile.phone || prev.contact_phone,
      }));
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPricingPlans = async () => {
      try {
        const plans = await getPricingPlans();
        if (!cancelled) setPlanSettings(plans);
      } catch {
        if (!cancelled) setPlanSettings(pricingPlans);
      }
    };

    void loadPricingPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const email = form.contact_email.trim().toLowerCase();
    if (!email) {
      setDiscoveredAccount(null);
      setAccountLookupLoading(false);
      setAccountLookupPending(false);
      return;
    }

    const localAccount = getStoredAccounts().find((user) => user.email.toLowerCase() === email);
    if (localAccount || currentUser?.email.toLowerCase() === email) {
      setDiscoveredAccount(null);
      setAccountLookupLoading(false);
      setAccountLookupPending(false);
      return;
    }

    let cancelled = false;
    setAccountLookupPending(true);
    setAccountLookupLoading(false);
    setDiscoveredAccount(null);

    const findExistingPostingAccount = async () => {
      setAccountLookupPending(false);
      setAccountLookupLoading(true);
      const listings = await getListings({ approvedOnly: false, sortBy: 'newest' });
      if (cancelled) return;

      const matchingListing = listings.find((item) => {
        const listingEmail = (item.posted_by_email || item.contact_email || '').toLowerCase();
        return listingEmail === email && Boolean(item.posting_password);
      });

      setDiscoveredAccount(matchingListing ? {
        email,
        phone: matchingListing.posted_by_phone || matchingListing.contact_phone || '',
        password: matchingListing.posting_password || '',
      } : null);
      setAccountLookupLoading(false);
    };

    const lookupTimer = window.setTimeout(() => {
      void findExistingPostingAccount();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(lookupTimer);
    };
  }, [form.contact_email, currentUser]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const groups = await getCities();
        setCityGroups(groups);
      } catch {
        setCityGroups([]);
      }
    };

    loadCities();
  }, []);

  const handleCategoryNext = () => {
    if (!form.category) { setError('Please select a category.'); return; }
    setStep('details');
  };

  const handleDetailsNext = () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    if (!form.price.trim()) { setError('Price is required. Enter 0 if the item is free.'); return; }
    if (Number(form.price) < 0) { setError('Price cannot be negative.'); return; }
    if (!form.location.trim()) { setError('Please select a city.'); return; }
    if (isVehicleListing) {
      if (!vehicleForm.make.trim()) { setError('Please select a make.'); return; }
      if (!vehicleForm.model.trim()) { setError('Please enter a model.'); return; }
      if (!vehicleForm.year.trim()) { setError('Please enter a year.'); return; }
      if (!vehicleForm.mileage.trim()) { setError('Please enter mileage.'); return; }
      if (!vehicleForm.title_status.trim()) { setError('Please select a title status.'); return; }
    }
    setStep('contact');
  };

  const toNumberOrNull = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const readPhotoFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const handlePhotoUpload = async (slotIndex: number, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload image files only.');
      return;
    }

    try {
      const photo = await readPhotoFile(file);
      setUploadedPhotos((prev) => {
        const next = [...prev];
        next[slotIndex] = photo;
        return next.filter(Boolean).slice(0, MAX_PHOTOS);
      });
      setError('');
    } catch {
      setError('Could not read that photo. Try another image.');
    }
  };

  const removePhoto = (slotIndex: number) => {
    setUploadedPhotos((prev) => prev.filter((_, index) => index !== slotIndex));
  };

  const getVehicleDetails = (): VehicleDetails | null => {
    if (!isVehicleListing) return null;

    return {
      vin: vehicleForm.vin.trim() || null,
      make: vehicleForm.make || null,
      model: vehicleForm.model.trim() || null,
      trim: vehicleForm.trim.trim() || null,
      year: toNumberOrNull(vehicleForm.year),
      body_style: vehicleForm.body_style || null,
      mileage: toNumberOrNull(vehicleForm.mileage),
      odometer: toNumberOrNull(vehicleForm.odometer),
      engine_size: vehicleForm.engine_size.trim() || null,
      cylinders: vehicleForm.cylinders || null,
      horsepower: toNumberOrNull(vehicleForm.horsepower),
      fuel_type: vehicleForm.fuel_type || null,
      transmission: vehicleForm.transmission || null,
      drive_type: vehicleForm.drive_type || null,
      condition: vehicleForm.condition || null,
      title_status: vehicleForm.title_status || null,
      exterior_color: vehicleForm.exterior_color.trim() || null,
      doors: toNumberOrNull(vehicleForm.doors),
      wheels: vehicleForm.wheels.trim() || null,
      sunroof: vehicleForm.sunroof,
      tinted_windows: vehicleForm.tinted_windows,
      seat_material: vehicleForm.seat_material || null,
      seat_capacity: toNumberOrNull(vehicleForm.seat_capacity),
      features: vehicleForm.features,
      seller_type: vehicleForm.seller_type || null,
      city: form.location.trim(),
      state: vehicleForm.state.trim() || null,
      zip_code: vehicleForm.zip_code.trim() || null,
      gps_location: vehicleForm.gps_location.trim() || null,
      contact_methods: vehicleForm.contact_methods,
      availability: vehicleForm.availability || 'Available',
    };
  };

  const handleSubmit = async () => {
    const email = form.contact_email.trim().toLowerCase();
    const inputPhone = form.contact_phone.trim();

    if (!email) {
      setError('Please enter your email address for the account and reply contact.');
      return;
    }

    if (isCheckingAccount) {
      setError('Checking account. Please wait a moment.');
      return;
    }

    const password = isLoggedInUser ? currentUser?.password || '' : accountPassword.trim();
    const confirmationPassword = confirmPassword.trim();
    const accounts = getStoredAccounts();
    const existingAccount = accounts.find((user) => user.email.toLowerCase() === email)
      || (currentUser?.email.toLowerCase() === email ? currentUser : null)
      || (discoveredAccount?.email.toLowerCase() === email ? discoveredAccount : null);

    if (isLoggedInUser) {
      if (!currentUser?.password) {
        setError('This account does not have a saved password.');
        return;
      }
    } else if (existingAccount) {
      if (!password) {
        setError('Please enter your password to continue.');
        return;
      }

      if (existingAccount.password !== password) {
        setError('Password incorrect.');
        return;
      }
    } else {
      if (!inputPhone) {
        setError('This email does not exist. Create account to post.');
        return;
      }

      if (!password || !confirmationPassword) {
        setError('Please create a password and confirm it.');
        return;
      }

      if (password !== confirmationPassword) {
        setError('Your password and confirmation do not match.');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const [plan, ownerListings] = await Promise.all([
        getUserPlan(email),
        getOwnerListings(email),
      ]);
      const blockedMessage = getPlanBlockedMessage(plan, ownerListings);
      if (blockedMessage) {
        setError(`${blockedMessage} Use Starter (${planSettings.starter.priceLabel}) or Business (${planSettings.business.priceLabel}) to post more.`);
        return;
      }

      if (!existingAccount && !isLoggedInUser) {
        upsertStoredAccount({ email, phone: inputPhone, password });
      } else if (existingAccount) {
        upsertStoredAccount({
          email,
          phone: existingAccount.phone || inputPhone,
          password: existingAccount.password,
        });
      }

      const accountPhone = isLoggedInUser
        ? currentUser?.phone || inputPhone
        : existingAccount?.phone || inputPhone;

      persistCurrentUser({ email, phone: accountPhone, password });

      const { id } = await createListing({
        category: form.category,
        subcategory: form.subcategory || null,
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.price ? parseFloat(form.price) : null,
        location: form.location.trim(),
        contact_email: email || null,
        contact_phone: accountPhone || null,
        images: uploadedPhotos,
        vehicle_details: getVehicleDetails(),
        is_paid: plan.plan_id !== 'free',
        payment_plan_id: plan.plan_id,
        posted_by_email: email || null,
        posted_by_phone: accountPhone || null,
        posting_password: password || null,
      });
      setNewListingId(id);
      setStep('success');
    } catch {
      setError('Failed to post. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "border border-gray-400 px-2 py-1.5 text-sm w-full focus:outline-none focus:border-blue-500";
  const labelClass = "block text-xs font-semibold text-gray-700 mb-1";
  const btnPrimary = "border border-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-1.5 text-sm transition";
  const btnLink = "text-[#00519b] hover:underline text-sm";

  const steps: Step[] = ['category', 'details', 'contact'];
  const stepIdx = steps.indexOf(step);
  const modelOptions = vehicleForm.make ? carModelsByMake[vehicleForm.make] ?? [] : [];

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Ad Posted Successfully</h2>
        <p className="text-sm text-gray-600 mb-4">Your listing is now live.</p>
        <div className="space-y-2">
          <div>
            <button onClick={() => onNavigate('listing', { id: newListingId })} className={btnLink}>
              view your listing &rarr;
            </button>
          </div>
          <div>
            <button onClick={() => { setForm(initialForm); setVehicleForm(initialVehicleForm); setUploadedPhotos([]); setStep('category'); setAccountPassword(''); setConfirmPassword(''); }} className={btnLink}>
              post another ad
            </button>
          </div>
          <div>
            <button onClick={() => onNavigate('home')} className={btnLink}>
              back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-1">Post an Ad</h1>

      {!isLoggedInUser && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          {steps.map((s, i) => (
            <span key={s} className={`flex items-center gap-2 ${i <= stepIdx ? 'text-gray-800' : 'text-gray-400'}`}>
              {i > 0 && <span className="text-gray-300">&rsaquo;</span>}
              <span className={i === stepIdx ? 'font-semibold underline' : ''}>
                {i + 1}. {s}
              </span>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-[#cc0000] text-xs mb-3">{error}</p>}

      {/* Step 1: Category */}
      {step === 'category' && (
        <div>
          <p className="text-xs text-gray-600 mb-3">Choose a category for your listing:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mb-4">
            {categoryGroups.map(g => (
              <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                <input
                  type="radio"
                  name="category"
                  value={g.id}
                  checked={form.category === g.id}
                  onChange={() => { update('category', g.id); update('subcategory', ''); }}
                  className="cursor-pointer"
                />
                <span>{g.emoji} {g.label.toLowerCase()}</span>
              </label>
            ))}
          </div>

          {selectedGroup && (
            <div className="mb-4">
              <label className={labelClass}>subcategory (optional)</label>
              <select
                value={form.subcategory}
                onChange={e => update('subcategory', e.target.value)}
                className={inputClass}
              >
                <option value="">-- select subcategory --</option>
                {selectedGroup.subcategories.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleCategoryNext} className={btnPrimary}>continue &rarr;</button>
            <button onClick={() => onNavigate('home')} className="text-[#00519b] hover:underline text-sm">cancel</button>
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 'details' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>posting title <span className="text-[#cc0000]">*</span></label>
            <input
              type="text"
              placeholder="e.g. 2019 Honda Civic - Excellent Condition"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>description <span className="text-[#cc0000]">*</span></label>
            <textarea
              placeholder="Describe your listing..."
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={6}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>asking price <span className="text-[#cc0000]">*</span></label>
              <div className="flex items-center">
                <span className="border border-r-0 border-gray-400 px-2 py-1.5 text-sm bg-gray-50 text-gray-500">$</span>
                <input
                  type="number"
                  placeholder="0 = free"
                  value={form.price}
                  onChange={e => update('price', e.target.value)}
                  min="0"
                  required
                  className="border border-gray-400 px-2 py-1.5 text-sm flex-1 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>city <span className="text-[#cc0000]">*</span></label>
              <select
                value={form.location}
                onChange={e => update('location', e.target.value)}
                className={inputClass}
              >
                <option value="">-- select a city --</option>
                {cityGroups.map((group) => (
                  <optgroup key={group.id} label={group.state}>
                    {group.cities.map((city) => (
                      <option key={`${group.id}-${city}`} value={city}>{city}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>photos</label>
              <span className="text-[11px] text-gray-500">{uploadedPhotos.length}/{MAX_PHOTOS}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
                const photo = uploadedPhotos[index];
                return (
                  <div key={index} className="border border-gray-300 bg-white aspect-square relative overflow-hidden">
                    {photo ? (
                      <>
                        <img src={photo} alt={`uploaded ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex bg-white/90 text-[11px]">
                          <label className="flex-1 text-center py-1 text-[#00519b] hover:underline cursor-pointer">
                            replace
                            <input
                              type="file"
                              accept="image/*"
                              onChange={event => handlePhotoUpload(index, event.target.files)}
                              className="hidden"
                            />
                          </label>
                          <button type="button" onClick={() => removePhoto(index)} className="flex-1 py-1 text-[#cc0000] hover:underline">
                            remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer items-center justify-center text-xs text-[#00519b] hover:bg-gray-50">
                        upload photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={event => handlePhotoUpload(index, event.target.files)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {isVehicleListing && (
            <div className="space-y-4 border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-800">Vehicle details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>make <span className="text-[#cc0000]">*</span></label>
                  <select value={vehicleForm.make} onChange={e => updateVehicleMake(e.target.value)} className={inputClass}>
                    <option value="">-- select make --</option>
                    {carMakes.map((make) => <option key={make} value={make}>{make}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>model <span className="text-[#cc0000]">*</span></label>
                  <select
                    value={vehicleForm.model}
                    onChange={e => updateVehicle('model', e.target.value)}
                    disabled={!vehicleForm.make}
                    className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-400`}
                  >
                    <option value="">{vehicleForm.make ? '-- select model --' : '-- select make first --'}</option>
                    {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>title status <span className="text-[#cc0000]">*</span></label>
                  <select value={vehicleForm.title_status} onChange={e => updateVehicle('title_status', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {titleStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>year <span className="text-[#cc0000]">*</span></label>
                  <input type="number" min="1900" max="2100" value={vehicleForm.year} onChange={e => updateVehicle('year', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>body style</label>
                  <select value={vehicleForm.body_style} onChange={e => updateVehicle('body_style', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {bodyStyles.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>mileage <span className="text-[#cc0000]">*</span></label>
                  <input type="number" min="0" value={vehicleForm.mileage} onChange={e => updateVehicle('mileage', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>odometer</label>
                  <input type="number" min="0" value={vehicleForm.odometer} onChange={e => updateVehicle('odometer', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>VIN</label>
                  <input value={vehicleForm.vin} onChange={e => updateVehicle('vin', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>engine size</label>
                  <input placeholder="2.4L" value={vehicleForm.engine_size} onChange={e => updateVehicle('engine_size', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>cylinders</label>
                  <select value={vehicleForm.cylinders} onChange={e => updateVehicle('cylinders', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {cylinderOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>horsepower</label>
                  <input type="number" min="0" value={vehicleForm.horsepower} onChange={e => updateVehicle('horsepower', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>fuel</label>
                  <select value={vehicleForm.fuel_type} onChange={e => updateVehicle('fuel_type', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {fuelTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>transmission</label>
                  <select value={vehicleForm.transmission} onChange={e => updateVehicle('transmission', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {transmissionTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>drive type</label>
                  <select value={vehicleForm.drive_type} onChange={e => updateVehicle('drive_type', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {driveTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>condition</label>
                  <select value={vehicleForm.condition} onChange={e => updateVehicle('condition', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {vehicleConditions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>trim</label>
                  <input value={vehicleForm.trim} onChange={e => updateVehicle('trim', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>color</label>
                  <input value={vehicleForm.exterior_color} onChange={e => updateVehicle('exterior_color', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>doors</label>
                  <input type="number" min="1" value={vehicleForm.doors} onChange={e => updateVehicle('doors', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>wheels</label>
                  <input value={vehicleForm.wheels} onChange={e => updateVehicle('wheels', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>seat capacity</label>
                  <input type="number" min="1" value={vehicleForm.seat_capacity} onChange={e => updateVehicle('seat_capacity', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>seat material</label>
                  <select value={vehicleForm.seat_material} onChange={e => updateVehicle('seat_material', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {seatMaterials.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>seller type</label>
                  <select value={vehicleForm.seller_type} onChange={e => updateVehicle('seller_type', e.target.value)} className={inputClass}>
                    <option value="">-- select --</option>
                    {sellerTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={vehicleForm.sunroof} onChange={e => updateVehicle('sunroof', e.target.checked)} />
                  Sunroof
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={vehicleForm.tinted_windows} onChange={e => updateVehicle('tinted_windows', e.target.checked)} />
                  Tinted windows
                </label>
              </div>

              <div className="space-y-3">
                <p className={labelClass}>features</p>
                {vehicleFeatureGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{group.label}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {group.features.map((feature) => (
                        <label key={feature} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={vehicleForm.features.includes(feature)}
                            onChange={() => toggleVehicleListValue('features', feature)}
                          />
                          {feature}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>state</label>
                  <input value={vehicleForm.state} onChange={e => updateVehicle('state', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>ZIP code</label>
                  <input value={vehicleForm.zip_code} onChange={e => updateVehicle('zip_code', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>GPS location</label>
                  <input value={vehicleForm.gps_location} onChange={e => updateVehicle('gps_location', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>availability</label>
                  <select value={vehicleForm.availability} onChange={e => updateVehicle('availability', e.target.value)} className={inputClass}>
                    {availabilityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={handleDetailsNext} className={btnPrimary}>continue &rarr;</button>
            <button onClick={() => setStep('category')} className="text-[#00519b] hover:underline text-sm">&larr; back</button>
          </div>
        </div>
      )}

      {/* Step 3: Contact */}
      {step === 'contact' && (
        <div className="space-y-3">
          {!isLoggedInUser && (
            <div className="text-xs text-gray-500 border border-gray-200 bg-gray-50 p-2 mb-3">
              <strong>summary:</strong> {form.title} &bull;{' '}
              <span className="capitalize">{selectedGroup?.label.toLowerCase()}{form.subcategory ? ` / ${form.subcategory}` : ''}</span>{' '}
              &bull; {form.location}
              {form.price && ` &bull; $${parseFloat(form.price).toLocaleString()}`}
            </div>
          )}

          <div>
            <label className={labelClass}>reply-to email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={form.contact_email}
              onChange={e => update('contact_email', e.target.value)}
              className={inputClass}
            />
          </div>
          {isVehicleListing && (
            <div>
              <p className={labelClass}>contact options</p>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {['Phone', 'Text', 'Chat', 'Email'].map((method) => (
                  <label key={method} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={vehicleForm.contact_methods.includes(method)}
                      onChange={() => toggleVehicleListValue('contact_methods', method)}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
          )}
          {!isLoggedInUser && form.contact_email.trim() && (
            <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3">
              {isCheckingAccount ? (
                <p className="text-[11px] text-gray-500">Checking email...</p>
              ) : matchingAccount ? (
                <>
                  <p className="text-[11px] text-gray-500">This email already has an account. Enter its password to continue.</p>
                  <div>
                    <label className={labelClass}>password</label>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={e => {
                        setAccountPassword(e.target.value);
                        setError('');
                      }}
                      className={inputClass}
                    />
                    {passwordMismatch && <p className="mt-1 text-xs text-[#cc0000]">Password incorrect.</p>}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-gray-500">This email does not exist. Create account to post.</p>
                  <div>
                    <label className={labelClass}>phone number</label>
                    <input
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={form.contact_phone}
                      onChange={e => update('contact_phone', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>password</label>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={e => setAccountPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>confirm password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <p className="text-[11px] text-gray-400">Your email is used for replies. Phone is collected only when creating a new account.</p>
          <div className="space-y-2 border border-blue-200 bg-blue-50 p-3 text-sm">
            <p className="font-semibold text-gray-800">DigitalBizList Pricing</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="border border-gray-200 bg-white p-2">
                <p className="font-semibold text-gray-900">Free</p>
                <p className="text-xs text-gray-600">1 active ad, 1 post every 7 days.</p>
                <p className="mt-1 text-xs text-gray-500">Ad stays online 60 days.</p>
              </div>
              <div className="border border-gray-200 bg-white p-2">
                <p className="font-semibold text-gray-900">Starter - {planSettings.starter.priceLabel}</p>
                <p className="text-xs text-gray-600">Publish up to {planSettings.starter.adLimit} ads.</p>
                <button
                  type="button"
                  onClick={() => handleUpgrade('starter')}
                  className="mt-2 border border-[#00519b] bg-blue-50 px-2 py-1 text-xs font-semibold text-[#00519b] hover:bg-blue-100 disabled:opacity-50"
                >
                  buy {planSettings.starter.adLimit} ads
                </button>
              </div>
              <div className="border border-gray-200 bg-white p-2">
                <p className="font-semibold text-gray-900">Business - {planSettings.business.priceLabel}</p>
                <p className="text-xs text-gray-600">Publish up to {planSettings.business.adLimit} ads in {planSettings.business.publishWindowDays ?? 30} days.</p>
                <button
                  type="button"
                  onClick={() => handleUpgrade('business')}
                  className="mt-2 border border-[#00519b] bg-blue-50 px-2 py-1 text-xs font-semibold text-[#00519b] hover:bg-blue-100 disabled:opacity-50"
                >
                  buy {planSettings.business.adLimit} ads
                </button>
              </div>
            </div>
          </div>
          {selectedPaymentPlan && (
            <PlanPaymentForm
              planId={selectedPaymentPlan}
              plan={planSettings[selectedPaymentPlan]}
              email={(form.contact_email.trim().toLowerCase() || currentUser?.email.trim().toLowerCase() || '')}
              onCancel={() => setSelectedPaymentPlan(null)}
              onSuccess={() => {
                setSelectedPaymentPlan(null);
                setError('Payment complete. Your plan is active. You can publish your listing now.');
              }}
            />
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={handleSubmit} disabled={submitting || isCheckingAccount} className={`${btnPrimary} disabled:opacity-50`}>
              {submitting ? 'posting...' : isCheckingAccount ? 'checking account' : isNewContactEmail ? 'create account and post' : 'publish listing'}
            </button>
            <button onClick={() => setStep('details')} className="text-[#00519b] hover:underline text-sm">&larr; back</button>
          </div>
        </div>
      )}
    </div>
  );
}
