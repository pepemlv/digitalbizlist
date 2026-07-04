import { useEffect, useRef, useState, useCallback, type TouchEvent } from 'react';
import { Search, MapPin } from 'lucide-react';
import { CityGroup, getCities, getListings, Listing } from '../lib/firebase';
import { categoryGroups } from '../data/categories';
import {
  allVehicleFeatures,
  bodyStyles,
  carMakes,
  carModelsByMake,
  driveTypes,
  fuelTypes,
  sellerTypes,
  titleStatuses,
  transmissionTypes,
  vehicleConditions,
} from '../data/vehicle';

type Page = 'home' | 'browse' | 'post' | 'listing';

type Props = {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  initialCategory?: string;
  initialSubcategory?: string;
  initialSearch?: string;
  initialCity?: string;
};

const LEAFLET_SCRIPT_ID = 'leaflet-js';
const LEAFLET_STYLE_ID = 'leaflet-css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LISTINGS_PER_PAGE = 50;

declare global {
  interface Window {
    L?: any;
  }
}

export default function BrowsePage({ onNavigate, initialCategory, initialSubcategory, initialSearch, initialCity }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '');
  const [selectedSub, setSelectedSub] = useState(initialSubcategory || '');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedCity, setSelectedCity] = useState(initialCity || '');
  const [cityGroups, setCityGroups] = useState<CityGroup[]>([]);
  const [inputQuery, setInputQuery] = useState(initialSearch || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [minMileage, setMinMileage] = useState('');
  const [maxMileage, setMaxMileage] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [driveType, setDriveType] = useState('');
  const [bodyStyle, setBodyStyle] = useState('');
  const [titleStatus, setTitleStatus] = useState('');
  const [color, setColor] = useState('');
  const [distance, setDistance] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState('');
  const [locatingUser, setLocatingUser] = useState(false);
  const [sellerType, setSellerType] = useState('');
  const [condition, setCondition] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [selectedImageByListing, setSelectedImageByListing] = useState<Record<string, string>>({});
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showMapSearch, setShowMapSearch] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const touchStartByListing = useRef<Record<string, { x: number; y: number }>>({});
  const swipedListings = useRef<Set<string>>(new Set());
  const leafletMapElementRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);
  const leafletCircleRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [leafletError, setLeafletError] = useState('');
  const isVehicleSearch = selectedCategory === 'autos';
  const modelOptions = make ? carModelsByMake[make] ?? [] : [];

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const listings = await getListings({
      category: selectedCategory || undefined,
      subcategory: selectedSub || undefined,
      search: searchQuery,
      city: selectedCity || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minYear: isVehicleSearch && minYear ? parseInt(minYear, 10) : undefined,
      maxYear: isVehicleSearch && maxYear ? parseInt(maxYear, 10) : undefined,
      make: isVehicleSearch ? make || undefined : undefined,
      model: isVehicleSearch ? model || undefined : undefined,
      minMileage: isVehicleSearch && minMileage ? parseInt(minMileage, 10) : undefined,
      maxMileage: isVehicleSearch && maxMileage ? parseInt(maxMileage, 10) : undefined,
      fuelType: isVehicleSearch ? fuelType || undefined : undefined,
      transmission: isVehicleSearch ? transmission || undefined : undefined,
      driveType: isVehicleSearch ? driveType || undefined : undefined,
      bodyStyle: isVehicleSearch ? bodyStyle || undefined : undefined,
      titleStatus: isVehicleSearch ? titleStatus || undefined : undefined,
      color: isVehicleSearch ? color || undefined : undefined,
      sellerType: isVehicleSearch ? sellerType || undefined : undefined,
      condition: isVehicleSearch ? condition || undefined : undefined,
      features: isVehicleSearch ? features : [],
      sortBy,
      limit: 100,
    });
    const distanceMiles = distance ? Number(distance) : null;
    const mapFilteredListings = distanceMiles && mapCenter
      ? listings.filter((item) => {
        const point = parseGpsLocation(item.vehicle_details?.gps_location || '');
        return point ? getDistanceMiles(mapCenter, point) <= distanceMiles : false;
      })
      : listings;
    setListings(mapFilteredListings);
    setCurrentPage(1);
    setLoading(false);
  }, [selectedCategory, selectedSub, searchQuery, selectedCity, minPrice, maxPrice, minYear, maxYear, make, model, minMileage, maxMileage, fuelType, transmission, driveType, bodyStyle, titleStatus, color, sellerType, condition, features, sortBy, distance, mapCenter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

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

  const currentGroup = categoryGroups.find(g => g.id === selectedCategory);
  const hasActiveFilters = Boolean(selectedCategory || selectedSub || searchQuery || selectedCity || minPrice || maxPrice || minYear || maxYear || make || model || minMileage || maxMileage || fuelType || transmission || driveType || bodyStyle || titleStatus || color || distance || sellerType || condition || features.length > 0);
  const totalPages = Math.max(1, Math.ceil(listings.length / LISTINGS_PER_PAGE));
  const visibleListings = listings.slice((currentPage - 1) * LISTINGS_PER_PAGE, currentPage * LISTINGS_PER_PAGE);
  const changePage = (nextPage: number) => {
    const boundedPage = Math.max(1, Math.min(totalPages, nextPage));
    if (boundedPage === currentPage) return;
    setCurrentPage(boundedPage);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSub('');
    setSearchQuery('');
    setInputQuery('');
    setSelectedCity('');
    setMinPrice('');
    setMaxPrice('');
    setMinYear('');
    setMaxYear('');
    setMake('');
    setModel('');
    setMinMileage('');
    setMaxMileage('');
    setFuelType('');
    setTransmission('');
    setDriveType('');
    setBodyStyle('');
    setTitleStatus('');
    setColor('');
    setDistance('');
    setMapCenter(null);
    setMapError('');
    setShowMapSearch(false);
    setSellerType('');
    setCondition('');
    setFeatures([]);
  };

  const handleSearch = () => setSearchQuery(inputQuery);
  const toggleFeature = (feature: string) => {
    setFeatures((prev) => prev.includes(feature) ? prev.filter((item) => item !== feature) : [...prev, feature]);
  };
  const handleMakeChange = (value: string) => {
    setMake(value);
    setModel('');
  };

  const parseGpsLocation = (value: string) => {
    const [latValue, lngValue] = value.split(',').map((part) => Number(part.trim()));
    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) return null;
    return { lat: latValue, lng: lngValue };
  };

  const getDistanceMiles = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusMiles = 3958.8;
    const latDistance = toRadians(to.lat - from.lat);
    const lngDistance = toRadians(to.lng - from.lng);
    const a = Math.sin(latDistance / 2) ** 2
      + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(lngDistance / 2) ** 2;
    return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (!showMapSearch) return;
    if (window.L) {
      setLeafletReady(true);
      return;
    }

    if (!document.getElementById(LEAFLET_STYLE_ID)) {
      const style = document.createElement('link');
      style.id = LEAFLET_STYLE_ID;
      style.rel = 'stylesheet';
      style.href = LEAFLET_CSS_URL;
      document.head.appendChild(style);
    }

    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => setLeafletReady(true), { once: true });
      existingScript.addEventListener('error', () => setLeafletError('Could not load OpenStreetMap Leaflet.'), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = LEAFLET_SCRIPT_ID;
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => setLeafletReady(true);
    script.onerror = () => setLeafletError('Could not load OpenStreetMap Leaflet.');
    document.head.appendChild(script);
  }, [showMapSearch]);

  useEffect(() => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.remove();
    leafletMapRef.current = null;
    leafletMarkersRef.current = [];
    leafletCircleRef.current = null;
  }, [isDesktopViewport, showMapSearch]);

  useEffect(() => {
    if (!showMapSearch || !leafletReady || !window.L || !leafletMapElementRef.current) return;

    const defaultCenter = { lat: 39.8283, lng: -98.5795 };
    const activeCenter = mapCenter ?? defaultCenter;
    const center: [number, number] = [activeCenter.lat, activeCenter.lng];
    if (!leafletMapRef.current) {
      leafletMapRef.current = window.L.map(leafletMapElementRef.current, {
        center,
        zoom: mapCenter ? 11 : 4,
      });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMapRef.current);
    } else {
      leafletMapRef.current.setView(center, leafletMapRef.current.getZoom() || 11);
    }

    window.setTimeout(() => leafletMapRef.current?.invalidateSize(), 0);
    leafletMarkersRef.current.forEach((marker) => marker.remove());
    leafletMarkersRef.current = [];
    leafletCircleRef.current?.remove();

    const bounds = window.L.latLngBounds([center]);
    const radiusMeters = Number(distance || 25) * 1609.344;
    leafletCircleRef.current = window.L.circle(center, {
      radius: radiusMeters,
      fillColor: '#00519b',
      fillOpacity: 0.12,
      color: '#00519b',
      weight: 2,
    }).addTo(leafletMapRef.current);

    if (mapCenter) {
      const centerMarker = window.L.circleMarker(center, {
        radius: 8,
        fillColor: '#00519b',
        fillOpacity: 1,
        color: '#ffffff',
        weight: 2,
      }).bindPopup('Your location').addTo(leafletMapRef.current);
      leafletMarkersRef.current.push(centerMarker);
    }

    listings.forEach((item) => {
      const point = parseGpsLocation(item.vehicle_details?.gps_location || '');
      if (!point) return;

      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = item.title;
      const location = document.createElement('p');
      location.textContent = item.location;
      popup.append(title, location);
      const marker = window.L.marker([point.lat, point.lng])
        .bindPopup(popup)
        .addTo(leafletMapRef.current);
      marker.on('click', () => onNavigate('listing', { id: item.id }));
      leafletMarkersRef.current.push(marker);
      bounds.extend([point.lat, point.lng]);
    });

    if (mapCenter) {
      leafletMapRef.current.fitBounds(leafletCircleRef.current.getBounds(), { padding: [24, 24] });
    } else if (leafletMarkersRef.current.length > 0) {
      leafletMapRef.current.fitBounds(bounds, { padding: [24, 24] });
    } else {
      leafletMapRef.current.fitBounds(leafletCircleRef.current.getBounds(), { padding: [24, 24] });
    }
  }, [showMapSearch, leafletReady, mapCenter, distance, listings, onNavigate]);

  const getMapPinPosition = (point: { lat: number; lng: number }, radiusMiles: number) => {
    if (!mapCenter) return null;
    const latMiles = (point.lat - mapCenter.lat) * 69;
    const lngMiles = (point.lng - mapCenter.lng) * 69 * Math.cos((mapCenter.lat * Math.PI) / 180);
    const x = 50 + (lngMiles / radiusMiles) * 38;
    const y = 50 - (latMiles / radiusMiles) * 38;

    if (x < 5 || x > 95 || y < 5 || y > 95) return null;
    return { x, y };
  };

  const findUserLocation = (openMapOnSuccess = false) => {
    setMapError('');
    if (!navigator.geolocation) {
      setMapError('Map filtering is not available in this browser.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        if (openMapOnSuccess) {
          setShowMapSearch(true);
        }
        setLocatingUser(false);
      },
      () => {
        setMapError('Could not access your location. Allow location permission and try again.');
        setLocatingUser(false);
      },
    );
  };

  const useMyLocation = () => findUserLocation(false);

  const handleMapSearchToggle = () => {
    if (showMapSearch) {
      setShowMapSearch(false);
      return;
    }

    findUserLocation(true);
  };

  const handlePhotoTouchStart = (listingId: string, event: TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartByListing.current[listingId] = { x: touch.clientX, y: touch.clientY };
    swipedListings.current.delete(listingId);
  };

  const handlePhotoTouchEnd = (
    listingId: string,
    event: TouchEvent<HTMLButtonElement>,
    images: string[],
    currentImageIndex: number,
  ) => {
    const start = touchStartByListing.current[listingId];
    const touch = event.changedTouches[0];
    delete touchStartByListing.current[listingId];

    if (!start || !touch || images.length < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY);
    if (!isHorizontalSwipe) return;

    const nextIndex = deltaX < 0
      ? (currentImageIndex + 1) % images.length
      : (currentImageIndex - 1 + images.length) % images.length;

    swipedListings.current.add(listingId);
    setSelectedImageByListing((prev) => ({ ...prev, [listingId]: images[nextIndex] }));
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSub('');
    if (value !== 'autos') {
      setMinYear('');
      setMaxYear('');
      setMake('');
      setModel('');
      setMinMileage('');
      setMaxMileage('');
      setFuelType('');
      setTransmission('');
      setDriveType('');
      setBodyStyle('');
      setTitleStatus('');
      setColor('');
      setDistance('');
      setMapCenter(null);
      setMapError('');
      setSellerType('');
      setCondition('');
      setFeatures([]);
    }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  const formatPrice = (price: number | null) => {
    if (price == null) return 'price not listed';
    return price === 0 ? 'free' : `$${price.toLocaleString()}`;
  };

  const fieldClass = 'border border-gray-400 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-full';

  const renderCategoryFilters = () => (
    <div className="border border-gray-200 bg-white p-3 text-xs space-y-3">
      <p className="font-semibold text-gray-700 border-b border-gray-300 pb-1">categories</p>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
        <label className="flex items-center gap-2 text-gray-700">
          <input
            type="radio"
            name="category-filter"
            checked={!selectedCategory}
            onChange={() => handleCategoryChange('')}
          />
          all categories
        </label>
        {categoryGroups.map((group) => (
          <label key={group.id} className="flex items-center gap-2 text-gray-700">
            <input
              type="radio"
              name="category-filter"
              checked={selectedCategory === group.id}
              onChange={() => handleCategoryChange(group.id)}
            />
            <span>{group.emoji} {group.label.toLowerCase()}</span>
          </label>
        ))}
      </div>

      {currentGroup && (
        <div className="border-t border-gray-200 pt-3">
          <p className="font-semibold text-gray-700 mb-2">{currentGroup.label.toLowerCase()} details</p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="radio"
                name="subcategory-filter"
                checked={!selectedSub}
                onChange={() => setSelectedSub('')}
              />
              all {currentGroup.label.toLowerCase()}
            </label>
            {currentGroup.subcategories.map((subcategory) => (
              <label key={subcategory} className="flex items-center gap-2 text-gray-700">
                <input
                  type="radio"
                  name="subcategory-filter"
                  checked={selectedSub === subcategory}
                  onChange={() => setSelectedSub(subcategory)}
                />
                {subcategory}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderAutoFilters = (compact = false) => (
    <div className="border border-gray-200 bg-white p-3 text-xs space-y-3">
      <p className="font-semibold text-gray-700 border-b border-gray-300 pb-1">autos filters</p>
      <div className={`grid gap-2 ${compact ? 'sm:grid-cols-2 lg:grid-cols-4' : ''}`}>
        <select value={make} onChange={e => handleMakeChange(e.target.value)} className={fieldClass}>
          <option value="">all makes</option>
          {carMakes.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          disabled={!make}
          className={`${fieldClass} disabled:bg-gray-100 disabled:text-gray-400`}
        >
          <option value="">{make ? 'all models' : 'select make first'}</option>
          {modelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input type="number" placeholder="year min" value={minYear} onChange={e => setMinYear(e.target.value)} className={fieldClass} />
        <input type="number" placeholder="year max" value={maxYear} onChange={e => setMaxYear(e.target.value)} className={fieldClass} />
        <input placeholder="color" value={color} onChange={e => setColor(e.target.value)} className={fieldClass} />
        <input type="number" placeholder="mileage min" value={minMileage} onChange={e => setMinMileage(e.target.value)} className={fieldClass} />
        <input type="number" placeholder="mileage max" value={maxMileage} onChange={e => setMaxMileage(e.target.value)} className={fieldClass} />
        <select value={distance} onChange={e => setDistance(e.target.value)} className={fieldClass}>
          <option value="">any distance</option>
          <option value="5">within 5 miles</option>
          <option value="10">within 10 miles</option>
          <option value="25">within 25 miles</option>
          <option value="50">within 50 miles</option>
          <option value="100">within 100 miles</option>
        </select>
        <button
          type="button"
          onClick={useMyLocation}
          className="border border-[#00519b] bg-blue-50 px-2 py-1.5 text-xs font-semibold text-[#00519b] hover:bg-blue-100"
        >
          use my location
        </button>
        <select value={fuelType} onChange={e => setFuelType(e.target.value)} className={fieldClass}>
          <option value="">all fuel types</option>
          {fuelTypes.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={transmission} onChange={e => setTransmission(e.target.value)} className={fieldClass}>
          <option value="">all transmissions</option>
          {transmissionTypes.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={driveType} onChange={e => setDriveType(e.target.value)} className={fieldClass}>
          <option value="">all drive types</option>
          {driveTypes.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={bodyStyle} onChange={e => setBodyStyle(e.target.value)} className={fieldClass}>
          <option value="">all body styles</option>
          {bodyStyles.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={titleStatus} onChange={e => setTitleStatus(e.target.value)} className={fieldClass}>
          <option value="">all title statuses</option>
          {titleStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={sellerType} onChange={e => setSellerType(e.target.value)} className={fieldClass}>
          <option value="">owner or dealer</option>
          {sellerTypes.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={condition} onChange={e => setCondition(e.target.value)} className={fieldClass}>
          <option value="">all conditions</option>
          {vehicleConditions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <div className={`grid gap-1 ${compact ? 'sm:grid-cols-2 lg:grid-cols-4' : ''}`}>
        {allVehicleFeatures.map((feature) => (
          <label key={feature} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={features.includes(feature)}
              onChange={() => toggleFeature(feature)}
            />
            {feature}
          </label>
        ))}
      </div>
      {(mapCenter || mapError) && (
        <p className="text-xs text-gray-500">
          {mapCenter ? 'Map filtering is using your current location.' : mapError}
        </p>
      )}
    </div>
  );

  const renderMapSearch = () => (
    <div className="border border-blue-200 bg-blue-50 p-3 text-xs space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-blue-200 pb-2">
        <p className="font-semibold text-gray-800">map search</p>
        <button onClick={() => setShowMapSearch(false)} className="text-[#00519b] hover:underline">
          hide map
        </button>
      </div>
      {leafletError ? (
        <div className="relative h-48 overflow-hidden border border-blue-200 bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#dbeafe_1px,transparent_1px),linear-gradient(#dbeafe_1px,transparent_1px)] bg-[length:44px_44px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50" />
          {mapCenter && distance && (
            <div className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#00519b] bg-blue-100/30" />
          )}
          {mapCenter && listings.map((item) => {
            const point = parseGpsLocation(item.vehicle_details?.gps_location || '');
            const radiusMiles = Number(distance || 25);
            const position = point ? getMapPinPosition(point, radiusMiles) : null;
            if (!position) return null;

            return (
              <button
                key={`map-${item.id}`}
                type="button"
                onClick={() => onNavigate('listing', { id: item.id })}
                className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-[#cc0000] text-white shadow"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                title={item.title}
                aria-label={`Open ${item.title}`}
              >
                <MapPin size={14} />
              </button>
            );
          })}
          <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#00519b] text-white shadow">
            <MapPin size={16} />
          </div>
          <p className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-[11px] text-gray-600 shadow-sm">
            {mapCenter
              ? `${distance || 'any'} mile radius center: ${mapCenter.lat.toFixed(3)}, ${mapCenter.lng.toFixed(3)}`
            : 'choose your location to show radius map'}
          </p>
        </div>
      ) : (
        <div className="relative h-64 overflow-hidden border border-blue-200 bg-white">
          <div ref={leafletMapElementRef} className="h-full w-full" />
          {!mapCenter && (
            <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-[11px] text-gray-600 shadow-sm">
              Choose your location to show OpenStreetMap radius search.
            </div>
          )}
          {!leafletReady && (
            <p className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-[11px] text-gray-600 shadow-sm">
              loading OpenStreetMap...
            </p>
          )}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select value={distance} onChange={e => setDistance(e.target.value)} className={fieldClass}>
          <option value="">select distance</option>
          <option value="5">within 5 miles</option>
          <option value="10">within 10 miles</option>
          <option value="25">within 25 miles</option>
          <option value="50">within 50 miles</option>
          <option value="100">within 100 miles</option>
        </select>
        <button
          type="button"
          onClick={useMyLocation}
          className="border border-[#00519b] bg-white px-3 py-1.5 text-xs font-semibold text-[#00519b] hover:bg-blue-100"
        >
          use my location
        </button>
      </div>
      <p className="text-[11px] text-gray-600">
        OpenStreetMap Leaflet radius search uses listing GPS coordinates.
      </p>
      {(mapCenter || mapError) && (
        <p className="text-xs text-gray-600">
          {mapCenter ? 'Map filtering is active.' : mapError || leafletError}
        </p>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto px-2 py-4 sm:px-4 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="text-xs mb-3 flex items-center gap-1 flex-wrap">
        <button onClick={() => onNavigate('home')} className="text-[#00519b] hover:underline">home</button>
        <span className="text-gray-400">&gt;</span>
        {selectedCategory ? (
          <>
            <button onClick={() => { setSelectedSub(''); }} className="text-[#00519b] hover:underline capitalize">
              {currentGroup?.label.toLowerCase() || selectedCategory}
            </button>
            {selectedSub && (
              <>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-600">{selectedSub}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-gray-600">all listings</span>
        )}
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap md:hidden">
        <input
          type="text"
          placeholder="search listings..."
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="border border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-500 w-64"
        />
        <button onClick={handleSearch} className="border border-gray-400 bg-gray-100 hover:bg-gray-200 px-3 py-1 text-xs transition flex items-center gap-1">
          <Search size={12} /> search
        </button>
        <span className="text-gray-400 text-xs">|</span>
        <select
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
          className="border border-gray-400 px-1 py-1 text-xs focus:outline-none"
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
        <div className="flex flex-nowrap items-center gap-1">
          <span className="text-gray-400 text-xs">|</span>
          <label className="text-xs text-gray-600">price:</label>
          <input
            type="number"
            placeholder="min"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            className="border border-gray-400 px-2 py-1 text-xs w-16 focus:outline-none focus:border-blue-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="number"
            placeholder="max"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            className="border border-gray-400 px-2 py-1 text-xs w-16 focus:outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-gray-400 text-xs">|</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="border border-gray-400 px-1 py-1 text-xs focus:outline-none"
        >
          <option value="newest">newest</option>
          <option value="oldest">oldest</option>
          <option value="price_asc">price: low</option>
          <option value="price_desc">price: high</option>
        </select>
        <button
          onClick={handleMapSearchToggle}
          disabled={locatingUser}
          className="border border-[#00519b] bg-white hover:bg-blue-50 px-3 py-1 text-xs font-semibold text-[#00519b] inline-flex items-center gap-1 disabled:cursor-wait disabled:opacity-60"
        >
          <MapPin size={12} /> {locatingUser ? 'finding location...' : 'search using map'}
        </button>
        <button onClick={() => setShowMoreFilters((value) => !value)} className="border border-[#00519b] bg-blue-50 hover:bg-blue-100 px-3 py-1 text-xs font-semibold text-[#00519b]">
          {showMoreFilters ? 'hide filter' : 'show more filter'}
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[#cc0000] hover:underline text-xs">clear filters</button>
        )}
      </div>

      {showMapSearch && !isDesktopViewport && (
        <div className="mb-4">
          {renderMapSearch()}
        </div>
      )}

      {showMoreFilters && (
        <div className="mb-4 space-y-3 md:hidden">
          {renderCategoryFilters()}
          {isVehicleSearch && renderAutoFilters(true)}
        </div>
      )}

      <div className="flex gap-6 xl:gap-8">
        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 hidden md:block space-y-4 xl:w-72">
          <div className="border border-gray-200 bg-white p-3 text-xs space-y-3">
            <p className="font-semibold text-gray-700 border-b border-gray-300 pb-1">search</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="search listings..."
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="border border-gray-400 px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full"
              />
              <button onClick={handleSearch} className="border border-gray-400 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs transition flex items-center justify-center gap-1 w-full">
                <Search size={12} /> search
              </button>
              <button
                onClick={handleMapSearchToggle}
                disabled={locatingUser}
                className="border border-[#00519b] bg-white hover:bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#00519b] transition flex items-center justify-center gap-1 w-full disabled:cursor-wait disabled:opacity-60"
              >
                <MapPin size={12} /> {locatingUser ? 'finding location...' : 'search using map'}
              </button>
            </div>
            {showMapSearch && isDesktopViewport && renderMapSearch()}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">city</label>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="border border-gray-400 px-2 py-1.5 text-xs focus:outline-none w-full"
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
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">price</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="border border-gray-400 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="border border-gray-400 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">sort</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="border border-gray-400 px-2 py-1.5 text-xs focus:outline-none w-full"
              >
                <option value="newest">newest</option>
                <option value="oldest">oldest</option>
                <option value="price_asc">price: low</option>
                <option value="price_desc">price: high</option>
              </select>
            </div>
            <button onClick={() => setShowMoreFilters((value) => !value)} className="border border-[#00519b] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 text-xs font-semibold text-[#00519b] transition w-full">
              {showMoreFilters ? 'hide filter' : 'show more filter'}
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[#cc0000] hover:underline text-xs">clear filters</button>
            )}
          </div>

          {showMoreFilters && renderCategoryFilters()}
          {showMoreFilters && isVehicleSearch && renderAutoFilters()}
        </div>

        {/* Listings */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-2">
            {loading ? 'loading...' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} - page ${currentPage} of ${totalPages}`}
            {(selectedCategory || searchQuery || selectedCity) && (
              <span>
                {selectedCategory && ` in ${currentGroup?.label.toLowerCase() || selectedCategory}`}
                {searchQuery && ` matching "${searchQuery}"`}
                {selectedCity && ` in ${selectedCity}`}
              </span>
            )}
          </p>

          {loading ? (
            <p className="text-xs text-gray-400">loading listings...</p>
          ) : listings.length === 0 ? (
            <div className="text-sm text-gray-500 py-4">
              <p>No listings found.</p>
              <button onClick={clearFilters} className="text-[#00519b] hover:underline text-xs mt-1">clear filters</button>
            </div>
          ) : (
            <>
            {totalPages > 1 && (
              <div className="mb-3 flex items-center justify-between border border-gray-200 bg-white px-3 py-2 text-xs">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-[#00519b] hover:underline disabled:text-gray-300 disabled:no-underline"
                >
                  previous
                </button>
                <span className="text-gray-500">
                  showing {(currentPage - 1) * LISTINGS_PER_PAGE + 1}-{Math.min(currentPage * LISTINGS_PER_PAGE, listings.length)}
                </span>
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-[#00519b] hover:underline disabled:text-gray-300 disabled:no-underline"
                >
                  next
                </button>
              </div>
            )}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleListings.map(listing => {
                const images = listing.images?.filter(Boolean) ?? [];
                const mainImage = selectedImageByListing[listing.id] || images[0];
                const currentImageIndex = Math.max(0, images.findIndex((image) => image === mainImage));
                const showImageAt = (index: number) => {
                  if (images.length === 0) return;
                  const nextIndex = (index + images.length) % images.length;
                  setSelectedImageByListing((prev) => ({ ...prev, [listing.id]: images[nextIndex] }));
                };
                const vehicleSummary = listing.vehicle_details
                  ? [
                    listing.vehicle_details.year,
                    listing.vehicle_details.make,
                    listing.vehicle_details.model,
                    listing.vehicle_details.mileage != null ? `${listing.vehicle_details.mileage.toLocaleString()} mi` : '',
                  ].filter(Boolean).join(' ')
                  : '';

                return (
                  <li key={listing.id} className="mx-auto flex w-[90vw] flex-col border border-gray-300 bg-white sm:mx-0 sm:h-[28rem] sm:w-full sm:min-w-0">
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (swipedListings.current.has(listing.id)) {
                            swipedListings.current.delete(listing.id);
                            return;
                          }
                          onNavigate('listing', { id: listing.id });
                        }}
                        onTouchStart={(event) => handlePhotoTouchStart(listing.id, event)}
                        onTouchEnd={(event) => handlePhotoTouchEnd(listing.id, event, images, currentImageIndex)}
                        className="block aspect-[4/3] w-full bg-gray-100 text-left"
                        aria-label={`Open ${listing.title}`}
                      >
                        {mainImage ? (
                          <img src={mainImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                            no image
                          </span>
                        )}
                      </button>
                      <div className="absolute inset-x-0 top-0 bg-black/60 px-3 py-2 pr-24">
                        <button
                          onClick={() => onNavigate('listing', { id: listing.id })}
                          className="block w-full truncate text-left text-sm font-semibold text-white hover:underline"
                        >
                          {listing.title}
                        </button>
                      </div>
                      <div className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow">
                        {formatPrice(listing.price)}
                      </div>
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => showImageAt(currentImageIndex - 1)}
                            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-[#00519b] shadow hover:bg-white"
                            aria-label={`Previous photo for ${listing.title}`}
                          >
                            &lsaquo;
                          </button>
                          <button
                            type="button"
                            onClick={() => showImageAt(currentImageIndex + 1)}
                            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-[#00519b] shadow hover:bg-white"
                            aria-label={`Next photo for ${listing.title}`}
                          >
                            &rsaquo;
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col space-y-2 p-3 text-xs">
                      <div className="h-10 overflow-hidden">
                        {images.length > 1 && (
                        <div className="flex gap-1 overflow-x-auto pb-1">
                          {images.slice(0, 15).map((image, index) => (
                            <button
                              key={`${listing.id}-${index}`}
                              type="button"
                              onClick={() => setSelectedImageByListing((prev) => ({ ...prev, [listing.id]: image }))}
                              className={`h-10 w-12 flex-shrink-0 overflow-hidden border bg-gray-100 ${
                                mainImage === image ? 'border-[#00519b]' : 'border-gray-300'
                              }`}
                              aria-label={`Show image ${index + 1} for ${listing.title}`}
                            >
                              <img src={image} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                        )}
                      </div>

                      <p className="line-clamp-2 min-h-[2rem] text-gray-700">{listing.description || 'No details provided.'}</p>
                      <div className="mt-auto flex min-h-[2.5rem] flex-wrap items-center gap-x-2 gap-y-1 text-gray-500">
                        <span>{formatDate(listing.created_at)}</span>
                        {listing.is_sold && <span className="font-semibold text-[#cc0000]">sold</span>}
                        <span className="flex items-center gap-0.5">
                          <MapPin size={10} />{listing.location}
                        </span>
                        {vehicleSummary && <span>{vehicleSummary}</span>}
                        <span>({listing.subcategory || listing.category})</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border border-gray-200 bg-white px-3 py-2 text-xs">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-[#00519b] hover:underline disabled:text-gray-300 disabled:no-underline"
                >
                  previous
                </button>
                <span className="text-gray-500">page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-[#00519b] hover:underline disabled:text-gray-300 disabled:no-underline"
                >
                  next
                </button>
              </div>
            )}
            </>
          )}

          <div className="mt-4 pt-3 border-t border-gray-200">
            <button onClick={() => onNavigate('post')} className="text-[#00519b] hover:underline text-xs">
              + post an ad in this category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
