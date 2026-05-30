import { useState, useRef, useEffect } from 'react';
import { Share2, Check, MessageCircle, Link, X } from 'lucide-react';
import type { Offer } from '../types';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import toast from 'react-hot-toast';

interface Props { offer: Offer }

export default function ShareButton({ offer }: Props) {
  const { user } = useUserStore();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const url  = `${window.location.origin}/offer/${offer.id}`;
  const text = `${offer.discountPercent}% off at ${offer.businessName}! Check it out on AdsLife`;

  const track = (platform: string) => {
    if (user) api.post(endpoints.shareTrack, { offer_id: offer.id, user_id: user.id, platform }).catch(() => {});
  };

  const shareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    window.open(wa, '_blank');
    track('whatsapp');
    setOpen(false);
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied!');
    track('clipboard');
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  const nativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try { await navigator.share({ title: offer.title, text, url }); track('native'); } catch {}
    }
    setOpen(false);
  };

  const toggle = (e: React.MouseEvent) => { e.stopPropagation(); setOpen(v => !v); };

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={toggle}
        className="p-1.5 rounded-full text-gray-400 hover:text-primary hover:bg-primary/10 transition-all"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
      </button>

      {open && (
        <div className="absolute bottom-8 right-0 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 w-44 space-y-1">
          <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-100 mb-1">
            <span className="text-xs font-semibold text-gray-500">Share offer</span>
            <button onClick={e => { e.stopPropagation(); setOpen(false); }}><X size={12} className="text-gray-400" /></button>
          </div>
          <button
            onClick={shareWhatsApp}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-50 text-sm text-gray-700"
          >
            <MessageCircle size={15} className="text-green-500" /> WhatsApp
          </button>
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-gray-700"
          >
            <Link size={15} className="text-blue-500" /> Copy Link
          </button>
          {typeof navigator.share === 'function' && (
            <button
              onClick={nativeShare}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
            >
              <Share2 size={15} className="text-gray-400" /> More options
            </button>
          )}
        </div>
      )}
    </div>
  );
}
