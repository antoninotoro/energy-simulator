import { NextRequest, NextResponse } from 'next/server';

const PVGIS_BASE_URL = 'https://re.jrc.ec.europa.eu/api/v5_2/seriescalc';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const peakpower = searchParams.get('peakpower');
  const angle = searchParams.get('angle');
  const aspect = searchParams.get('aspect');

  if (!lat || !lon || !peakpower) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const queryParams = new URLSearchParams({
    lat,
    lon,
    peakpower,
    loss: '14',
    angle: angle || '30',
    aspect: aspect || '0',
    outputformat: 'json',
    pvtechchoice: 'crystSi',
    mountingplace: 'free',
    startyear: '2020',
    endyear: '2020',
  });

  try {
    const response = await fetch(`${PVGIS_BASE_URL}?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`PVGIS API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract hourly production values (W -> kW)
    const hourlyProduction = data.outputs.hourly.map(
      (h: { P: number }) => h.P / 1000
    );

    return NextResponse.json({ hourlyProduction });
  } catch (error) {
    console.error('PVGIS API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PVGIS data' },
      { status: 500 }
    );
  }
}
