import { useRef, useEffect, useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

const RADIUS_OPTIONS = [
  { value: 0,    label: 'All areas' },
  { value: 0.5,  label: 'Within 0.5 km' },
  { value: 1,    label: 'Within 1 km' },
  { value: 5,    label: 'Within 5 km' },
  { value: 10,   label: 'Within 10 km' },
  { value: 25,   label: 'Within 25 km' },
];

interface Props {
  readonly radius: number;
  readonly onChange: (r: number) => void;
}

export default function NearbyDropdown({ radius, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = RADIUS_OPTIONS.find((o) => o.value === radius) ?? RADIUS_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`filter-tab ${radius > 0 ? 'active' : ''}`}
      >
        <MapPin size={13} className={radius > 0 ? 'text-white' : 'text-primary'} />
        {selected.label}
        <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 w-52 py-2 animate-fade-in">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pb-1.5 pt-1">
            Filter by distance
          </p>
          {RADIUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface transition-colors group"
            >
              <input
                type="radio"
                name="nearby-radius"
                value={opt.value}
                checked={radius === opt.value}
                onChange={() => { onChange(opt.value); setOpen(false); }}
                className="accent-primary w-4 h-4 cursor-pointer"
              />
              <span className={`text-sm ${radius === opt.value ? 'font-semibold text-primary' : 'text-gray-700 group-hover:text-gray-900'}`}>
                {opt.label}
              </span>
              {radius === opt.value && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
