type Props = {
  onNavigate: (page: 'home' | 'browse' | 'post' | 'listing' | 'user', params?: Record<string, string>) => void;
};

const Dot = () => <span className="text-gray-400 mx-1">&bull;</span>;

export default function Footer({ onNavigate }: Props) {
  return (
    <div className="border-t border-gray-300 mt-10 py-4 text-center text-xs text-gray-500">
      <div className="flex flex-wrap justify-center gap-x-1 gap-y-1 mb-2">
        <button onClick={() => onNavigate('home')} className="text-[#00519b] hover:underline">home</button>
        <Dot />
        <button onClick={() => onNavigate('post')} className="text-[#00519b] hover:underline">post an ad</button>
        <Dot />
        <button onClick={() => onNavigate('browse')} className="text-[#00519b] hover:underline">browse listings</button>
        <Dot />
        <button onClick={() => onNavigate('user')} className="text-[#00519b] hover:underline">my dashboard</button>
        <Dot />
        <span className="text-[#00519b] hover:underline cursor-pointer">help / faq</span>
        <Dot />
        <span className="text-[#00519b] hover:underline cursor-pointer">avoid scams &amp; fraud</span>
        <Dot />
        <span className="text-[#00519b] hover:underline cursor-pointer">personal safety tips</span>
        <Dot />
        <span className="text-[#00519b] hover:underline cursor-pointer">about digitalbizlist</span>
        <Dot />
        <span className="text-[#00519b] hover:underline cursor-pointer">legal</span>
      </div>
      <div className="flex flex-wrap justify-center gap-x-1 gap-y-1 mb-3 text-[11px]">
        {['asheville','atlanta','greensboro','raleigh','columbia','winston-salem','charleston','savannah'].map((c, i, arr) => (
          <span key={c} className="flex items-center gap-1">
            <span className="text-[#00519b] hover:underline cursor-pointer">{c}</span>
            {i < arr.length - 1 && <Dot />}
          </span>
        ))}
      </div>
      <p className="text-gray-400 text-[11px]">
        &copy; {new Date().getFullYear()} digitalbizlist &nbsp;&bull;&nbsp; privacy &nbsp;&bull;&nbsp; terms
      </p>
    </div>
  );
}
