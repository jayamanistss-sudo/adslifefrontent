import { useState, useEffect } from 'react';

interface GeoState {
  lat: number;
  lng: number;
  error: string | null;
  loading: boolean;
}

const DEFAULT_LOCATION = { lat: 13.0827, lng: 80.2707 }; // Chennai

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ ...DEFAULT_LOCATION, error: null, loading: true });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, error: 'Geolocation not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setState({
        lat:     pos.coords.latitude,
        lng:     pos.coords.longitude,
        error:   null,
        loading: false,
      }),
      (err) => setState({
        ...DEFAULT_LOCATION,
        error:   err.message,
        loading: false,
      }),
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  return state;
}
