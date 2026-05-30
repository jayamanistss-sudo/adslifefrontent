import { useState, useEffect } from 'react';

import { Users, Clock, ChevronRight } from 'lucide-react';
import type { GroupDeal } from '../types';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import toast from 'react-hot-toast';

interface Props { deal: GroupDeal; onJoined?: () => void }

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return timeLeft;
}

export default function GroupDealCard({ deal, onJoined }: Props) {
  const { user } = useUserStore();
  const timeLeft = useCountdown(deal.expiresAt);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!user || joining) return;
    setJoining(true);
    try {
      const res = await api.post(endpoints.groupDealJoin(deal.id), { user_id: user.id });
      if (res.data.success) {
        if (res.data.data.deal_activated) {
          toast.success('🎉 Deal activated! Enjoy your discount!', { duration: 4000 });
        } else {
          toast.success(`Joined! ${res.data.data.remaining} more needed`, { duration: 3000 });
        }
        onJoined?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="relative h-32 bg-gradient-to-br from-accent/20 to-primary/20">
        {deal.imageUrl && (
          <img src={deal.imageUrl} alt={deal.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-2 left-2 bg-danger text-white text-sm font-bold px-2.5 py-1 rounded-lg">
          {deal.discountPercent}% OFF
        </div>
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Clock size={10} /> {timeLeft}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-heading font-semibold text-gray-900 mb-1 line-clamp-1">{deal.title}</h3>
        <p className="text-xs text-gray-500 mb-3">{deal.businessName}</p>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span className="flex items-center gap-1"><Users size={11} /> {deal.currentParticipants} joined</span>
            <span>{deal.remaining} more needed</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all duration-500"
              style={{ width: `${deal.progressPercent ?? 0}%` }}
            />
          </div>
        </div>

        {/* Avatar stack */}
        {deal.participantsPreview && deal.participantsPreview.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex -space-x-2">
              {deal.participantsPreview.slice(0, 4).map((p) => (
                <div key={p.id} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center text-[9px] font-bold text-primary">
                  {p.name[0]}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400">{deal.currentParticipants} people joined</span>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining || deal.dealStatus === 'activated'}
          className={`w-full py-2.5 rounded-xl font-heading font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            deal.dealStatus === 'activated'
              ? 'bg-accent text-white cursor-default'
              : 'bg-primary text-white hover:bg-blue-600 active:scale-95'
          }`}
        >
          {deal.dealStatus === 'activated' ? '✓ Deal Active!' : joining ? 'Joining...' : (
            <><span>Join Group Deal</span><ChevronRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}
