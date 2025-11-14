import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import { SignalForm } from './components/SignalForm';
import { SignalDisplay } from './components/SignalDisplay';
import { SignalResponse, SignalRequest } from './types/trading';

interface Note {
  id: string;
  createdAt: string;
  content: string;
}

interface SignalsPageProps {
  onSubmit: (
    symbol: string,
    accountSize: number,
    tradeRiskPercent: number,
    originalSymbolFormat: string
  ) => Promise<void> | void;
  isLoading: boolean;
  error: string | null;
  signalData: SignalResponse | null;
  onSaveSignalToNotes: (content: string) => void;
}

interface NotesPageProps {
  notes: Note[];
  noteDraft: string;
  onChangeDraft: (value: string) => void;
  onSaveDraft: () => void;
  onDeleteNote: (id: string) => void;
}

interface EconomicEvent {
  datetime: string;
  country: string;
  event: string;
  impact: string | null;
  previous: string | number | null;
  actual: string | number | null;
  forecast: string | number | null;
}

function App() {
  const [signalData, setSignalData] = useState<SignalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notes (trade diary)
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDraft, setNoteDraft] = useState('');

  // Load notes from localStorage on first load
  useEffect(() => {
    try {
      const raw = localStorage.getItem('trade-notes');
      if (raw) {
        const parsed = JSON.parse(raw) as Note[];
        if (Array.isArray(parsed)) {
          setNotes(parsed);
        }
      }
    } catch (err) {
      console.error('[Notes] Failed to load notes from localStorage', err);
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('trade-notes', JSON.stringify(notes));
    } catch (err) {
      console.error('[Notes] Failed to save notes to localStorage', err);
    }
  }, [notes]);

  const addNote = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const newNote: Note = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      content: trimmed,
    };

    setNotes((prev) => [newNote, ...prev]);
  };

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    addNote(noteDraft);
    setNoteDraft('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleSaveSignalToNotes = (content: string) => {
    addNote(content);
  };

  const handleSubmit = async (
    symbol: string,
    accountSize: number,
    tradeRiskPercent: number,
    originalSymbolFormat: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const request: SignalRequest = {
        symbol,
        accountSize,
        tradeRiskPercent,
      };

      // Prefer explicit API URL if provided, otherwise use relative path
      const apiUrlFromEnv = import.meta.env.VITE_API_URL?.toString().trim();
      const apiUrl =
        apiUrlFromEnv && apiUrlFromEnv.length > 0
          ? apiUrlFromEnv
          : '/api/generate-signal';

      console.log('[SignalForm] Sending signal request', {
        apiUrl,
        symbol,
        accountSize,
        tradeRiskPercent,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate signal';
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // ignore JSON parse errors here
        }
        throw new Error(errorMessage);
      }

      const data: SignalResponse = await response.json();
      // Keep symbol with user’s original formatting (for display)
      data.signal.symbol = originalSymbolFormat.toLowerCase();
      setSignalData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';

      console.error('[SignalForm] Error generating signal', {
        message: errorMessage,
      });

      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')
      ) {
        setError(
          `Failed to connect to API. If you're running locally, check VITE_API_URL in your .env.local, or ensure /api/generate-signal is reachable. Error: ${errorMessage}`
        );
      } else {
        setError(errorMessage);
      }
      setSignalData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-full text-sm border transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">
              On-Demand Signals
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
              Early preview
            </span>
          </div>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/signals" className={navLinkClass}>
              Request Trade Signal
            </NavLink>
            <NavLink to="/calendar" className={navLinkClass}>
              Economic Calendar
            </NavLink>
            <NavLink to="/notes" className={navLinkClass}>
              Notes
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/signals"
              element={
                <SignalsPage
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  error={error}
                  signalData={signalData}
                  onSaveSignalToNotes={handleSaveSignalToNotes}
                />
              }
            />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route
              path="/notes"
              element={
                <NotesPage
                  notes={notes}
                  noteDraft={noteDraft}
                  onChangeDraft={setNoteDraft}
                  onSaveDraft={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                />
              }
            />
            {/* Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </div>
      </main>

      {/* Disclaimer Footer */}
      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-6">
          <p className="text-xs text-muted-foreground text-center max-w-4xl mx-auto">
            Disclaimer: The signals provided are for educational purposes only
            and do not constitute financial advice. Trading involves risk, and
            you should only trade with money you can afford to lose. Past
            performance does not guarantee future results. Always do your own
            research and consider consulting a licensed financial advisor before
            making investment decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">
          On-Demand Trading Signals
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          A simple workspace for traders: request AI-powered trade ideas, track
          your economic calendar, and log your trades in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to="/signals"
            className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            🚀 Request Trade Signal
          </Link>
          <p className="text-xs text-muted-foreground">
            No signup. No noise. Just structured trade ideas.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border bg-card flex flex-col gap-2">
          <div className="text-3xl">⚡️</div>
          <h3 className="font-semibold">On-Demand Signals</h3>
          <p className="text-sm text-muted-foreground">
            Generate a trade idea in seconds based on your symbol, account size,
            and risk profile.
          </p>
        </div>
        <div className="p-6 rounded-xl border bg-card flex flex-col gap-2">
          <div className="text-3xl">📅</div>
          <h3 className="font-semibold">Economic Context</h3>
          <p className="text-sm text-muted-foreground">
            Keep an eye on key economic events so you don&apos;t get surprised
            mid-trade.
          </p>
        </div>
        <div className="p-6 rounded-xl border bg-card flex flex-col gap-2">
          <div className="text-3xl">📝</div>
          <h3 className="font-semibold">Trade Diary</h3>
          <p className="text-sm text-muted-foreground">
            Log your ideas and outcomes in a simple notes tab to improve over
            time.
          </p>
        </div>
      </section>

      <section className="border rounded-xl p-6 bg-card space-y-3">
        <h2 className="text-lg font-semibold">How it fits together</h2>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1.5">
          <li>
            Use <strong>Request Trade Signal</strong> to generate a structured
            trading idea.
          </li>
          <li>
            Check the <strong>Economic Calendar</strong> before entering to
            avoid major event surprises.
          </li>
          <li>
            Record your thinking and results in <strong>Notes</strong> so you
            can review and improve.
          </li>
        </ol>
      </section>
    </div>
  );
}

