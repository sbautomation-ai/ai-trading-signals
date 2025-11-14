// Vercel Function: /api/economic-calendar
// Uses FinancialModelingPrep Economic Calendar API to return upcoming macro events.
//
// Docs & endpoint example:
// https://financialmodelingprep.com/api/v3/economic_calendar?from=2020-08-05&to=2020-10-20&apikey=YOUR_API_KEY
//
// Env vars:
// - FMP_API_KEY: your FinancialModelingPrep API key (set in Vercel Project Settings > Environment Variables)

interface CalendarEvent {
    datetime: string;
    country: string;
    event: string;
    impact: string | null;
    previous: string | number | null;
    actual: string | number | null;
    forecast: string | number | null;
  }
  
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  function json(data: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
  
  function logInfo(message: string, extra?: Record<string, unknown>) {
    if (extra) {
      console.log('[economic-calendar]', message, extra);
    } else {
      console.log('[economic-calendar]', message);
    }
  }
  
  function logError(message: string, extra?: Record<string, unknown>) {
    if (extra) {
      console.error('[economic-calendar]', message, extra);
    } else {
      console.error('[economic-calendar]', message);
    }
  }
  
  // Build a demo response we can always fall back to if the real API fails.
  // We return status 200 with example events so the UI still looks good.
  function buildDemoResponse(from: string, to: string, note?: string): Response {
    const demoEvents: CalendarEvent[] = [
      {
        datetime: `${from}T08:30:00Z`,
        country: 'US',
        event: 'CPI m/m',
        impact: 'High',
        previous: '0.3%',
        actual: null,
        forecast: '0.2%',
      },
      {
        datetime: `${from}T12:00:00Z`,
        country: 'EU',
        event: 'ECB Rate Decision',
        impact: 'High',
        previous: '4.50%',
        actual: null,
        forecast: '4.50%',
      },
      {
        datetime: `${to}T14:00:00Z`,
        country: 'US',
        event: 'FOMC Press Conference',
        impact: 'High',
        previous: '',
        actual: null,
        forecast: '',
      },
    ];
  
    return json(
      {
        events: demoEvents,
        from,
        to,
        note:
          note ??
          'Static demo data returned because the live economic calendar provider was unavailable or not configured.',
      },
      { status: 200 }
    );
  }
  
  // Handle OPTIONS preflight
  export function OPTIONS() {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS,
    });
  }
  
  export async function GET(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      let from = url.searchParams.get('from') || '';
      let to = url.searchParams.get('to') || '';
  
      const today = new Date();
      const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  
      if (!from || !to) {
        const start = new Date(today);
        start.setDate(start.getDate() - 1); // yesterday
        const end = new Date(today);
        end.setDate(end.getDate() + 6); // next ~week
        from = formatDate(start);
        to = formatDate(end);
      }
  
      const apiKey = process.env.FMP_API_KEY;
  
      // If no API key is configured, log it and return demo data (status 200)
      if (!apiKey) {
        logError('Missing FMP_API_KEY env var; returning static demo data.', {
          from,
          to,
        });
        return buildDemoResponse(
          from,
          to,
          'Static demo data returned because FMP_API_KEY is not configured.'
        );
      }
  
      const fmpUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`;
  
      logInfo('Fetching economic calendar from FMP', { from, to });
  
      const res = await fetch(fmpUrl);
  
      if (!res.ok) {
        logError('FMP API error, falling back to demo data', {
          status: res.status,
          statusText: res.statusText,
        });
        return buildDemoResponse(
          from,
          to,
          `Static demo data returned because the provider responded with ${res.status} ${res.statusText}.`
        );
      }
  
      const raw = (await res.json()) as any[];
  
      const events: CalendarEvent[] = Array.isArray(raw)
        ? raw.map((item) => ({
            datetime: String(item.date || item.datetime || ''),
            country: String(item.country || item.countryCode || ''),
            event: String(item.event || item.title || item.name || ''),
            impact: item.impact ? String(item.impact) : null,
            previous:
              item.previous !== undefined && item.previous !== null
                ? item.previous
                : null,
            actual:
              item.actual !== undefined && item.actual !== null
                ? item.actual
                : null,
            forecast:
              item.forecast !== undefined && item.forecast !== null
                ? item.forecast
                : null,
          }))
        : [];
  
      return json(
        {
          events,
          from,
          to,
        },
        { status: 200 }
      );
    } catch (error: any) {
      const message = error?.message ?? String(error);
      logError('Unhandled error in /api/economic-calendar; falling back to demo data', {
        message,
      });
  
      // On any unexpected error, fall back to demo data instead of 500
      const today = new Date();
      const formatDate = (d: Date) => d.toISOString().slice(0, 10);
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      const end = new Date(today);
      end.setDate(end.getDate() + 6);
  
      return buildDemoResponse(
        formatDate(start),
        formatDate(end),
        'Static demo data returned because an internal error occurred while fetching the live calendar.'
      );
    }
  }
  