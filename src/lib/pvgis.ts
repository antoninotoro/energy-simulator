import { PVGISResponse } from '@/types';

const PVGIS_BASE_URL = 'https://re.jrc.ec.europa.eu/api/v5_2/seriescalc';

export interface PVGISParams {
  latitude: number;
  longitude: number;
  peakPower: number;
  tilt: number;
  azimuth: number;
  systemLoss?: number;
}

export async function fetchPVGISData(params: PVGISParams): Promise<number[]> {
  const {
    latitude,
    longitude,
    peakPower,
    tilt,
    azimuth,
    systemLoss = 14,
  } = params;

  // Build query parameters
  const queryParams = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
    peakpower: peakPower.toString(),
    loss: systemLoss.toString(),
    angle: tilt.toString(),
    aspect: (azimuth - 180).toString(), // PVGIS uses -180 to 180, we use 0-360
    outputformat: 'json',
    pvtechchoice: 'crystSi',
    mountingplace: 'free',
    startyear: '2020',
    endyear: '2020',
  });

  try {
    const response = await fetch(`${PVGIS_BASE_URL}?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`PVGIS API error: ${response.status}`);
    }

    const data: PVGISResponse = await response.json();

    // Extract hourly production values
    const hourlyProduction = data.outputs.hourly.map(h => h.P / 1000); // Convert W to kW

    return hourlyProduction;
  } catch (error) {
    console.error('Error fetching PVGIS data:', error);
    // Return estimated production based on typical Italian values
    return generateFallbackProduction(peakPower, latitude);
  }
}

// Fallback production estimation
function generateFallbackProduction(peakPower: number, latitude: number): number[] {
  const production: number[] = [];

  // Simplified solar model
  for (let day = 0; day < 365; day++) {
    const dayOfYear = day + 1;

    // Solar declination angle
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);

    // Day length factor (simplified)
    const latRad = latitude * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    const dayLengthHours = 24 - (24 / Math.PI) * Math.acos(
      Math.tan(latRad) * Math.tan(decRad)
    );

    for (let hour = 0; hour < 24; hour++) {
      let power = 0;

      // Simplified hour angle
      const solarNoon = 12;
      const hourAngle = (hour - solarNoon) * 15;

      // Check if sun is up
      if (Math.abs(hourAngle) < dayLengthHours * 7.5) {
        // Simplified irradiance model
        const cosZenith = Math.sin(latRad) * Math.sin(decRad) +
          Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle * Math.PI / 180);

        if (cosZenith > 0) {
          // Clear sky irradiance (simplified)
          const irradiance = 1000 * cosZenith * 0.8; // 0.8 for atmospheric effects
          power = (peakPower * irradiance) / 1000;
        }
      }

      production.push(Math.max(0, power));
    }
  }

  return production;
}

// Calculate typical annual production for a location (for preview)
export function estimateAnnualProduction(
  peakPower: number,
  latitude: number
): number {
  // Simplified estimation based on latitude
  // Italy range: ~1000-1400 kWh/kWp
  const baseProduction = 1300; // kWh/kWp for central Italy
  const latitudeAdjustment = 1 - (Math.abs(latitude - 42) * 0.01); // Optimal around 42°N

  return peakPower * baseProduction * latitudeAdjustment;
}

// Convert coordinates to city name (simplified)
export function getCityFromCoordinates(lat: number, lon: number): string {
  // Major Italian cities
  const cities = [
    { name: 'Roma', lat: 41.9028, lon: 12.4964 },
    { name: 'Milano', lat: 45.4642, lon: 9.1900 },
    { name: 'Napoli', lat: 40.8518, lon: 14.2681 },
    { name: 'Torino', lat: 45.0703, lon: 7.6869 },
    { name: 'Palermo', lat: 38.1157, lon: 13.3615 },
    { name: 'Firenze', lat: 43.7696, lon: 11.2558 },
    { name: 'Bologna', lat: 44.4949, lon: 11.3426 },
    { name: 'Bari', lat: 41.1171, lon: 16.8719 },
  ];

  let closest = cities[0];
  let minDistance = Infinity;

  for (const city of cities) {
    const distance = Math.sqrt(
      Math.pow(city.lat - lat, 2) + Math.pow(city.lon - lon, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = city;
    }
  }

  return minDistance < 0.5 ? closest.name : `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
}