function SignalsPage({
  onSubmit,
  isLoading,
  error,
  signalData,
  onSaveSignalToNotes,
}: SignalsPageProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold">
          Request Trade Signal
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Enter your symbol, account size and risk per trade. We&apos;ll return
          a structured idea with entry, stop loss, and take profit targets — all
          tailored to your risk.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div>
          <SignalForm onSubmit={onSubmit} isLoading={isLoading} />
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div>
          <SignalDisplay
            signalData={signalData}
            onSaveToNotes={onSaveSignalToNotes}
          />
        </div>
      </section>
    </div>
  );
}

function CalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalendar = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const apiBaseFromEnv =
          import.meta.env.VITE_CALENDAR_API_URL?.toString().trim();
        const url =
          apiBaseFromEnv && apiBaseFromEnv.length > 0
            ? apiBaseFromEnv
            : '/api/economic-calendar';

        console.log('[Calendar] Fetching events from', url);

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Calendar API error (${res.status})`);
        }

        const json = await res.json();
        const fetchedEvents = (json.events || []) as EconomicEvent[];
        setEvents(fetchedEvents);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load calendar';
        console.error('[Calendar] Error', message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendar();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Economic Calendar</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Stay aware of major macro events before entering trades. This calendar
          is fetched from a financial data API and focuses on high-level
          releases that can move FX, indices, and metals.
        </p>
      </section>

      <section className="border rounded-xl bg-card p-4 md:p-6 space-y-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading events...</p>
        )}

        {error && (
          <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10">
            <p className="text-xs text-red-300">
              Failed to load economic calendar. {error}
            </p>
          </div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No events found for this period. Try again later or check your data
            provider configuration.
          </p>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3">Date / Time</th>
                  <th className="text-left py-2 pr-3">Country</th>
                  <th className="text-left py-2 pr-3">Event</th>
                  <th className="text-left py-2 pr-3">Impact</th>
                  <th className="text-right py-2 pr-3">Actual</th>
                  <th className="text-right py-2 pr-3">Forecast</th>
                  <th className="text-right py-2">Previous</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => (
                  <tr
                    key={`${ev.datetime}-${ev.event}-${idx}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2 pr-3 align-top">
                      <div className="flex flex-col">
                        <span>
                          {ev.datetime
                            ? new Date(ev.datetime).toLocaleDateString()
                            : '-'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {ev.datetime
                            ? new Date(ev.datetime).toLocaleTimeString(
                                undefined,
                                { hour: '2-digit', minute: '2-digit' }
                              )
                            : ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top">{ev.country || '-'}</td>
                    <td className="py-2 pr-3 align-top">{ev.event || '-'}</td>
                    <td className="py-2 pr-3 align-top">
                      {ev.impact || '-'}
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      {ev.actual ?? '-'}
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      {ev.forecast ?? '-'}
                    </td>
                    <td className="py-2 align-top text-right">
                      {ev.previous ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground pt-2">
          Data is provided by a third-party economic calendar API and may be
          delayed or incomplete. Always confirm critical event times with your
          broker or a trusted source before trading.
        </p>
      </section>
    </div>
  );
}

function NotesPage({
  notes,
  noteDraft,
  onChangeDraft,
  onSaveDraft,
  onDeleteNote,
}: NotesPageProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Trade Notes</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Use this space as a simple trade diary: jot down your ideas, reasons
          for entering or skipping trades, and what you learned. Notes stay on
          this device using your browser&apos;s local storage.
        </p>
      </section>

      <section className="border rounded-xl bg-card p-4 md:p-6 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="note"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            New Note
          </label>
          <textarea
            id="note"
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            placeholder="Example: EURUSD short after FOMC, reasons, risk, and outcome..."
            value={noteDraft}
            onChange={(e) => onChangeDraft(e.target.value)}
          />
        </div>
        <div className="flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={!noteDraft.trim()}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save note
          </button>
          <p className="text-[11px] text-muted-foreground">
            Notes are stored locally in your browser (no cloud sync yet).
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
          Saved Notes
        </h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notes yet. Start by writing how you approached your last trade.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border rounded-lg bg-card p-3 md:p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => onDeleteNote(note.id)}
                    className="text-[11px] text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
