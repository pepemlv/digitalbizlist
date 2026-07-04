import { useEffect, useState } from 'react';
import { createListingInquiry, createListingReport, getListingById, getListings, Listing } from '../lib/firebase';
import { categoryGroups } from '../data/categories';

type Page = 'home' | 'browse' | 'post' | 'listing';

type Props = {
  listingId: string;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
};

export default function ListingPage({ listingId, onNavigate }: Props) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [replyForm, setReplyForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [reportForm, setReportForm] = useState({ email: '', phone: '', reason: 'scam', message: '' });
  const [replyStatus, setReplyStatus] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [related, setRelated] = useState<Listing[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setSelectedImageIndex(0);
      const listingData = await getListingById(listingId);
      setListing(listingData);
      if (listingData) {
        const relatedListings = await getListings({
          category: listingData.category,
          excludeId: listingId,
          limit: 6,
          sortBy: 'newest',
        });
        setRelated(relatedListings);
      }
      setLoading(false);
    };
    fetch();
  }, [listingId]);

  if (loading) return <div className="w-full max-w-2xl md:max-w-[90vw] mx-auto px-4 py-8 text-sm text-gray-500">loading...</div>;

  if (!listing) {
    return (
      <div className="w-full max-w-2xl md:max-w-[90vw] mx-auto px-4 py-8">
        <p className="text-sm text-gray-600 mb-2">Listing not found or has been removed.</p>
        <button onClick={() => onNavigate('browse')} className="text-[#00519b] hover:underline text-sm">browse listings</button>
      </div>
    );
  }

  const group = categoryGroups.find(g => g.id === listing.category);
  const vehicle = listing.vehicle_details;
  const visibleEmail = listing.show_contact_email !== false ? listing.contact_email : null;
  const visiblePhone = listing.show_contact_phone !== false ? listing.contact_phone : null;
  const updateReply = (field: keyof typeof replyForm, value: string) => {
    setReplyForm((prev) => ({ ...prev, [field]: value }));
    setReplyStatus('');
  };
  const updateReport = (field: keyof typeof reportForm, value: string) => {
    setReportForm((prev) => ({ ...prev, [field]: value }));
    setReportStatus('');
  };

  const handleReplySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!replyForm.email.trim() && !replyForm.phone.trim()) {
      setReplyStatus('Please enter your email or phone.');
      return;
    }
    if (!replyForm.message.trim()) {
      setReplyStatus('Please enter a message.');
      return;
    }

    setSubmittingReply(true);
    try {
      await createListingInquiry({
        listing_id: listing.id,
        listing_title: listing.title,
        recipient_email: listing.contact_email,
        sender_name: replyForm.name.trim() || null,
        sender_email: replyForm.email.trim() || null,
        sender_phone: replyForm.phone.trim() || null,
        message: replyForm.message.trim(),
      });
      setReplyForm({ name: '', email: '', phone: '', message: '' });
      setReplyStatus('Message sent to the announcer.');
      setContactRevealed(true);
    } catch {
      setReplyStatus('Could not send your message. Try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportForm.message.trim()) {
      setReportStatus('Please describe the issue.');
      return;
    }

    setSubmittingReport(true);
    try {
      await createListingReport({
        listing_id: listing.id,
        listing_title: listing.title,
        listing_location: listing.location,
        reporter_email: reportForm.email.trim() || null,
        reporter_phone: reportForm.phone.trim() || null,
        reason: reportForm.reason,
        message: reportForm.message.trim(),
      });
      setReportForm({ email: '', phone: '', reason: 'scam', message: '' });
      setReportStatus('Report sent to admin.');
    } catch {
      setReportStatus('Could not send the report. Try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const postedDate = new Date(listing.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const listingImages = listing.images?.slice(0, 15) ?? [];
  const selectedImage = listingImages[selectedImageIndex] ?? listingImages[0];

  return (
    <div className="w-full max-w-2xl md:max-w-[90vw] mx-auto px-4 py-4">
      {/* Breadcrumb */}
      <div className="text-xs mb-3 flex items-center gap-1 flex-wrap text-gray-500">
        <button onClick={() => onNavigate('home')} className="text-[#00519b] hover:underline">home</button>
        <span>&gt;</span>
        <button onClick={() => onNavigate('browse', { category: listing.category })} className="text-[#00519b] hover:underline capitalize">
          {group?.label.toLowerCase() || listing.category}
        </button>
        {listing.subcategory && (
          <>
            <span>&gt;</span>
            <button
              onClick={() => onNavigate('browse', { category: listing.category, subcategory: listing.subcategory || '' })}
              className="text-[#00519b] hover:underline"
            >
              {listing.subcategory}
            </button>
          </>
        )}
      </div>

      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-lg font-semibold text-gray-900 leading-snug">{listing.title}</h1>
        {listing.is_sold && (
          <span className="border border-[#cc0000] bg-red-50 px-2 py-0.5 text-xs font-semibold text-[#cc0000]">
            SOLD
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="text-xs text-gray-500 mb-4 flex flex-wrap gap-x-4 gap-y-0.5">
        <span>posted: {postedDate}</span>
        <span>location: {listing.location}</span>
        {listing.price != null && (
          <span className="font-semibold text-gray-800">
            price: {listing.price === 0 ? 'free' : `$${listing.price.toLocaleString()}`}
          </span>
        )}
        <span>ad id: {listing.id.slice(0, 8)}</span>
      </div>

      {/* HR */}
      <hr className="border-gray-300 mb-4" />

      {listingImages.length > 0 && (
        <div className="mb-4 space-y-2">
          <img src={selectedImage} alt={listing.title} className="w-full aspect-video object-cover border border-gray-200 bg-gray-100" />
          {listingImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {listingImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`border bg-gray-100 ${selectedImageIndex === index ? 'border-[#00519b] ring-2 ring-blue-100' : 'border-gray-200'}`}
                >
                  <img src={image} alt={`${listing.title} ${index + 1}`} className="w-full aspect-square object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed mb-6">
        {listing.description}
      </div>

      {vehicle && (
        <div className="mb-6 border border-gray-200 bg-gray-50 p-3 text-sm">
          <p className="text-xs font-semibold text-gray-600 mb-2">vehicle details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {vehicle.year && <p><span className="text-gray-500">year:</span> {vehicle.year}</p>}
            {vehicle.make && <p><span className="text-gray-500">make:</span> {vehicle.make}</p>}
            {vehicle.model && <p><span className="text-gray-500">model:</span> {vehicle.model}</p>}
            {vehicle.trim && <p><span className="text-gray-500">trim:</span> {vehicle.trim}</p>}
            {vehicle.body_style && <p><span className="text-gray-500">body:</span> {vehicle.body_style}</p>}
            {vehicle.mileage != null && <p><span className="text-gray-500">mileage:</span> {vehicle.mileage.toLocaleString()}</p>}
            {vehicle.odometer != null && <p><span className="text-gray-500">odometer:</span> {vehicle.odometer.toLocaleString()}</p>}
            {vehicle.engine_size && <p><span className="text-gray-500">engine:</span> {vehicle.engine_size}</p>}
            {vehicle.cylinders && <p><span className="text-gray-500">cylinders:</span> {vehicle.cylinders}</p>}
            {vehicle.horsepower != null && <p><span className="text-gray-500">horsepower:</span> {vehicle.horsepower}</p>}
            {vehicle.fuel_type && <p><span className="text-gray-500">fuel:</span> {vehicle.fuel_type}</p>}
            {vehicle.transmission && <p><span className="text-gray-500">transmission:</span> {vehicle.transmission}</p>}
            {vehicle.drive_type && <p><span className="text-gray-500">drive:</span> {vehicle.drive_type}</p>}
            {vehicle.condition && <p><span className="text-gray-500">condition:</span> {vehicle.condition}</p>}
            {vehicle.title_status && <p><span className="text-gray-500">title:</span> {vehicle.title_status}</p>}
            {vehicle.exterior_color && <p><span className="text-gray-500">color:</span> {vehicle.exterior_color}</p>}
            {vehicle.doors != null && <p><span className="text-gray-500">doors:</span> {vehicle.doors}</p>}
            {vehicle.wheels && <p><span className="text-gray-500">wheels:</span> {vehicle.wheels}</p>}
            {vehicle.seat_material && <p><span className="text-gray-500">seats:</span> {vehicle.seat_material}</p>}
            {vehicle.seat_capacity != null && <p><span className="text-gray-500">capacity:</span> {vehicle.seat_capacity}</p>}
            {vehicle.seller_type && <p><span className="text-gray-500">seller:</span> {vehicle.seller_type}</p>}
            {vehicle.availability && <p><span className="text-gray-500">availability:</span> {vehicle.availability}</p>}
            {vehicle.vin && <p><span className="text-gray-500">VIN:</span> {vehicle.vin}</p>}
            {vehicle.zip_code && <p><span className="text-gray-500">ZIP:</span> {vehicle.zip_code}</p>}
          </div>
          {(vehicle.sunroof || vehicle.tinted_windows || (vehicle.features && vehicle.features.length > 0)) && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">features</p>
              <p className="text-gray-700">
                {[vehicle.sunroof ? 'Sunroof' : '', vehicle.tinted_windows ? 'Tinted Windows' : '', ...(vehicle.features ?? [])].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
          {vehicle.contact_methods && vehicle.contact_methods.length > 0 && (
            <p className="mt-3"><span className="text-gray-500">contact by:</span> {vehicle.contact_methods.join(', ')}</p>
          )}
        </div>
      )}

      <hr className="border-gray-300 mb-4" />

      {/* Contact */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-600 mb-2">reply to this announcement</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReplyOpen((value) => !value)}
            className="border border-[#00519b] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 text-sm font-semibold text-[#00519b] transition"
          >
            reply
          </button>
          <button
            onClick={() => setContactRevealed((value) => !value)}
            className="border border-gray-400 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm transition"
          >
            {contactRevealed ? 'hide email / phone' : 'show email / phone'}
          </button>
        </div>

        {replyOpen && (
          <form onSubmit={handleReplySubmit} className="mt-3 space-y-3 border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">name</span>
                <input value={replyForm.name} onChange={(event) => updateReply('name', event.target.value)} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">email <span className="text-[#cc0000]">*</span></span>
                <input type="email" placeholder="email or phone required" value={replyForm.email} onChange={(event) => updateReply('email', event.target.value)} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">phone <span className="text-[#cc0000]">*</span></span>
                <input placeholder="email or phone required" value={replyForm.phone} onChange={(event) => updateReply('phone', event.target.value)} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500" />
              </label>
            </div>
            <p className="text-xs text-gray-500">Enter at least one contact: email or phone.</p>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">message</span>
              <textarea value={replyForm.message} onChange={(event) => updateReply('message', event.target.value)} rows={4} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500" />
            </label>
            <button type="submit" disabled={submittingReply} className="border border-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 disabled:opacity-50">
              {submittingReply ? 'sending...' : 'send message'}
            </button>
            {replyStatus && <p className="text-xs text-gray-600">{replyStatus}</p>}
          </form>
        )}

        {contactRevealed && (
          <div className="mt-3 text-sm space-y-1">
            {visibleEmail && (
              <div>
                <span className="text-gray-500 text-xs">email: </span>
                <a href={`mailto:${visibleEmail}`} className="text-[#00519b] hover:underline">
                  {visibleEmail}
                </a>
              </div>
            )}
            {visiblePhone && (
              <div>
                <span className="text-gray-500 text-xs">phone: </span>
                <a href={`tel:${visiblePhone}`} className="text-[#00519b] hover:underline">
                  {visiblePhone}
                </a>
              </div>
            )}
            {!visibleEmail && !visiblePhone && (
              <p className="text-gray-500 text-xs">no contact info provided</p>
            )}
          </div>
        )}
      </div>

      <div className="mb-3 border border-green-200 bg-green-50 p-3 text-xs text-green-900">
        <strong>DigitalBizList escrow assistance:</strong> buyers and sellers can request our escrow service to reduce wasted time for sellers and help buyers avoid losing money. Payment can be held for 5 days while the transaction is completed.
      </div>

      {/* Safety */}
      <div className="text-[11px] text-gray-500 border border-gray-200 p-2 mb-6 bg-gray-50">
        <strong>safety tip:</strong> meet in a public place &bull; never wire money to strangers &bull;{' '}
        <span className="text-[#00519b] hover:underline cursor-pointer">read more safety tips</span>
      </div>

      <div className="mb-6 border border-red-200 bg-red-50 p-3">
        <button onClick={() => setReportOpen((value) => !value)} className="text-sm font-semibold text-[#cc0000] hover:underline">
          report or flag scam
        </button>
        {reportOpen && (
          <form onSubmit={handleReportSubmit} className="mt-3 space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">reason</span>
                <select value={reportForm.reason} onChange={(event) => updateReport('reason', event.target.value)} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500">
                  <option value="scam">scam</option>
                  <option value="spam">spam</option>
                  <option value="prohibited">prohibited</option>
                  <option value="wrong category">wrong category</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">email</span>
                <input type="email" value={reportForm.email} onChange={(event) => updateReport('email', event.target.value)} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">phone</span>
                <input value={reportForm.phone} onChange={(event) => updateReport('phone', event.target.value)} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">message to admin</span>
              <textarea value={reportForm.message} onChange={(event) => updateReport('message', event.target.value)} rows={3} className="w-full border border-gray-400 px-2 py-1.5 focus:outline-none focus:border-blue-500" />
            </label>
            <button type="submit" disabled={submittingReport} className="border border-red-600 bg-white hover:bg-red-100 px-3 py-1.5 text-[#cc0000] disabled:opacity-50">
              {submittingReport ? 'sending...' : 'send report to admin'}
            </button>
            {reportStatus && <p className="text-xs text-gray-600">{reportStatus}</p>}
          </form>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 text-xs mb-6">
        <button onClick={() => onNavigate('browse', { category: listing.category })} className="text-[#00519b] hover:underline">
          &larr; back to {group?.label.toLowerCase() || 'listings'}
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-[#00519b] hover:underline cursor-pointer">print</span>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <>
          <hr className="border-gray-300 mb-3" />
          <p className="text-xs font-semibold text-gray-600 mb-2">
            more in {group?.label.toLowerCase() || listing.category}:
          </p>
          <ul className="space-y-0.5">
            {related.map(rel => (
              <li key={rel.id} className="text-xs">
                <button
                  onClick={() => onNavigate('listing', { id: rel.id })}
                  className="text-[#00519b] hover:underline text-left"
                >
                  {rel.title}
                </button>
                {rel.price != null && (
                  <span className="text-gray-500 ml-1">
                    ({rel.price === 0 ? 'free' : `$${rel.price.toLocaleString()}`})
                  </span>
                )}
                <span className="text-gray-400 ml-1">({rel.location})</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
