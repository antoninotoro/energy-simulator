import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    // Call Nominatim API (OpenStreetMap geocoding - free)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)},Italy&format=json&limit=5&accept-language=it`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'EnergySimulator/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error('Geocoding service error');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      );
    }

    // Return the results with formatted names
    const results = data.map((item: any) => ({
      displayName: item.display_name,
      name: item.name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 500 }
    );
  }
}
