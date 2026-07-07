import { useEffect, useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { api, endpoints } from '../utils/api';

/** Resolve the logged-in user's vendor id via REST. */
export function useVendorId(): number {
  const { user } = useUserStore();
  const [restId, setRestId] = useState(0);

  useEffect(() => {
    if (!user || restId > 0) return;
    api.get(endpoints.vendorProfile).then((r) => {
      const id = r.data?.data?.id;
      if (id) setRestId(Number(id));
    }).catch(() => {});
  }, [user?.id, restId]);

  return restId;
}
