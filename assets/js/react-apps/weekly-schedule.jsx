const { useState, useEffect } = React;

// Published Google Sheet (File → Share → Publish to web → CSV).
// One row per session; see rowsToSchedule() for the expected columns.
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTX7r7GrVyyEbKCYgF6UZSNALP2bYYdZPpN2yTqQBWf71pKHR-PQjLQFs_RcwlPMxoHOhbf-AklKxdo/pub?output=csv';
const FETCH_TIMEOUT_MS = 8000;

const LOCALES = {
  hu: {
    days: ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'],
    bookingLabel: 'Időpontfoglalás →',
    typeLabels: { group: 'Csoportos', individual: 'Egyéni' },
    emptyDay: '–',
    loading: 'Órarend betöltése…',
    spots: n => (n === 0 ? '(betelt)' : `(${n} hely)`),
  },
  en: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    bookingLabel: 'Book a session →',
    typeLabels: { group: 'Group', individual: 'Individual' },
    emptyDay: '–',
    loading: 'Loading schedule…',
    spots: n => (n === 0 ? '(full)' : `(${n} avail. spots)`),
  },
};

// Fallback schedule, shown only if the Google Sheet can't be loaded.
// Indexed by day (0 = Mon … 4 = Fri), with per-language title & description.
// Include a `url` string on items that should show a booking button; omit it to hide the button.
// `availSpots` (group sessions only) is shown right-aligned next to the title; omit it to hide.
const FALLBACK_SCHEDULE = [
  // Monday
  [
    {
      id: 'h1', time: '09:00–20:00', type: 'individual',
      title: { hu: 'Egyéni fejlesztések', en: 'Individual sessions' },
      description: {
        hu: 'Egyéni foglalkozások.',
        en: 'Tailored one-on-one session led by a special-education teacher or physiotherapist.',
      },
    },
  ],
  // Tuesday
  [
    {
      id: 't1', time: '09:00–20:00', type: 'individual',
      title: { hu: 'Egyéni fejlesztések', en: 'Individual sessions' },
      description: {
        hu: 'Egyéni foglalkozások.',
        en: 'Tailored one-on-one session led by a special-education teacher or physiotherapist.',
      },
    },
  ],
  // Wednesday
  [
    {
      id: 'sz1', time: '09:30–17:00', type: 'individual',
      title: { hu: 'Egyéni fejlesztő mászás', en: 'Individual developmental climbing' },
      description: {
        hu: 'Egyéni fejlesztés és terápiák.',
        en: 'Tailored one-on-one session led by a special-education teacher or physiotherapist.',
      },
    },
    {
      id: 'sz2', time: '17:00–18:00', type: 'group',
      title: { hu: 'Csoportos falmászás [kicsiknek]', en: 'Developmental climbing session' },
      description: {
        hu: 'Csoportos foglalkozás 3–5 éves gyerekeknek, akiknek a készségeit célzottabban, specifikus igényeik szerint fejlesztjük.',
        en: 'Group session for children aged 3–5, developing their skills in a more targeted way, tailored to their specific needs.',
      },
      url: '/idopontfoglalas',
    },
    {
      id: 'sz3', time: '18:00–19:00', type: 'group', availSpots: 2,
      title: { hu: 'Mesés fejlesztő falmászás', en: 'Story-based developmental climbing' },
      description: {
        hu: 'Csoportos foglalkozás 5–8 éves gyerekeknek. Mozgás és képzelet összekapcsolódik a falon.',
        en: 'Group session for children aged 5–8. Movement and imagination come together on the wall.',
      },
      url: '/idopontfoglalas',
    },
  ],
  // Thursday
  [
    {
      id: 'cs1', time: '17:00–18:00', type: 'group', availSpots: 1,
      title: { hu: 'Mesés fejlesztő falmászás [HU]', en: 'Story-based developmental climbing' },
      description: {
        hu: 'Mesékbe foglalt fejlesztő óra 3–4,5 év közötti gyerekeknek, mászófal használatával erősen integrálva.',
        en: 'Story-based developmental session for children aged 3–4.5, with the climbing wall closely integrated.',
      },
    },
    {
      id: 'cs2', time: '18:00–19:00', type: 'group', availSpots: 0,
      title: { hu: 'Mesés fejlesztő falmászás [HU]', en: 'Story-based developmental climbing' },
      description: {
        hu: 'Mesékbe foglalt fejlesztő óra 4,5–6 év közötti gyerekeknek, mászófal használatával erősen integrálva.',
        en: 'Story-based developmental session for children aged 4.5–6, with the climbing wall closely integrated.',
      },
    },
  ],
  // Friday
  [
    {
      id: 'p1', time: '09:00–16:00', type: 'individual',
      title: { hu: 'Egyéni fejlesztések', en: 'Individual sessions' },
      description: {
        hu: 'Egyéni foglalkozások.',
        en: 'Tailored one-on-one session led by a special-education teacher or physiotherapist.',
      }
    },
    {
      id: 'p2', time: '09:00–10:00', type: 'group',
      title: { hu: 'Fejlesztő falmászás', en: 'Climbing lesson' },
      description: {
        hu: '',
        en: '',
      },
    },
  ],
];

// Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes, and commas/newlines inside quotes.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Lowercase and strip accents, so "Csütörtök", "csutortok" and "CSÜTÖRTÖK" all match.
const normalize = str => (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const DAY_INDEX = {};
Object.values(LOCALES).forEach(l => l.days.forEach((d, i) => { DAY_INDEX[normalize(d)] = i; }));

const INACTIVE_VALUES = ['0', 'false', 'no', 'nem'];

// Expected columns (any order, header names case-insensitive):
// day, time, type, avail_spots, title_hu, title_en, desc_hu, desc_en, booking_url, active
function rowsToSchedule(rows) {
  const [header, ...body] = rows;
  if (!header) return null;
  const col = Object.fromEntries(header.map((h, i) => [normalize(h), i]));
  if (col.day === undefined || col.time === undefined) return null;
  const get = (r, name) => (col[name] === undefined ? '' : (r[col[name]] || '').trim());

  const schedule = FALLBACK_SCHEDULE.map(() => []);
  body.forEach((r, n) => {
    const day = DAY_INDEX[normalize(get(r, 'day'))];
    if (day === undefined) return; // blank or unrecognised day → skip row
    if (INACTIVE_VALUES.includes(normalize(get(r, 'active')))) return;

    const type = normalize(get(r, 'type')) === 'individual' ? 'individual' : 'group';
    const titleHu = get(r, 'title_hu'), titleEn = get(r, 'title_en');
    const descHu = get(r, 'desc_hu'), descEn = get(r, 'desc_en');
    const url = get(r, 'booking_url');
    // Only group sessions show available spots, and only when the cell holds a whole number.
    const spots = get(r, 'avail_spots');
    const availSpots = type === 'group' && /^\d+$/.test(spots) ? Number(spots) : undefined;
    schedule[day].push({
      id: `row-${n}`,
      time: get(r, 'time'),
      type,
      // Fall back to the other language when a translation is missing.
      title: { hu: titleHu || titleEn, en: titleEn || titleHu },
      description: { hu: descHu || descEn, en: descEn || descHu },
      ...(url && { url }),
      ...(availSpots !== undefined && { availSpots }),
    });
  });
  // Sort each day by start time; ties keep sheet order.
  schedule.forEach(day => day.sort((a, b) => a.time.localeCompare(b.time)));
  return schedule.some(day => day.length) ? schedule : null;
}

// Fetched once per page, shared by every schedule on it.
let schedulePromise = null;
function loadSchedule() {
  if (!schedulePromise) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    schedulePromise = fetch(SHEET_CSV_URL, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => {
        const schedule = rowsToSchedule(parseCsv(text));
        if (!schedule) throw new Error('no valid rows');
        return schedule;
      })
      .catch(err => {
        console.warn('weekly-schedule: using fallback schedule:', err);
        return FALLBACK_SCHEDULE;
      })
      .finally(() => clearTimeout(timer));
  }
  return schedulePromise;
}

const TYPE_STYLE = {
  group:      { accent: '#5b9ec9', bg: '#eef6fb' },
  individual: { accent: '#5aaa72', bg: '#eef7f1' },
};

function EventCard({ event, lang, strings }) {
  const [open, setOpen] = useState(false);
  const s = TYPE_STYLE[event.type];

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        marginBottom: '8px',
        borderRadius: '6px',
        overflow: 'hidden',
        border: `1px solid ${open ? s.accent : '#e4e4e4'}`,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        backgroundColor: 'white',
      }}
    >
      <div style={{
        padding: '9px 11px',
        borderLeft: `3px solid ${s.accent}`,
        backgroundColor: open ? s.bg : 'white',
        transition: 'background-color 0.15s',
      }}>
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px', fontVariantNumeric: 'tabular-nums' }}>
          {event.time}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#2a2a2a', lineHeight: '1.3' }}>
            {event.title[lang]}
          </span>
          {event.availSpots !== undefined && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              fontWeight: '600',
              color: s.accent,
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {strings.spots(event.availSpots)}
            </span>
          )}
        </div>
        <div style={{ marginTop: '4px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: s.accent,
          }}>
            {strings.typeLabels[event.type]}
          </span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${s.accent}22` }}>
          <p style={{ fontSize: '13px', color: '#555', margin: '0 0 12px', lineHeight: '1.5' }}>
            {event.description[lang]}
          </p>
          {event.url && (
            <a
              href={event.url}
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-block',
                padding: '7px 16px',
                backgroundColor: s.accent,
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.02em',
              }}
            >
              {strings.bookingLabel}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function WeeklyCalendar({ lang }) {
  const resolvedLang = (lang && LOCALES[lang]) ? lang : 'hu';
  const strings = LOCALES[resolvedLang];
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadSchedule().then(data => { if (!cancelled) setSchedule(data); });
    return () => { cancelled = true; };
  }, []);

  if (!schedule) {
    return (
      <div style={{ margin: '2em 0', fontSize: '13px', color: '#999', textAlign: 'center' }}>
        {strings.loading}
      </div>
    );
  }

  return (
    <div style={{ margin: '2em 0', overflowX: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${strings.days.length}, minmax(140px, 1fr))`,
        gap: '14px',
        minWidth: '600px',
      }}>
        {strings.days.map((day, i) => (
          <div key={day}>
            <div style={{
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#555',
              padding: '0 0 8px',
              borderBottom: '2px solid #e8e8e8',
              marginBottom: '10px',
            }}>
              {day}
            </div>
            {(schedule[i] || []).length === 0
              ? <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', padding: '12px 0' }}>{strings.emptyDay}</div>
              : (schedule[i] || []).map(event => (
                  <EventCard key={event.id} event={event} lang={resolvedLang} strings={strings} />
                ))
            }
          </div>
        ))}
      </div>
    </div>
  );
}

document.addEventListener('DOMContentLoaded', function () {
  const containers = document.querySelectorAll('[data-component="weekly-schedule"]');
  containers.forEach(container => {
    const props = JSON.parse(container.getAttribute('data-props') || '{}');
    const root = ReactDOM.createRoot(container);
    root.render(<WeeklyCalendar lang={props.lang} />);
  });
});
