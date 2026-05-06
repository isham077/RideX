import axios from "axios";

/**
 * Geolocation and Routing Service
 * Uses OpenRouteService (Free Tier)
 */

const API_KEY = import.meta.env.VITE_OPENROUTE_SERVICE_API_KEY;

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Geocodes an address string to coordinates using OpenRouteService
 */
export async function geocode(address: string): Promise<Coordinates | null> {
  if (!API_KEY) return null;
  
  try {
    const response = await axios.get(
      `https://api.openrouteservice.org/geocode/search?api_key=${API_KEY}&text=${encodeURIComponent(address)}&layers=address,venue,neighbourhood,locality`
    );
    const data = response.data;
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      return { lat, lng };
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      console.warn("Geocoding connectivity issue.");
    } else {
      console.error("Geocoding error:", error);
    }
    return null;
  }
}

/**
 * Provides location suggestions as the user types
 */
export async function autocomplete(text: string): Promise<string[]> {
  if (!API_KEY || text.length < 3) return [];

  try {
    const response = await axios.get(
      `https://api.openrouteservice.org/geocode/autocomplete?api_key=${API_KEY}&text=${encodeURIComponent(text)}&layers=address,venue,neighbourhood,locality&size=5`
    );
    const data = response.data;
    
    if (data.features) {
      return data.features.map((f: any) => f.properties.label);
    }
    return [];
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      console.warn("Autocomplete connectivity issue.");
    } else {
      console.error("Autocomplete error:", error);
    }
    return [];
  }
}

/**
 * Calculates distance between two points in kilometers
 */
export async function calculateDistance(start: Coordinates, end: Coordinates): Promise<number | null> {
  if (!API_KEY) return null;

  try {
    const response = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`
    );
    const data = response.data;
    
    if (data.features && data.features.length > 0) {
      // Distance is in meters, convert to km
      const distanceMeters = data.features[0].properties.summary.distance;
      return Math.round((distanceMeters / 1000) * 100) / 100;
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      console.warn("Distance calculation connectivity issue.");
    } else {
      console.error("Distance calculation error:", error);
    }
    return null;
  }
}

/**
 * Gets current user location using browser API
 */
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}
