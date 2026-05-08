const { useState } = React;

const LOCALES = {
  hu: {
    days: ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'],
    bookingLabel: 'Időpontfoglalás →',
    typeLabels: { group: 'Csoportos', individual: 'Egyéni' },
    emptyDay: '–',
  },
  en: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    bookingLabel: 'Book a session →',
    typeLabels: { group: 'Group', individual: 'Individual' },
    emptyDay: '–',
  },
};

// Schedule indexed by day (0 = Mon … 4 = Fri), with per-language title & description.
// Include a `url` string on items that should show a booking button; omit it to hide the button.
const SCHEDULE = [
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
        hu: 'Egyényi fejlesztés és terápiák',
        en: 'Tailored one-on-one session led by a special-education teacher or physiotherapist.',
      },
    },
    {
      id: 'sz2', time: '17:00–18:00', type: 'group',
      title: { hu: 'Kis csoportos falmászás (van hely)', en: 'Developmental climbing session' },
      description: {
        hu: 'Csoportos foglalkozás 5–8 éves gyerekeknek akiknek célzottabban, specifikusabb igények szerint fejlesztük a készségeit.',
        en: 'Group session for children aged 5–8. Movement and imagination come together on the wall.',
      },
      url: '/idopontfoglalas',
    },
    {
      id: 'sz3', time: '18:00–19:00', type: 'group',
      title: { hu: 'Mesés fejlesztő falmászás (van hely)', en: 'Story-based developmental climbing' },
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
      id: 'cs1', time: '17:00–18:00', type: 'group',
      title: { hu: 'Mesés fejlesztő falmászás [HU] (még 1 hely)', en: 'Story-based developmental climbing' },
      description: {
        hu: 'Mesékbe foglalt, fejlesztési óra 3-4.5 év közötti gyerekeknek, mászófal használatával erősen integrálva.',
        en: 'Story based developmental ls.',
      },
    },
    {
      id: 'cs2', time: '18:00–19:00', type: 'group',
      title: { hu: 'Mesés fejlesztő falmászás [HU] (betelt)', en: 'Story-based developmental climbing' },
      description: {
        hu: 'Mesékbe foglalt, fejlesztési óra 4.5-6 év közötti gyerekeknek, mászófal használatával erősen integrálva.',
        en: 'Story based developmental ls.',
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
      title: { hu: 'SNI falmászás', en: 'SNI climbing lesson' },
      description: {
        hu: '',
        en: '',
      },
    },
  ],
];

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
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#2a2a2a', lineHeight: '1.3' }}>
          {event.title[lang]}
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
            {(SCHEDULE[i] || []).length === 0
              ? <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', padding: '12px 0' }}>{strings.emptyDay}</div>
              : (SCHEDULE[i] || []).map(event => (
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
