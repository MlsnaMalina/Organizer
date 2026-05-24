import React, { useReducer, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Bell, MapPin, Cake, Bug, Check, Pin, Trash2, Settings, Search, Calendar as CalIcon, ListTodo, ArrowRight } from 'lucide-react';

// ============ VIEWPORT HOOK ============

function useViewport() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isDesktop };
}

// ============ DESIGN TOKENS ============

const TOKENS = {
  bg: '#FFFFFF',
  bgSoft: 'oklch(98% 0.003 350)',
  bgCool: 'oklch(99% 0.002 250)',
  text: '#1A1714',
  textSecondary: 'rgba(26,23,20,0.65)',
  textMuted: 'rgba(26,23,20,0.45)',
  border: 'rgba(26,23,20,0.10)',
  borderSoft: 'rgba(26,23,20,0.06)',
  accent: '#7A1840',
  accentHover: '#B83066',
  accentSoft: 'oklch(95% 0.025 350)',
  accentStrong: '#5C1230',
};

const CATEGORIES_DEFAULT = [
  { id: 'prace', name: 'Práce', color: '#1E6F95' },
  { id: 'rodina', name: 'Rodina', color: '#D26B47' },
  { id: 'osobni', name: 'Osobní', color: '#5C8C5A' },
  { id: 'ostatni', name: 'Ostatní', color: '#6F5483' },
];

const EVENT_TYPES = {
  appointment: { label: 'Schůzka', color: '#4A506D' },
  birthday: { label: 'Narozeniny / svátek', color: '#D9A335' },
  other: { label: 'Ostatní', color: '#C44A30' },
};

const EVENT_SUBTYPES_DEFAULT = ['Klíště'];

// ============ DATA MODEL & REDUCER ============

const STORAGE_KEY = 'organizer-state-v2';

function loadInitialState() {
  const defaults = {
    view: 'calendar',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    categories: CATEGORIES_DEFAULT,
    events: [],
    tasks: [],
    notes: {},
    eventSubtypes: EVENT_SUBTYPES_DEFAULT,
    people: [],
    selectedDay: null,
    activeCategoryTab: 'prace',
    modal: null,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const stored = JSON.parse(raw);
    // Migrace: 'tick' -> 'other' s customLabel 'Klíště'
    if (Array.isArray(stored.events)) {
      stored.events = stored.events.map(e =>
        e.type === 'tick' ? { ...e, type: 'other', customLabel: e.customLabel || 'Klíště' } : e
      );
    }
    return { ...defaults, ...stored, modal: null, selectedDay: null };
  } catch {
    return defaults;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'PREV_MONTH': {
      const m = state.currentMonth - 1;
      return m < 0
        ? { ...state, currentMonth: 11, currentYear: state.currentYear - 1 }
        : { ...state, currentMonth: m };
    }
    case 'NEXT_MONTH': {
      const m = state.currentMonth + 1;
      return m > 11
        ? { ...state, currentMonth: 0, currentYear: state.currentYear + 1 }
        : { ...state, currentMonth: m };
    }
    case 'GO_TODAY': {
      const n = new Date();
      return { ...state, currentMonth: n.getMonth(), currentYear: n.getFullYear() };
    }
    case 'SELECT_DAY':
      return { ...state, selectedDay: action.day };
    case 'SET_CATEGORY_TAB':
      return { ...state, activeCategoryTab: action.id };
    case 'OPEN_MODAL':
      return { ...state, modal: action.modal };
    case 'CLOSE_MODAL':
      return { ...state, modal: null };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.event] };
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map(e => e.id === action.event.id ? action.event : e) };
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter(e => e.id !== action.id) };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.task.id ? action.task : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };
    case 'TOGGLE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, completed: !t.completed } : t) };
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.category.id ? action.category : c) };
    case 'SET_NOTE': {
      const notes = { ...(state.notes || {}) };
      if (action.text && action.text.trim()) notes[action.day] = action.text;
      else delete notes[action.day];
      return { ...state, notes };
    }
    case 'ADD_EVENT_SUBTYPE': {
      const list = state.eventSubtypes || [];
      const v = (action.label || '').trim();
      if (!v || list.includes(v)) return state;
      return { ...state, eventSubtypes: [...list, v] };
    }
    case 'ADD_PERSON':
      return { ...state, people: [...(state.people || []), action.person] };
    case 'UPDATE_PERSON':
      return { ...state, people: (state.people || []).map(p => p.id === action.person.id ? action.person : p) };
    case 'DELETE_PERSON':
      return { ...state, people: (state.people || []).filter(p => p.id !== action.id) };
    default:
      return state;
  }
}

// ============ UTILS ============

const MONTHS_LOWER = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
const MONTHS_NOM = ['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'];
const DAYS_FULL = ['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];
const DAYS_SHORT = ['Po','Út','St','Čt','Pá','So','Ne'];
const DAYS_SINGLE = ['P','Ú','S','Č','P','S','N'];

// Český svátkový kalendář (občanský, pro každý den v roce)
const NAME_DAYS = {
  '01-01':'Nový rok','01-02':'Karina','01-03':'Radmila','01-04':'Diana','01-05':'Dalimil','01-06':'Tři králové','01-07':'Vilma','01-08':'Čestmír','01-09':'Vladan','01-10':'Břetislav',
  '01-11':'Bohdana','01-12':'Pravoslav','01-13':'Edita','01-14':'Radovan','01-15':'Alice','01-16':'Ctirad','01-17':'Drahoslav','01-18':'Vladislav','01-19':'Doubravka','01-20':'Ilona',
  '01-21':'Běla','01-22':'Slavomír','01-23':'Zdeněk','01-24':'Milena','01-25':'Miloš','01-26':'Zora','01-27':'Ingrid','01-28':'Otýlie','01-29':'Zdislava','01-30':'Robin','01-31':'Marika',
  '02-01':'Hynek','02-02':'Nela','02-03':'Blažej','02-04':'Jarmila','02-05':'Dobromila','02-06':'Vanda','02-07':'Veronika','02-08':'Milada','02-09':'Apolena','02-10':'Mojmír',
  '02-11':'Božena','02-12':'Slavěna','02-13':'Věnceslav','02-14':'Valentýn','02-15':'Jiřina','02-16':'Ljuba','02-17':'Miloslava','02-18':'Gizela','02-19':'Patrik','02-20':'Oldřich',
  '02-21':'Lenka','02-22':'Petr','02-23':'Svatopluk','02-24':'Matěj','02-25':'Liliana','02-26':'Dorota','02-27':'Alexandr','02-28':'Lumír','02-29':'Horymír',
  '03-01':'Bedřich','03-02':'Anežka','03-03':'Kamil','03-04':'Stela','03-05':'Kazimír','03-06':'Miroslav','03-07':'Tomáš','03-08':'Gabriela','03-09':'Františka','03-10':'Viktorie',
  '03-11':'Anděla','03-12':'Řehoř','03-13':'Růžena','03-14':'Rút a Matylda','03-15':'Ida','03-16':'Elena, Herbert','03-17':'Vlastimil','03-18':'Eduard','03-19':'Josef','03-20':'Světlana',
  '03-21':'Radek','03-22':'Leona','03-23':'Ivona','03-24':'Gabriel','03-25':'Marián','03-26':'Emanuel','03-27':'Dita','03-28':'Soňa','03-29':'Taťána','03-30':'Arnošt','03-31':'Kvido',
  '04-01':'Hugo','04-02':'Erika','04-03':'Richard','04-04':'Ivana','04-05':'Miroslava','04-06':'Vendula','04-07':'Heřman, Hermína','04-08':'Ema','04-09':'Dušan','04-10':'Darja',
  '04-11':'Izabela','04-12':'Julius','04-13':'Aleš','04-14':'Vincenc','04-15':'Anastázie','04-16':'Irena','04-17':'Rudolf','04-18':'Valérie','04-19':'Rostislav','04-20':'Marcela',
  '04-21':'Alexandra','04-22':'Evženie','04-23':'Vojtěch','04-24':'Jiří','04-25':'Marek','04-26':'Oto','04-27':'Jaroslav','04-28':'Vlastislav','04-29':'Robert','04-30':'Blahoslav',
  '05-01':'Svátek práce','05-02':'Zikmund','05-03':'Alexej','05-04':'Květoslav','05-05':'Klaudie','05-06':'Radoslav','05-07':'Stanislav','05-08':'Den vítězství','05-09':'Ctibor','05-10':'Blažena',
  '05-11':'Svatava','05-12':'Pankrác','05-13':'Servác','05-14':'Bonifác','05-15':'Žofie','05-16':'Přemysl','05-17':'Aneta','05-18':'Nataša','05-19':'Ivo','05-20':'Zbyšek',
  '05-21':'Monika','05-22':'Emil','05-23':'Vladimír','05-24':'Jana','05-25':'Viola','05-26':'Filip','05-27':'Valdemar','05-28':'Vilém','05-29':'Maxmilián','05-30':'Ferdinand','05-31':'Kamila',
  '06-01':'Laura','06-02':'Jarmil','06-03':'Tamara','06-04':'Dalibor','06-05':'Dobroslav','06-06':'Norbert','06-07':'Iveta a Slavoj','06-08':'Medard','06-09':'Stanislava','06-10':'Gita',
  '06-11':'Bruno','06-12':'Antonie','06-13':'Antonín','06-14':'Roland','06-15':'Vít','06-16':'Zbyněk','06-17':'Adolf','06-18':'Milan','06-19':'Leoš','06-20':'Květa',
  '06-21':'Alois','06-22':'Pavla','06-23':'Zdeňka','06-24':'Jan','06-25':'Ivan','06-26':'Adriana','06-27':'Ladislav','06-28':'Lubomír','06-29':'Petr a Pavel','06-30':'Šárka',
  '07-01':'Jaroslava','07-02':'Patricie','07-03':'Radomír','07-04':'Prokop','07-05':'Cyril a Metoděj','07-06':'Mistr Jan Hus','07-07':'Bohuslava','07-08':'Nora','07-09':'Drahoslava','07-10':'Libuše a Amálie',
  '07-11':'Olga','07-12':'Bořek','07-13':'Markéta','07-14':'Karolína','07-15':'Jindřich','07-16':'Luboš','07-17':'Martina','07-18':'Drahomíra','07-19':'Čeněk','07-20':'Ilja',
  '07-21':'Vítězslav','07-22':'Magdaléna','07-23':'Libor','07-24':'Kristýna','07-25':'Jakub','07-26':'Anna','07-27':'Věroslav','07-28':'Viktor','07-29':'Marta','07-30':'Bořivoj','07-31':'Ignác',
  '08-01':'Oskar','08-02':'Gustav','08-03':'Miluše','08-04':'Dominik','08-05':'Kristián','08-06':'Oldřiška','08-07':'Lada','08-08':'Soběslav','08-09':'Roman','08-10':'Vavřinec',
  '08-11':'Zuzana','08-12':'Klára','08-13':'Alena','08-14':'Alan','08-15':'Hana','08-16':'Jáchym','08-17':'Petra','08-18':'Helena','08-19':'Ludvík','08-20':'Bernard',
  '08-21':'Johana','08-22':'Bohuslav','08-23':'Sandra','08-24':'Bartoloměj','08-25':'Radim','08-26':'Luděk','08-27':'Otakar','08-28':'Augustýn','08-29':'Evelína','08-30':'Vladěna','08-31':'Pavlína',
  '09-01':'Linda a Samuel','09-02':'Adéla','09-03':'Bronislav','09-04':'Jindřiška','09-05':'Boris','09-06':'Boleslav','09-07':'Regína','09-08':'Mariana','09-09':'Daniela','09-10':'Irma',
  '09-11':'Denisa','09-12':'Marie','09-13':'Lubor','09-14':'Radka','09-15':'Jolana','09-16':'Ludmila','09-17':'Naděžda','09-18':'Kryštof','09-19':'Zita','09-20':'Oleg',
  '09-21':'Matouš','09-22':'Darina','09-23':'Berta','09-24':'Jaromír','09-25':'Zlata','09-26':'Andrea','09-27':'Jonáš','09-28':'Den české státnosti','09-29':'Michal','09-30':'Jeroným',
  '10-01':'Igor','10-02':'Olívie a Oliver','10-03':'Bohumil','10-04':'František','10-05':'Eliška','10-06':'Hanuš','10-07':'Justýna','10-08':'Věra','10-09':'Štefan a Sára','10-10':'Marina',
  '10-11':'Andrej','10-12':'Marcel','10-13':'Renáta','10-14':'Agáta','10-15':'Tereza','10-16':'Havel','10-17':'Hedvika','10-18':'Lukáš','10-19':'Michaela','10-20':'Vendelín',
  '10-21':'Brigita','10-22':'Sabina','10-23':'Teodor','10-24':'Nina','10-25':'Beáta','10-26':'Erik','10-27':'Šarlota a Zoe','10-28':'Vznik samostatného Československa','10-29':'Silvie','10-30':'Tadeáš','10-31':'Štěpánka',
  '11-01':'Felix','11-02':'Památka zesnulých','11-03':'Hubert','11-04':'Karel','11-05':'Miriam','11-06':'Liběna','11-07':'Saskie','11-08':'Bohumír','11-09':'Bohdan','11-10':'Evžen',
  '11-11':'Martin','11-12':'Benedikt','11-13':'Tibor','11-14':'Sáva','11-15':'Leopold','11-16':'Otmar','11-17':'Den boje za svobodu a demokracii','11-18':'Romana','11-19':'Alžběta','11-20':'Nikola',
  '11-21':'Albert','11-22':'Cecílie','11-23':'Klement','11-24':'Emílie','11-25':'Kateřina','11-26':'Artur','11-27':'Xenie','11-28':'René','11-29':'Zina','11-30':'Ondřej',
  '12-01':'Iva','12-02':'Blanka','12-03':'Svatoslav','12-04':'Barbora','12-05':'Jitka','12-06':'Mikuláš','12-07':'Ambrož a Benjamin','12-08':'Květoslava','12-09':'Vratislav','12-10':'Julie',
  '12-11':'Dana','12-12':'Simona','12-13':'Lucie','12-14':'Lýdie','12-15':'Radana a Radan','12-16':'Albína','12-17':'Daniel','12-18':'Miloslav','12-19':'Ester','12-20':'Dagmar',
  '12-21':'Natálie','12-22':'Šimon','12-23':'Vlasta','12-24':'Adam a Eva','12-25':'Boží hod vánoční','12-26':'Štěpán','12-27':'Žaneta','12-28':'Bohumila','12-29':'Judita','12-30':'David','12-31':'Silvestr',
};

// Inverzní lookup: jméno -> MM-DD (case insensitive, první shoda)
function nameDayFor(name) {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  if (!norm) return null;
  for (const [mmdd, label] of Object.entries(NAME_DAYS)) {
    // Tokenizace svátku (např. "Petr a Pavel" -> ["petr","pavel"]); přeskočíme spojku "a"
    const tokens = label.toLowerCase().split(/[\s,]+/).filter(t => t && t !== 'a');
    if (tokens.includes(norm)) return mmdd;
  }
  return null;
}

const fmtDate = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const parseDate = (s) => { const [y,m,d] = s.split('-').map(Number); return { y, m: m-1, d }; };
const todayStr = () => { const n = new Date(); return fmtDate(n.getFullYear(), n.getMonth(), n.getDate()); };
const uid = () => Math.random().toString(36).slice(2, 10);

function daysInMonth(year, month) { return new Date(year, month+1, 0).getDate(); }
function firstDayOffset(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function getWeekNumber(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

// ============ STORAGE ============

function saveState(state) {
  try {
    const { selectedDay, modal, view, currentMonth, currentYear, activeCategoryTab, ...persist } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
  } catch (e) { /* ignore quota errors */ }
}

const FONTS = {
  display: '"Syne", system-ui, sans-serif',
  body: '"Space Grotesk", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  hand: '"Caveat", cursive',
};

// ============ MAIN APP ============

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, loadInitialState);
  const { isDesktop } = useViewport();

  useEffect(() => {
    saveState(state);
  }, [state]);

  if (isDesktop) {
    return (
      <>
        <DesktopApp state={state} dispatch={dispatch} />
        {state.modal && <Modal state={state} dispatch={dispatch} />}
      </>
    );
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: TOKENS.bgCool,
        fontFamily: FONTS.body,
        color: TOKENS.text,
        WebkitFontSmoothing: 'antialiased',
      }}>
        <div style={{
          maxWidth: '420px',
          margin: '0 auto',
          background: TOKENS.bg,
          minHeight: '100vh',
          position: 'relative',
          paddingBottom: '120px',
          borderLeft: `1px solid ${TOKENS.borderSoft}`,
          borderRight: `1px solid ${TOKENS.borderSoft}`,
        }}>
          <Header view={state.view} dispatch={dispatch} state={state} />
          {state.view === 'calendar' && <CalendarView state={state} dispatch={dispatch} />}
          {state.view === 'todo' && <TodoView state={state} dispatch={dispatch} />}
          <FAB dispatch={dispatch} />
          {state.modal && <Modal state={state} dispatch={dispatch} />}
        </div>
      </div>
    </>
  );
}

// ============ HEADER ============

function Header({ view, dispatch, state }) {
  const today = new Date();
  const todayDayName = DAYS_FULL[today.getDay()].toUpperCase();
  const todayDateLabel = `${today.getDate()}. ${MONTHS_LOWER[today.getMonth()]}`;

  return (
    <div style={{ padding: '20px 16px 12px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '18px',
      }}>
        <div>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '10px',
            letterSpacing: '0.18em',
            color: TOKENS.accent,
            fontWeight: 700,
            marginBottom: '4px',
          }}>
            {todayDayName}
          </div>
          <div style={{
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: '26px',
            letterSpacing: '-0.025em',
            lineHeight: 1,
            color: TOKENS.text,
          }}>
            {todayDateLabel}
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'settings' } })}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: TOKENS.bgSoft,
            border: `1px solid ${TOKENS.borderSoft}`,
            color: TOKENS.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Segmented nav */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        borderRadius: '999px',
        background: TOKENS.bgSoft,
        border: `1px solid ${TOKENS.borderSoft}`,
      }}>
        {[
          { id: 'calendar', label: 'Kalendář' },
          { id: 'todo', label: 'Úkoly' },
        ].map(t => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => dispatch({ type: 'SET_VIEW', view: t.id })}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: '999px',
                background: active ? TOKENS.bg : 'transparent',
                color: active ? TOKENS.text : TOKENS.textSecondary,
                fontFamily: FONTS.body,
                fontWeight: active ? 600 : 500,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: active ? '0 1px 2px rgba(26,23,20,.06), 0 2px 6px rgba(26,23,20,.04)' : 'none',
                transition: 'all 160ms cubic-bezier(.32,.72,.32,1)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ CALENDAR VIEW ============

function CalendarView({ state, dispatch }) {
  return (
    <div style={{ padding: '0 16px' }}>
      <MonthHeader state={state} dispatch={dispatch} />
      <CalendarGrid state={state} dispatch={dispatch} />
      <DayDetail state={state} dispatch={dispatch} />
    </div>
  );
}

function MonthHeader({ state, dispatch }) {
  const isCurrentMonth = state.currentMonth === new Date().getMonth() && state.currentYear === new Date().getFullYear();
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '8px 0 16px',
    }}>
      <button
        onClick={() => dispatch({ type: 'PREV_MONTH' })}
        style={{
          width: '34px', height: '34px',
          borderRadius: '999px',
          background: TOKENS.bgSoft,
          border: `1px solid ${TOKENS.borderSoft}`,
          color: TOKENS.text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronLeft size={16} />
      </button>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: FONTS.display,
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '-0.015em',
          color: TOKENS.text,
          lineHeight: 1.1,
        }}>
          {MONTHS_NOM[state.currentMonth]} {state.currentYear}
        </div>
        {!isCurrentMonth && (
          <button
            onClick={() => dispatch({ type: 'GO_TODAY' })}
            style={{
              marginTop: '4px',
              fontFamily: FONTS.mono,
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: TOKENS.accent,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            ← dnes
          </button>
        )}
      </div>
      <button
        onClick={() => dispatch({ type: 'NEXT_MONTH' })}
        style={{
          width: '34px', height: '34px',
          borderRadius: '999px',
          background: TOKENS.bgSoft,
          border: `1px solid ${TOKENS.borderSoft}`,
          color: TOKENS.text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function CalendarGrid({ state, dispatch }) {
  const { currentYear, currentMonth, tasks, categories, selectedDay } = state;
  const events = allEvents(state);
  const dim = daysInMonth(currentYear, currentMonth);
  const offset = firstDayOffset(currentYear, currentMonth);
  const today = todayStr();

  const getCategoryColor = (catId) => categories.find(c => c.id === catId)?.color || '#888';

  const getEventsForDay = (day) => {
    const dateStr = fmtDate(currentYear, currentMonth, day);
    const mmdd = `${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return eventsForDay(events, dateStr);
  };

  const cells = [];
  for (let i = 0; i < offset; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }

  for (let d = 1; d <= dim; d++) {
    const dateStr = fmtDate(currentYear, currentMonth, d);
    const dayEvents = getEventsForDay(d);
    const dayTasks = tasksForDay(tasks, dateStr);
    const isToday = dateStr === today;
    const isSelected = selectedDay === dateStr;
    const dow = new Date(currentYear, currentMonth, d).getDay();
    const isWeekend = dow === 0 || dow === 6;

    cells.push(
      <button
        key={d}
        onClick={() => dispatch({ type: 'SELECT_DAY', day: dateStr })}
        style={{
          aspectRatio: '1',
          background: isToday ? TOKENS.accent : (isSelected ? TOKENS.accentSoft : TOKENS.bg),
          border: `1px solid ${isToday ? TOKENS.accent : (isSelected ? TOKENS.accent : TOKENS.borderSoft)}`,
          borderRadius: '10px',
          padding: '5px 5px 4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          color: isToday ? '#fff' : (isWeekend ? TOKENS.textMuted : TOKENS.text),
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 160ms cubic-bezier(.32,.72,.32,1)',
        }}
      >
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '12px',
          fontWeight: isToday ? 700 : 600,
          lineHeight: 1,
          textAlign: 'left',
          fontVariantNumeric: 'tabular-nums',
          color: isToday ? '#fff' : (isSelected ? TOKENS.accent : (isWeekend ? TOKENS.textMuted : TOKENS.text)),
        }}>
          {d}
        </div>

        {/* Event bars — vodorovné čárky podle typu */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          marginTop: '4px',
          alignItems: 'flex-start',
        }}>
          {dayEvents.slice(0, 3).map(e => (
            <div key={e.id} style={{
              width: '70%',
              height: '3px',
              borderRadius: '2px',
              background: isToday ? 'rgba(255,255,255,0.85)' : EVENT_TYPES[e.type].color,
            }} />
          ))}
        </div>

        {/* Task dots — kolečka podle kategorie */}
        <div style={{
          display: 'flex',
          gap: '3px',
          marginTop: 'auto',
          flexWrap: 'wrap',
        }}>
          {dayTasks.slice(0, 4).map(t => {
            const color = getCategoryColor(t.categoryId);
            return (
              <div key={t.id} style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: t.completed ? 'transparent' : (isToday ? 'rgba(255,255,255,0.85)' : color),
                border: t.completed ? `1.2px solid ${isToday ? 'rgba(255,255,255,0.85)' : color}` : 'none',
              }} />
            );
          })}
        </div>
      </button>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        marginBottom: '6px',
      }}>
        {DAYS_SHORT.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: '9.5px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: i >= 5 ? TOKENS.textMuted : TOKENS.textSecondary,
            fontWeight: 600,
            padding: '4px 0',
          }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
      }}>
        {cells}
      </div>
    </div>
  );
}

function DayDetail({ state, dispatch }) {
  if (!state.selectedDay) return null;

  const { y, m, d } = parseDate(state.selectedDay);
  const dayEvents = eventsForDay(allEvents(state), state.selectedDay);
  const dayTasks = tasksForDay(state.tasks, state.selectedDay);
  const isToday = state.selectedDay === todayStr();
  const dayName = DAYS_FULL[new Date(y, m, d).getDay()];
  const mmdd = `${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const nameDay = NAME_DAYS[mmdd];

  return (
    <div style={{ marginTop: '24px', paddingBottom: '8px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <div>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: isToday ? TOKENS.accent : TOKENS.textMuted,
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            {isToday ? 'DNES' : dayName} {nameDay && <span style={{ color: TOKENS.textMuted }}>· svátek {nameDay}</span>}
          </div>
          <div style={{
            fontFamily: FONTS.display,
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: TOKENS.text,
            lineHeight: 1,
          }}>
            {d}. {MONTHS_LOWER[m]}
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'SELECT_DAY', day: null })}
          style={{
            background: 'transparent',
            border: 'none',
            color: TOKENS.textMuted,
            fontSize: '13px',
            cursor: 'pointer',
            padding: '4px 8px',
            fontFamily: FONTS.body,
          }}
        >
          zavřít
        </button>
      </div>

      {dayEvents.length === 0 && dayTasks.length === 0 && (
        <EmptyDay onAdd={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newEvent', data: { date: state.selectedDay } } })} />
      )}

      {dayEvents.length > 0 && (
        <SectionHeader marker="bar" label="Události" count={dayEvents.length} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {dayEvents.map(e => <EventCard key={e.id} event={e} dispatch={dispatch} />)}
      </div>

      {dayTasks.length > 0 && (
        <SectionHeader marker="dot" label="Úkoly" count={dayTasks.filter(t => !t.completed).length} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {dayTasks.map(t => <TaskCard key={t.id} task={t} categories={state.categories} dispatch={dispatch} />)}
      </div>

      {(dayEvents.length > 0 || dayTasks.length > 0) && (
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newEvent', data: { date: state.selectedDay } } })}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '11px',
            borderRadius: '12px',
            background: 'transparent',
            border: `1px dashed ${TOKENS.border}`,
            color: TOKENS.textSecondary,
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          + přidat na tento den
        </button>
      )}
    </div>
  );
}

function SectionHeader({ marker, label, count }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '10px',
      paddingBottom: '6px',
    }}>
      {marker === 'bar' ? (
        <div style={{
          width: '14px',
          height: '3px',
          borderRadius: '2px',
          background: TOKENS.text,
        }} />
      ) : (
        <div style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: TOKENS.text,
        }} />
      )}
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10.5px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 700,
        color: TOKENS.text,
      }}>
        {label}
      </div>
      {count !== undefined && (
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10.5px',
          color: TOKENS.textMuted,
          fontWeight: 500,
        }}>
          {count}
        </div>
      )}
    </div>
  );
}

function EmptyDay({ onAdd }) {
  return (
    <div style={{
      padding: '32px 20px',
      textAlign: 'center',
      background: TOKENS.bgSoft,
      borderRadius: '14px',
      border: `1px solid ${TOKENS.borderSoft}`,
      marginBottom: '8px',
    }}>
      <div style={{
        fontFamily: FONTS.hand,
        fontSize: '26px',
        color: TOKENS.accent,
        fontWeight: 600,
        lineHeight: 1.1,
        transform: 'rotate(-2deg)',
        marginBottom: '4px',
      }}>
        volný den
      </div>
      <div style={{
        fontFamily: FONTS.hand,
        fontSize: '20px',
        color: TOKENS.textSecondary,
        transform: 'rotate(1deg)',
        marginBottom: '14px',
      }}>
        užij si ho ✿
      </div>
      <button
        onClick={onAdd}
        style={{
          marginTop: '4px',
          padding: '8px 16px',
          borderRadius: '999px',
          background: TOKENS.text,
          color: TOKENS.bg,
          border: 'none',
          fontFamily: FONTS.body,
          fontWeight: 600,
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        + přidat
      </button>
    </div>
  );
}

function EventCard({ event, dispatch }) {
  const config = EVENT_TYPES[event.type];
  const Icon = event.type === 'birthday' ? Cake : event.type === 'other' ? Bug : Bell;

  return (
    <div
      onClick={() => dispatch({
        type: 'OPEN_MODAL',
        modal: event._derived
          ? { type: 'people' }
          : { type: 'editEvent', data: event }
      })}
      style={{
        display: 'flex',
        background: TOKENS.bg,
        border: `1px solid ${TOKENS.borderSoft}`,
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(26,23,20,.04), 0 2px 8px rgba(26,23,20,.04)',
      }}
    >
      <div style={{ width: '4px', background: config.color, flexShrink: 0 }} />
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{
          width: '30px', height: '30px',
          borderRadius: '8px',
          background: `${config.color}18`,
          color: config.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={15} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: '14px',
            color: TOKENS.text,
            lineHeight: 1.3,
          }}>
            {event.person}
          </div>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '10.5px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: config.color,
            fontWeight: 600,
            marginTop: '3px',
          }}>
            {event.type === 'other' && event.customLabel ? event.customLabel : config.label}
            {event.time && <span style={{ color: TOKENS.textMuted, marginLeft: '8px' }}>{event.time}</span>}
            {event.endDate && event.endDate > event.date && (() => {
              const a = parseDate(event.date);
              const b = parseDate(event.endDate);
              return (
                <span style={{ color: TOKENS.textMuted, marginLeft: '8px', textTransform: 'none' }}>
                  {a.d}.{a.m+1}. – {b.d}.{b.m+1}.
                </span>
              );
            })()}
          </div>
          {event.location && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
              fontSize: '12px',
              color: TOKENS.textSecondary,
              fontFamily: FONTS.body,
            }}>
              <MapPin size={11} strokeWidth={1.75} />
              {event.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ TO-DO VIEW (Karusel) ============

function TodoView({ state, dispatch }) {
  const activeCat = state.categories.find(c => c.id === state.activeCategoryTab) || state.categories[0];
  const today = todayStr();

  // úkoly: dnešní (scheduledDate === today nebo zone === 'today') + úkoly bez data v "later"
  const allActive = state.tasks.filter(t => !t.completed);
  const allDone = state.tasks.filter(t => t.completed);

  const tasksInCategory = allActive.filter(t => t.categoryId === activeCat.id);
  const doneInCategory = allDone.filter(t => t.categoryId === activeCat.id);

  const counts = state.categories.reduce((acc, c) => {
    acc[c.id] = allActive.filter(t => t.categoryId === c.id).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header + count */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: '14px',
        marginTop: '4px',
      }}>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: '17px',
          fontWeight: 700,
          color: TOKENS.text,
        }}>
          Dnes
        </div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '11px',
          color: TOKENS.textMuted,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {allActive.length}/{state.tasks.length}
        </div>
      </div>

      {/* Category tab strip */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        marginBottom: '18px',
        scrollbarWidth: 'none',
      }}>
        {state.categories.map(c => {
          const active = state.activeCategoryTab === c.id;
          const count = counts[c.id] || 0;
          return (
            <button
              key={c.id}
              onClick={() => dispatch({ type: 'SET_CATEGORY_TAB', id: c.id })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '999px',
                background: active ? c.color : `${c.color}15`,
                color: active ? '#fff' : c.color,
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: FONTS.body,
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 160ms cubic-bezier(.32,.72,.32,1)',
              }}
            >
              <span>{c.name}</span>
              <span style={{
                background: active ? 'rgba(255,255,255,0.22)' : 'rgba(26,23,20,0.08)',
                padding: '1px 7px',
                borderRadius: '999px',
                fontFamily: FONTS.mono,
                fontSize: '10.5px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                minWidth: '20px',
                textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active tasks list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasksInCategory.length === 0 && (
          <div style={{
            padding: '36px 20px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: TOKENS.textMuted,
              fontWeight: 500,
              lineHeight: 1.4,
            }}>
              Nic tady není.
            </div>
          </div>
        )}
        {tasksInCategory.map(t => (
          <TaskCard key={t.id} task={t} categories={state.categories} dispatch={dispatch} />
        ))}
      </div>

      {/* Done section */}
      {doneInCategory.length > 0 && (
        <>
          <div style={{
            marginTop: '24px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              flex: 1,
              borderTop: `1px dashed ${TOKENS.borderSoft}`,
            }} />
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: TOKENS.textMuted,
              fontWeight: 700,
            }}>
              Hotovo {doneInCategory.length}
            </div>
            <div style={{
              flex: 1,
              borderTop: `1px dashed ${TOKENS.borderSoft}`,
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.6 }}>
            {doneInCategory.map(t => (
              <TaskCard key={t.id} task={t} categories={state.categories} dispatch={dispatch} />
            ))}
          </div>
        </>
      )}

      {/* All-categories combined empty */}
      {state.tasks.length === 0 && (
        <div style={{
          padding: '20px',
          marginTop: '20px',
          textAlign: 'center',
          fontFamily: FONTS.body,
          fontSize: '13.5px',
          color: TOKENS.textMuted,
          fontWeight: 500,
        }}>
          Zatím tu nic není — přidej první úkol tlačítkem dole.
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, categories, dispatch }) {
  const cat = categories.find(c => c.id === task.categoryId) || categories[0];

  return (
    <div style={{
      display: 'flex',
      background: TOKENS.bg,
      border: `1px solid ${TOKENS.borderSoft}`,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(26,23,20,.04), 0 2px 8px rgba(26,23,20,.04)',
    }}>
      <div style={{ width: '4px', background: cat.color, flexShrink: 0 }} />
      <div style={{
        padding: '12px 14px',
        flex: 1,
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_TASK', id: task.id }); }}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            border: `1.6px solid ${task.completed ? cat.color : `color-mix(in oklch, ${cat.color} 35%, ${TOKENS.border})`}`,
            background: task.completed ? cat.color : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          aria-label={task.completed ? 'označit jako nesplněné' : 'označit jako hotové'}
        >
          {task.completed && <Check size={13} strokeWidth={3} />}
        </button>

        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'editTask', data: task } })}
        >
          <div style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: '14px',
            color: TOKENS.text,
            lineHeight: 1.35,
            textDecoration: task.completed ? 'line-through' : 'none',
          }}>
            {task.title}
          </div>
          {(task.time || task.scheduledDate || task.notification) && (
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '4px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              {task.time && (
                <div style={{
                  fontFamily: FONTS.mono,
                  fontSize: '11px',
                  color: cat.color,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ⏱ {task.time}
                </div>
              )}
              {task.scheduledDate && (
                <div style={{
                  fontFamily: FONTS.mono,
                  fontSize: '10.5px',
                  color: TOKENS.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <Pin size={9} strokeWidth={2} />
                  {formatShortDate(task.scheduledDate)}
                </div>
              )}
              {task.notification && (
                <Bell size={10} strokeWidth={2} color={TOKENS.textMuted} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ FAB ============

function FAB({ dispatch }) {
  const [open, setOpen] = useState(false);

  const opts = [
    { label: 'Úkol', color: TOKENS.text, type: 'newTask' },
    { label: 'Schůzka', color: EVENT_TYPES.appointment.color, type: 'newEvent', subtype: 'appointment' },
    { label: 'Narozeniny / svátek', color: EVENT_TYPES.birthday.color, type: 'newEvent', subtype: 'birthday' },
    { label: 'Ostatní', color: EVENT_TYPES.other.color, type: 'newEvent', subtype: 'other' },
  ];

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,23,20,0.25)',
            zIndex: 39,
          }}
        />
      )}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: 'max(20px, calc(50vw - 210px + 20px))',
        zIndex: 40,
      }}>
        {open && (
          <div style={{
            position: 'absolute',
            bottom: '68px',
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end',
          }}>
            {opts.map((o, i) => (
              <button
                key={o.label}
                onClick={() => {
                  setOpen(false);
                  dispatch({
                    type: 'OPEN_MODAL',
                    modal: {
                      type: o.type,
                      data: o.subtype ? { eventType: o.subtype } : {},
                    },
                  });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px 10px 14px',
                  borderRadius: '999px',
                  background: TOKENS.bg,
                  border: `1px solid ${TOKENS.borderSoft}`,
                  color: TOKENS.text,
                  fontFamily: FONTS.body,
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(26,23,20,.10)',
                  animation: `fabFadeUp 200ms cubic-bezier(.34,1.56,.64,1) ${i * 40}ms both`,
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: o.subtype ? '2px' : '50%',
                  background: o.color,
                }} />
                {o.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '56px',
            height: '56px',
            // Soft asymmetric "crafted" FAB shape
            borderRadius: '45% 55% 50% 50% / 50% 45% 55% 50%',
            background: TOKENS.accent,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(122,24,64,.28), 0 2px 6px rgba(122,24,64,.20)',
            transition: 'transform 240ms cubic-bezier(.34,1.56,.64,1)',
            transform: open ? 'rotate(45deg)' : 'rotate(0)',
          }}
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>
      <style>{`
        @keyframes fabFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ============ MODAL ============

const NOTIF_OPTIONS = [
  { id: 'none', label: 'žádné' },
  { id: '1d', label: '1 den předem' },
  { id: '1h', label: '1 hodinu předem' },
  { id: '15m', label: '15 minut předem' },
  { id: 'cascade', label: 'všechny (1d → 1h → 15m)' },
];

function Modal({ state, dispatch }) {
  const { modal } = state;
  const close = () => dispatch({ type: 'CLOSE_MODAL' });

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,23,20,0.45)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: TOKENS.bg,
          borderRadius: '18px 18px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 -4px 24px rgba(26,23,20,.10)',
          animation: 'sheetUp 240ms cubic-bezier(.32,.72,.32,1)',
        }}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          background: TOKENS.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${TOKENS.borderSoft}`,
          zIndex: 1,
        }}>
          {/* drag handle */}
          <div style={{
            position: 'absolute',
            top: '7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            background: TOKENS.border,
          }} />
          <div style={{
            fontFamily: FONTS.display,
            fontSize: '20px',
            fontWeight: 800,
            color: TOKENS.text,
            letterSpacing: '-0.015em',
            marginTop: '8px',
          }}>
            {modalTitle(modal)}
          </div>
          <button onClick={close} style={{
            background: 'transparent',
            border: 'none',
            color: TOKENS.textSecondary,
            cursor: 'pointer',
            padding: '4px',
            marginTop: '8px',
          }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '18px 20px 28px' }}>
          {modal.type === 'newTask' && <TaskForm state={state} dispatch={dispatch} onClose={close} initial={modal.data} />}
          {modal.type === 'editTask' && <TaskForm state={state} dispatch={dispatch} onClose={close} task={modal.data} />}
          {modal.type === 'newEvent' && <EventForm state={state} dispatch={dispatch} onClose={close} initialType={modal.data?.eventType || modal.data?.type} initialDate={modal.data?.date} />}
          {modal.type === 'editEvent' && <EventForm state={state} dispatch={dispatch} onClose={close} event={modal.data} />}
          {modal.type === 'editCategory' && <CategoryForm state={state} dispatch={dispatch} onClose={close} category={modal.data} />}
          {modal.type === 'settings' && <SettingsForm state={state} dispatch={dispatch} onClose={close} />}
          {modal.type === 'dayDetail' && <DayDetailModal state={state} dispatch={dispatch} onClose={close} day={modal.data?.day} />}
          {modal.type === 'people' && <PeopleList state={state} dispatch={dispatch} onClose={close} />}
        </div>
      </div>
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function modalTitle(modal) {
  if (modal.type === 'dayDetail' && modal.data?.day) {
    const { y, m, d } = parseDate(modal.data.day);
    return `${d}. ${MONTHS_LOWER[m]} ${y}`;
  }
  return {
    newTask: 'Nový úkol',
    editTask: 'Upravit úkol',
    newEvent: 'Nová událost',
    editEvent: 'Upravit událost',
    editCategory: 'Kategorie',
    settings: 'Nastavení',
    people: 'Známí a svátky',
  }[modal.type] || '';
}

// ============ FORMS ============

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  background: TOKENS.bgSoft,
  border: `1px solid ${TOKENS.border}`,
  fontFamily: FONTS.body,
  fontSize: '14px',
  color: TOKENS.text,
  outline: 'none',
  boxSizing: 'border-box',
};

function TaskForm({ state, dispatch, onClose, task, initial }) {
  const [title, setTitle] = useState(task?.title || '');
  const [categoryId, setCategoryId] = useState(task?.categoryId || initial?.categoryId || state.activeCategoryTab || state.categories[0].id);
  const [scheduledDate, setScheduledDate] = useState(task?.scheduledDate || initial?.scheduledDate || '');
  const [time, setTime] = useState(task?.time || '');
  const [notification, setNotification] = useState(task?.notification || 'none');

  const save = () => {
    if (!title.trim()) return;
    const data = {
      id: task?.id || uid(),
      title: title.trim(),
      categoryId,
      scheduledDate: scheduledDate || null,
      time: time || null,
      notification: notification === 'none' ? null : notification,
      completed: task?.completed || false,
    };
    dispatch({ type: task ? 'UPDATE_TASK' : 'ADD_TASK', task: data });
    onClose();
  };

  const del = () => {
    dispatch({ type: 'DELETE_TASK', id: task.id });
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Field label="Co je třeba udělat?">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="např. Dokončit smlouvu"
          style={inputStyle}
        />
      </Field>

      <Field label="Kategorie">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {state.categories.map(c => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: active ? `${c.color}15` : TOKENS.bgSoft,
                  border: `1.5px solid ${active ? c.color : TOKENS.borderSoft}`,
                  cursor: 'pointer',
                  fontFamily: FONTS.body,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: TOKENS.text,
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: c.color,
                }} />
                {c.name}
              </button>
            );
          })}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field label="Datum (volitelné)">
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Čas">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Upozornění">
        <NotificationPicker value={notification} onChange={setNotification} />
      </Field>

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        {task && (
          <button
            onClick={del}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: TOKENS.bgSoft,
              color: EVENT_TYPES.other.color,
              border: `1px solid ${TOKENS.border}`,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          onClick={save}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: TOKENS.accent,
            color: '#fff',
            border: 'none',
            fontFamily: FONTS.body,
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(122,24,64,.22)',
          }}
        >
          {task ? 'Uložit' : 'Přidat úkol'}
        </button>
      </div>
    </div>
  );
}

function EventForm({ state, dispatch, onClose, event, initialType, initialDate }) {
  const [type, setType] = useState(event?.type || initialType || 'appointment');
  const [date, setDate] = useState(event?.date || initialDate || todayStr());
  const [endDate, setEndDate] = useState(event?.endDate || '');
  const [time, setTime] = useState(event?.time || '');
  const [person, setPerson] = useState(event?.person || '');
  const [location, setLocation] = useState(event?.location || '');
  const [customLabel, setCustomLabel] = useState(event?.customLabel || '');
  const [notification, setNotification] = useState(event?.notification || 'none');

  const subtypes = state?.eventSubtypes || EVENT_SUBTYPES_DEFAULT;
  // Datum-od-do dává smysl pro Schůzku (krátká cesta) i Ostatní (prázdniny apod.), ne pro narozeniny.
  const supportsRange = type !== 'birthday';

  const save = () => {
    if (!person.trim()) return;
    const cl = type === 'other' ? customLabel.trim() : '';
    const cleanEnd = supportsRange && endDate && endDate > date ? endDate : null;
    const data = {
      id: event?.id || uid(),
      type,
      date,
      endDate: cleanEnd,
      time: type === 'appointment' && time ? time : null,
      person: person.trim(),
      location: type === 'appointment' ? (location.trim() || null) : null,
      customLabel: cl || null,
      notification: notification === 'none' ? null : notification,
    };
    if (type === 'other' && cl) {
      dispatch({ type: 'ADD_EVENT_SUBTYPE', label: cl });
    }
    dispatch({ type: event ? 'UPDATE_EVENT' : 'ADD_EVENT', event: data });
    onClose();
  };

  const del = () => {
    dispatch({ type: 'DELETE_EVENT', id: event.id });
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Field label="Typ události">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(EVENT_TYPES).map(([id, cfg]) => {
            const active = type === id;
            return (
              <button
                key={id}
                onClick={() => setType(id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 8px',
                  borderRadius: '10px',
                  background: active ? `${cfg.color}15` : TOKENS.bgSoft,
                  border: `1.5px solid ${active ? cfg.color : TOKENS.borderSoft}`,
                  cursor: 'pointer',
                  fontFamily: FONTS.body,
                }}
              >
                <div style={{
                  width: '20px',
                  height: '3px',
                  borderRadius: '2px',
                  background: cfg.color,
                }} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: active ? cfg.color : TOKENS.textSecondary,
                  letterSpacing: '0.04em',
                }}>
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {type === 'other' && (
        <Field label="Název (např. Klíště)">
          <input
            list="event-subtypes"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="vlastní název události"
            style={inputStyle}
          />
          <datalist id="event-subtypes">
            {subtypes.map(s => <option key={s} value={s} />)}
          </datalist>
        </Field>
      )}

      <Field label={type === 'other' ? 'Koho se týká' : 'Jméno / co'}>
        <input
          autoFocus
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          placeholder={type === 'birthday' ? 'Jméno oslavence' : type === 'other' ? 'Jméno osoby' : 'Jméno nebo název'}
          style={inputStyle}
        />
      </Field>

      <div style={type === 'appointment' ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } : {}}>
        <Field label={supportsRange ? 'Datum od' : 'Datum'}>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (endDate && e.target.value > endDate) setEndDate('');
            }}
            style={inputStyle}
          />
        </Field>
        {type === 'appointment' && (
          <Field label="Čas">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={inputStyle}
            />
          </Field>
        )}
      </div>

      {supportsRange && (
        <Field label="Datum do (volitelné — pro vícedenní událost)">
          <input
            type="date"
            value={endDate}
            min={date}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      {type === 'appointment' && (
        <Field label="Místo">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="např. kavárna Onesip"
            style={inputStyle}
          />
        </Field>
      )}

      <Field label="Upozornění">
        <NotificationPicker value={notification} onChange={setNotification} />
      </Field>

      {type === 'birthday' && (
        <div style={{
          padding: '10px 12px',
          background: `${EVENT_TYPES.birthday.color}10`,
          border: `1px solid ${EVENT_TYPES.birthday.color}30`,
          borderRadius: '10px',
          fontSize: '12px',
          color: TOKENS.textSecondary,
          fontFamily: FONTS.body,
        }}>
          Narozeniny se opakují každý rok.
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        {event && (
          <button
            onClick={del}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: TOKENS.bgSoft,
              color: EVENT_TYPES.other.color,
              border: `1px solid ${TOKENS.border}`,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          onClick={save}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: TOKENS.accent,
            color: '#fff',
            border: 'none',
            fontFamily: FONTS.body,
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(122,24,64,.22)',
          }}
        >
          {event ? 'Uložit' : 'Přidat'}
        </button>
      </div>
    </div>
  );
}

function DayDetailModal({ state, dispatch, onClose, day }) {
  const { y, m, d } = parseDate(day);
  const dateObj = new Date(y, m, d);
  const mmdd = day.slice(5);
  const events = eventsForDay(allEvents(state), day);
  const tasks = tasksForDay(state.tasks, day);
  const note = (state.notes && state.notes[day]) || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: TOKENS.textSecondary,
        marginTop: '-4px',
      }}>
        {DAYS_FULL[dateObj.getDay()]}
      </div>

      <div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: TOKENS.textMuted,
          fontWeight: 700,
          marginBottom: '8px',
        }}>UDÁLOSTI ({events.length})</div>
        {events.length === 0 && (
          <div style={{
            padding: '12px',
            fontFamily: FONTS.body,
            fontSize: '13px',
            color: TOKENS.textMuted,
            background: TOKENS.bgSoft,
            borderRadius: '10px',
          }}>Žádné události.</div>
        )}
        {events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.map(e => <EventCard key={e.id} event={e} dispatch={dispatch} />)}
          </div>
        )}
      </div>

      <div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: TOKENS.textMuted,
          fontWeight: 700,
          marginBottom: '8px',
        }}>ÚKOLY ({tasks.length})</div>
        {tasks.length === 0 && (
          <div style={{
            padding: '12px',
            fontFamily: FONTS.body,
            fontSize: '13px',
            color: TOKENS.textMuted,
            background: TOKENS.bgSoft,
            borderRadius: '10px',
          }}>Žádné úkoly.</div>
        )}
        {tasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map(t => <TaskCard key={t.id} task={t} categories={state.categories} dispatch={dispatch} />)}
          </div>
        )}
      </div>

      <div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: TOKENS.textMuted,
          fontWeight: 700,
          marginBottom: '6px',
        }}>POZNÁMKA</div>
        <textarea
          value={note}
          onChange={(e) => dispatch({ type: 'SET_NOTE', day, text: e.target.value })}
          placeholder="napiš poznámku k tomuto dni…"
          rows={3}
          style={{ ...inputStyle, fontFamily: FONTS.hand, fontSize: '18px', color: TOKENS.accentStrong, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newTask', data: { scheduledDate: day } } })}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: TOKENS.bgSoft,
            color: TOKENS.text,
            border: `1px solid ${TOKENS.border}`,
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Plus size={14} /> Úkol
        </button>
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newEvent', data: { date: day } } })}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: TOKENS.accent,
            color: '#fff',
            border: 'none',
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(122,24,64,.22)',
          }}
        >
          <Plus size={14} /> Událost
        </button>
      </div>
    </div>
  );
}

// Odvozené události z narozenin lidí — automaticky se zobrazí v kalendáři.
// Pokud má víc lidí stejné křestní jméno (a obě mají narozeniny), přidá se k jménu i příjmení.
function getPeopleBirthdayEvents(people) {
  const list = (people || []).filter(p => p.birthday);
  const firstNameCounts = {};
  list.forEach(p => {
    const k = (p.name || '').trim().toLowerCase();
    firstNameCounts[k] = (firstNameCounts[k] || 0) + 1;
  });
  return list.map(p => {
    const k = (p.name || '').trim().toLowerCase();
    const showSurname = firstNameCounts[k] > 1 && p.surname && p.surname.trim();
    return {
      id: `person-bday-${p.id}`,
      type: 'birthday',
      date: p.birthday,
      person: showSurname ? `${p.name} ${p.surname}` : p.name,
      _derived: true,
      _personId: p.id,
    };
  });
}

// Sjednocený seznam událostí (uživatelské + odvozené z narozenin lidí)
function allEvents(state) {
  return [...(state.events || []), ...getPeopleBirthdayEvents(state.people)];
}

// Úkoly pro daný den: s daným scheduledDate; navíc pokud je dateStr DNES, vrátí i úkoly bez data.
function tasksForDay(tasks, dateStr) {
  const isToday = dateStr === todayStr();
  return (tasks || []).filter(t =>
    t.scheduledDate === dateStr || (isToday && !t.scheduledDate)
  );
}

// Události pro daný den — pokrývá: jednodenní (date === dateStr),
// vícedenní (date <= dateStr <= endDate), narozeniny (opakující se podle MM-DD).
function eventMatchesDay(e, dateStr) {
  if (!e || !e.date) return false;
  const mmdd = dateStr.slice(5);
  if (e.type === 'birthday') return e.date.slice(5) === mmdd;
  if (e.endDate && e.endDate >= e.date) {
    return dateStr >= e.date && dateStr <= e.endDate;
  }
  return e.date === dateStr;
}
function eventsForDay(eventsList, dateStr) {
  return (eventsList || []).filter(e => eventMatchesDay(e, dateStr));
}

// Parsuje uživatelský zápis "DD.MM" / "D.M" / "DD.MM." na interní 'MM-DD'
function parseDdMm(input) {
  if (!input) return null;
  const m = input.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.?$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
  return `${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function fmtDdMm(mmdd) {
  if (!mmdd) return '—';
  const m = parseInt(mmdd.slice(0,2), 10);
  const d = parseInt(mmdd.slice(3), 10);
  return `${d}. ${MONTHS_LOWER[m - 1]}`;
}

function PeopleList({ state, dispatch, onClose }) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [customNameDay, setCustomNameDay] = useState('');

  const detected = nameDayFor(name);
  const detectedLabel = detected ? fmtDdMm(detected) : null;
  const people = (state.people || []).slice().sort((a,b) =>
    (a.name + ' ' + (a.surname || '')).localeCompare(b.name + ' ' + (b.surname || ''), 'cs')
  );

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const nd = detected || parseDdMm(customNameDay) || null;
    const person = {
      id: uid(),
      name: n,
      surname: surname.trim() || null,
      nameDay: nd, // 'MM-DD' or null
      birthday: birthday || null, // 'YYYY-MM-DD' or null
    };
    dispatch({ type: 'ADD_PERSON', person });
    setName(''); setSurname(''); setBirthday(''); setCustomNameDay('');
  };

  const remove = (id) => {
    dispatch({ type: 'DELETE_PERSON', id });
  };

  const updateField = (person, field, value) => {
    dispatch({ type: 'UPDATE_PERSON', person: { ...person, [field]: value || null } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '12.5px', color: TOKENS.textSecondary, fontFamily: FONTS.body, marginTop: '-4px' }}>
        Napiš jméno — datum svátku se doplní automaticky podle českého kalendáře. Narozeniny jsou nepovinné.
      </div>

      {/* Nový záznam */}
      <div style={{
        padding: '12px',
        border: `1px solid ${TOKENS.borderSoft}`,
        borderRadius: '10px',
        background: TOKENS.bgSoft,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Field label="Jméno">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Petr"
              style={inputStyle}
            />
          </Field>
          <Field label="Příjmení (volitelné)">
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="např. Novák"
              style={inputStyle}
            />
          </Field>
        </div>
        {name.trim() && (
          <div style={{ marginTop: '-4px', fontSize: '11.5px', fontFamily: FONTS.body, color: detected ? TOKENS.accent : TOKENS.textMuted }}>
            {detected ? `Svátek: ${detectedLabel}` : 'Svátek se nenašel — můžeš zadat datum ručně níže.'}
          </div>
        )}

        {name.trim() && !detected && (
          <Field label="Svátek (datum, formát DD.MM)">
            <input
              type="text"
              inputMode="numeric"
              value={customNameDay}
              onChange={(e) => setCustomNameDay(e.target.value)}
              placeholder="např. 22.5"
              style={inputStyle}
            />
          </Field>
        )}

        <Field label="Narozeniny (volitelné)">
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <button
          onClick={add}
          disabled={!name.trim()}
          style={{
            padding: '10px',
            borderRadius: '10px',
            background: name.trim() ? TOKENS.accent : TOKENS.bgSoft,
            color: name.trim() ? '#fff' : TOKENS.textMuted,
            border: 'none',
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: '13px',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: name.trim() ? '0 2px 6px rgba(122,24,64,.22)' : 'none',
          }}
        >
          <Plus size={14} /> Přidat
        </button>
      </div>

      {/* Tabulka */}
      <div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: TOKENS.textMuted,
          fontWeight: 700,
          marginBottom: '8px',
        }}>SEZNAM ({people.length})</div>

        {people.length === 0 ? (
          <div style={{
            padding: '20px 12px',
            textAlign: 'center',
            fontFamily: FONTS.body,
            fontSize: '12.5px',
            color: TOKENS.textMuted,
            background: TOKENS.bgSoft,
            borderRadius: '10px',
          }}>
            Zatím tu nikdo není.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 28px',
              gap: '8px',
              padding: '4px 6px',
              fontFamily: FONTS.mono,
              fontSize: '9.5px',
              letterSpacing: '0.12em',
              color: TOKENS.textMuted,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              <div>Jméno</div>
              <div>Svátek</div>
              <div>Narozeniny</div>
              <div />
            </div>
            {people.map(p => (
              <div key={p.id} style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 28px',
                gap: '8px',
                alignItems: 'center',
                padding: '6px 6px',
                border: `1px solid ${TOKENS.borderSoft}`,
                borderRadius: '8px',
                background: TOKENS.bg,
              }}>
                <div style={{
                  fontFamily: FONTS.body,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: TOKENS.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {p.name}
                  {p.surname && <span style={{ color: TOKENS.textSecondary, fontWeight: 500 }}> {p.surname}</span>}
                </div>
                <div style={{
                  fontFamily: FONTS.body,
                  fontSize: '12.5px',
                  color: p.nameDay ? TOKENS.text : TOKENS.textMuted,
                }}>{fmtDdMm(p.nameDay)}</div>
                <input
                  type="date"
                  value={p.birthday || ''}
                  onChange={(e) => updateField(p, 'birthday', e.target.value)}
                  style={{
                    ...inputStyle,
                    padding: '4px 6px',
                    fontSize: '12px',
                    minHeight: 0,
                  }}
                />
                <button
                  onClick={() => remove(p.id)}
                  title="Smazat"
                  style={{
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    background: 'transparent',
                    border: `1px solid ${TOKENS.borderSoft}`,
                    borderRadius: '6px',
                    color: TOKENS.textSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryForm({ state, dispatch, onClose, category }) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);

  const PALETTE = [
    '#1E6F95', '#D26B47', '#5C8C5A', '#6F5483',
    '#7A1840', '#4A506D', '#D9A335', '#C44A30',
    '#2B8C7A', '#B83066', '#C8932C', '#3B6E8C',
  ];

  const save = () => {
    if (!name.trim()) return;
    dispatch({ type: 'UPDATE_CATEGORY', category: { ...category, name: name.trim(), color } });
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Field label="Název kategorie">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label="Barva">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                aspectRatio: '1',
                background: c,
                borderRadius: '10px',
                border: color === c ? `3px solid ${TOKENS.text}` : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 160ms cubic-bezier(.32,.72,.32,1)',
              }}
            />
          ))}
        </div>
      </Field>
      <button
        onClick={save}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          background: TOKENS.accent,
          color: '#fff',
          border: 'none',
          fontFamily: FONTS.body,
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(122,24,64,.22)',
        }}
      >
        Uložit
      </button>
    </div>
  );
}

function SettingsForm({ state, dispatch, onClose }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10.5px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: TOKENS.textMuted,
        fontWeight: 700,
        marginBottom: '4px',
      }}>
        Kategorie úkolů
      </div>
      {state.categories.map(c => (
        <button
          key={c.id}
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'editCategory', data: c } })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: TOKENS.bgSoft,
            border: `1px solid ${TOKENS.borderSoft}`,
            cursor: 'pointer',
            fontFamily: FONTS.body,
          }}
        >
          <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: c.color }} />
          <span style={{ color: TOKENS.text, fontWeight: 600, fontSize: '14px', flex: 1, textAlign: 'left' }}>{c.name}</span>
          <span style={{ color: TOKENS.textMuted, fontSize: '12px' }}>upravit →</span>
        </button>
      ))}
      <div style={{
        marginTop: '16px',
        padding: '14px',
        background: TOKENS.accentSoft,
        borderRadius: '12px',
        fontFamily: FONTS.body,
        fontSize: '12.5px',
        color: TOKENS.textSecondary,
        lineHeight: 1.55,
      }}>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: TOKENS.accent,
          fontWeight: 700,
          marginBottom: '4px',
        }}>TIP</div>
        Úkoly můžete připnout na konkrétní den kalendáře — otevřete úkol a nastavte datum. Objeví se jako barevné kolečko v buňce.
      </div>
    </div>
  );
}

// ============ SHARED ============

function Field({ label, children }) {
  return (
    <div>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: TOKENS.textSecondary,
        fontWeight: 700,
        marginBottom: '7px',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function NotificationPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {NOTIF_OPTIONS.map(o => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '10px',
              background: active ? TOKENS.text : TOKENS.bgSoft,
              color: active ? TOKENS.bg : TOKENS.text,
              border: `1px solid ${active ? TOKENS.text : TOKENS.borderSoft}`,
              fontFamily: FONTS.body,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Bell size={13} strokeWidth={1.75} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function formatShortDate(dateStr) {
  const { d, m } = parseDate(dateStr);
  return `${d}.${m+1}.`;
}

// ============================================================
// =================== DESKTOP APP ============================
// ============================================================

function DesktopApp({ state, dispatch }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: TOKENS.bgCool,
      padding: '24px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      fontFamily: FONTS.body,
      color: TOKENS.text,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1480px',
        minHeight: '920px',
        background: TOKENS.bg,
        borderRadius: '18px',
        border: `1px solid ${TOKENS.borderSoft}`,
        boxShadow: '0 1px 2px rgba(26,23,20,.04), 0 8px 32px rgba(26,23,20,.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <DesktopHeader state={state} dispatch={dispatch} />
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '252px 1fr 326px',
          minHeight: 0,
        }}>
          <DesktopSidebar state={state} dispatch={dispatch} />
          <DesktopMain state={state} dispatch={dispatch} />
          <DesktopDayRail state={state} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}

// ============ DESKTOP HEADER ============

function DesktopHeader({ state, dispatch }) {
  return (
    <div style={{
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      padding: '0 20px',
      borderBottom: `1px solid ${TOKENS.borderSoft}`,
      flexShrink: 0,
    }}>
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          fontFamily: FONTS.display,
          fontSize: '19px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: TOKENS.text,
        }}>
          Organizér
        </div>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: TOKENS.accent,
        }} />
      </div>

      <div style={{ width: '1px', height: '24px', background: TOKENS.borderSoft }} />

      {/* Segmented view toggle */}
      <div style={{
        display: 'flex',
        gap: '2px',
        padding: '3px',
        borderRadius: '999px',
        background: TOKENS.bgSoft,
        border: `1px solid ${TOKENS.borderSoft}`,
      }}>
        {[
          { id: 'calendar', label: 'Kalendář' },
          { id: 'todo', label: 'Úkoly' },
        ].map(t => {
          const active = state.view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => dispatch({ type: 'SET_VIEW', view: t.id })}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: active ? TOKENS.bg : 'transparent',
                color: active ? TOKENS.text : TOKENS.textSecondary,
                fontFamily: FONTS.body,
                fontSize: '12.5px',
                fontWeight: active ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
                boxShadow: active ? '0 1px 2px rgba(26,23,20,.06)' : 'none',
                transition: 'all 160ms cubic-bezier(.32,.72,.32,1)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Month label (only in calendar view) */}
      {state.view === 'calendar' && (
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '11px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: TOKENS.textSecondary,
          fontWeight: 600,
        }}>
          {MONTHS_NOM[state.currentMonth].toUpperCase()} {state.currentYear}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 12px',
        borderRadius: '10px',
        background: TOKENS.bgSoft,
        border: `1px solid ${TOKENS.borderSoft}`,
        minWidth: '260px',
      }}>
        <Search size={14} strokeWidth={1.75} color={TOKENS.textMuted} />
        <span style={{
          flex: 1,
          fontFamily: FONTS.body,
          fontSize: '13px',
          color: TOKENS.textMuted,
        }}>
          Hledat v kalendáři…
        </span>
        <span style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: TOKENS.bg,
          border: `1px solid ${TOKENS.borderSoft}`,
          color: TOKENS.textMuted,
          fontWeight: 600,
        }}>
          ⌘K
        </span>
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: state.view === 'todo' ? 'newTask' : 'newEvent', data: {} } })}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '999px',
          background: TOKENS.accent,
          color: '#fff',
          border: 'none',
          fontFamily: FONTS.body,
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(122,24,64,.22), inset 0 1px 0 rgba(255,255,255,.15)',
          transition: 'all 160ms cubic-bezier(.32,.72,.32,1)',
        }}
      >
        <Plus size={14} strokeWidth={2.5} />
        Nový záznam
      </button>
    </div>
  );
}

// ============ DESKTOP SIDEBAR ============

function DesktopSidebar({ state, dispatch }) {
  const today = new Date();
  const isCurrentMonth = state.currentMonth === today.getMonth() && state.currentYear === today.getFullYear();
  const todayMmdd = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const nameDay = NAME_DAYS[todayMmdd];
  const weekNum = getWeekNumber(today);

  return (
    <div style={{
      borderRight: `1px solid ${TOKENS.borderSoft}`,
      padding: '20px 18px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* BrandBlock */}
      <div style={{
        background: TOKENS.bg,
        border: `1px solid ${TOKENS.borderSoft}`,
        borderRadius: '14px',
        padding: '18px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative chevron in corner */}
        <svg width="48" height="48" style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          opacity: 0.18,
        }} viewBox="0 0 48 48" fill="none">
          <path d="M8 40 L24 16 L40 40" stroke={TOKENS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: TOKENS.textMuted,
          fontWeight: 700,
          marginBottom: '6px',
        }}>
          DNES JE
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: '4px',
        }}>
          <div style={{
            fontFamily: FONTS.display,
            fontSize: '46px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: TOKENS.text,
            lineHeight: 0.95,
          }}>
            {today.getDate()}.
          </div>
          <div style={{
            fontFamily: FONTS.display,
            fontSize: '16px',
            fontWeight: 700,
            color: TOKENS.text,
            letterSpacing: '-0.015em',
          }}>
            {MONTHS_LOWER[today.getMonth()]}
          </div>
        </div>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: '12px',
          fontWeight: 500,
          color: TOKENS.textSecondary,
        }}>
          {DAYS_FULL[today.getDay()]} · Týden {weekNum}
        </div>

        {nameDay && (
          <>
            <div style={{
              height: '1px',
              borderTop: `1px dashed ${TOKENS.border}`,
              margin: '12px 0 10px',
            }} />
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'people' } })}
              title="Otevřít seznam známých a svátků"
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontFamily: FONTS.mono,
                fontSize: '9.5px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: TOKENS.textMuted,
                fontWeight: 700,
              }}>
                SVÁTEK:
              </span>
              <span style={{
                fontFamily: FONTS.hand,
                fontSize: '22px',
                color: TOKENS.accent,
                fontWeight: 600,
                lineHeight: 1,
              }}>
                {nameDay}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Mini month */}
      <MiniMonth state={state} dispatch={dispatch} />

      {/* Nav */}
      <div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '9.5px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: TOKENS.textMuted,
          fontWeight: 700,
          marginBottom: '8px',
        }}>
          POHLED
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { id: 'calendar', label: 'Kalendář', icon: CalIcon },
            { id: 'todo', label: 'Úkoly', icon: ListTodo },
          ].map(item => {
            const active = state.view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: active ? TOKENS.accentSoft : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: FONTS.body,
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  color: active ? TOKENS.accent : TOKENS.text,
                  textAlign: 'left',
                  transition: 'all 160ms cubic-bezier(.32,.72,.32,1)',
                }}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '9.5px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TOKENS.textMuted,
            fontWeight: 700,
          }}>
            KATEGORIE
          </div>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '9px',
            color: TOKENS.textMuted,
            fontWeight: 500,
            display: 'flex',
            gap: '8px',
          }}>
            <span>● otevř.</span>
            <span>○ hotový</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {state.categories.map(c => (
            <button
              key={c.id}
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'editCategory', data: c } })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: FONTS.body,
                fontSize: '12.5px',
                fontWeight: 500,
                color: TOKENS.text,
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: c.color,
              }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Event types filter */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '9.5px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TOKENS.textMuted,
            fontWeight: 700,
          }}>
            UDÁLOSTI
          </div>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '9px',
            color: TOKENS.textMuted,
            fontWeight: 500,
          }}>
            — typ
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(EVENT_TYPES).map(([id, cfg]) => (
            <div key={id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 8px',
              fontFamily: FONTS.body,
              fontSize: '12.5px',
              fontWeight: 500,
              color: TOKENS.text,
            }}>
              <div style={{
                width: '14px',
                height: '3px',
                borderRadius: '2px',
                background: cfg.color,
              }} />
              {cfg.label}
            </div>
          ))}
        </div>
      </div>

      {/* HandNote — editable per day */}
      <EditableNote state={state} dispatch={dispatch} />
    </div>
  );
}

function EditableNote({ state, dispatch }) {
  const noteDay = state.selectedDay || todayStr();
  const value = (state.notes && state.notes[noteDay]) || '';
  const { y, m, d } = parseDate(noteDay);
  const isToday = noteDay === todayStr();
  const label = isToday ? 'POZNÁMKA · DNES' : `POZNÁMKA · ${d}. ${MONTHS_LOWER[m].toUpperCase()}`;

  return (
    <div style={{
      marginTop: 'auto',
      position: 'relative',
      padding: '14px 14px 12px 14px',
      border: `1px dashed ${TOKENS.accent}40`,
      borderRadius: '10px',
      background: `${TOKENS.accent}06`,
    }}>
      <div style={{
        position: 'absolute',
        top: '-9px',
        left: '12px',
        background: TOKENS.bg,
        padding: '0 6px',
        fontFamily: FONTS.mono,
        fontSize: '9px',
        letterSpacing: '0.14em',
        color: TOKENS.accent,
        fontWeight: 700,
      }}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => dispatch({ type: 'SET_NOTE', day: noteDay, text: e.target.value })}
        placeholder="napiš poznámku k tomuto dni…"
        rows={3}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'vertical',
          fontFamily: FONTS.hand,
          fontSize: '18px',
          fontWeight: 600,
          color: TOKENS.accentStrong,
          lineHeight: 1.2,
          minHeight: '50px',
        }}
      />
    </div>
  );
}

// ============ MINI MONTH ============

function MiniMonth({ state, dispatch }) {
  const { currentYear, currentMonth, tasks, selectedDay } = state;
  const events = allEvents(state);
  const dim = daysInMonth(currentYear, currentMonth);
  const offset = firstDayOffset(currentYear, currentMonth);
  const today = todayStr();

  const hasContent = (day) => {
    const dateStr = fmtDate(currentYear, currentMonth, day);
    const mmdd = `${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const hasEvent = eventsForDay(events, dateStr).length > 0;
    const hasTask = tasksForDay(tasks, dateStr).length > 0;
    return hasEvent || hasTask;
  };

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= dim; d++) {
    const dateStr = fmtDate(currentYear, currentMonth, d);
    const isToday = dateStr === today;
    const isSelected = selectedDay === dateStr;
    const content = hasContent(d);
    cells.push(
      <button
        key={d}
        onClick={() => {
          dispatch({ type: 'SELECT_DAY', day: dateStr });
          if (state.view === 'todo') {
            dispatch({ type: 'OPEN_MODAL', modal: { type: 'newTask', data: { scheduledDate: dateStr } } });
          } else {
            dispatch({ type: 'OPEN_MODAL', modal: { type: 'dayDetail', data: { day: dateStr } } });
          }
        }}
        style={{
          aspectRatio: '1',
          padding: 0,
          background: isToday ? TOKENS.accent : (isSelected ? TOKENS.accentSoft : 'transparent'),
          border: 'none',
          borderRadius: '999px',
          cursor: 'pointer',
          fontFamily: FONTS.mono,
          fontSize: '10.5px',
          fontWeight: isToday ? 700 : 500,
          color: isToday ? '#fff' : (isSelected ? TOKENS.accent : TOKENS.text),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1px',
          fontVariantNumeric: 'tabular-nums',
          position: 'relative',
        }}
      >
        <span>{d}</span>
        {content && !isToday && (
          <div style={{
            position: 'absolute',
            bottom: '1px',
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: isSelected ? TOKENS.accent : TOKENS.textMuted,
          }} />
        )}
      </button>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: '12.5px',
          fontWeight: 700,
          color: TOKENS.text,
        }}>
          {MONTHS_NOM[currentMonth]} {currentYear}
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={() => dispatch({ type: 'PREV_MONTH' })}
            style={{
              width: '22px', height: '22px',
              padding: 0,
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              color: TOKENS.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => dispatch({ type: 'NEXT_MONTH' })}
            style={{
              width: '22px', height: '22px',
              padding: 0,
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              color: TOKENS.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        marginBottom: '4px',
      }}>
        {DAYS_SINGLE.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: '9px',
            letterSpacing: '0.05em',
            color: i >= 5 ? TOKENS.textMuted : TOKENS.textSecondary,
            fontWeight: 600,
            padding: '2px 0',
          }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
      }}>
        {cells}
      </div>
    </div>
  );
}

// ============ DESKTOP MAIN ============

function DesktopMain({ state, dispatch }) {
  if (state.view === 'todo') return <DesktopTasksView state={state} dispatch={dispatch} />;
  return <DesktopCalendarView state={state} dispatch={dispatch} />;
}

// ============ DESKTOP CALENDAR VIEW ============

function DesktopCalendarView({ state, dispatch }) {
  return (
    <div style={{
      padding: '20px 24px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
    }}>
      <SlimRibbon state={state} />
      <TimelineStrip state={state} dispatch={dispatch} />
      <DesktopMonthSection state={state} dispatch={dispatch} />
    </div>
  );
}

function SlimRibbon({ state }) {
  const today = new Date();
  const todayMmdd = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const nameDay = NAME_DAYS[todayMmdd];
  const weekNum = getWeekNumber(today);
  const hours = today.getHours();
  const minutes = today.getMinutes();
  const nowLabel = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;

  return (
    <div style={{
      position: 'relative',
      background: TOKENS.bg,
      border: `1px solid ${TOKENS.borderSoft}`,
      borderRadius: '14px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      overflow: 'hidden',
    }}>
      {/* Top gradient strip */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${TOKENS.accent} 0%, ${CATEGORIES_DEFAULT[1].color} 33%, ${CATEGORIES_DEFAULT[2].color} 66%, ${CATEGORIES_DEFAULT[0].color} 100%)`,
      }} />

      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '11px',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: TOKENS.accent,
        fontWeight: 700,
      }}>
        {DAYS_FULL[today.getDay()].toUpperCase()}
      </div>
      <div style={{
        fontFamily: FONTS.display,
        fontSize: '22px',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: TOKENS.text,
        lineHeight: 1,
      }}>
        {today.getDate()}. {MONTHS_LOWER[today.getMonth()]}
      </div>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '11px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: TOKENS.textMuted,
        fontWeight: 600,
      }}>
        TÝDEN {weekNum}
      </div>

      {nameDay && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{
            fontFamily: FONTS.mono,
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: TOKENS.textMuted,
            fontWeight: 600,
          }}>
            SVÁTEK SLAVÍ
          </span>
          <span style={{
            fontFamily: FONTS.hand,
            fontSize: '20px',
            color: TOKENS.accent,
            fontWeight: 600,
            lineHeight: 1,
          }}>
            {nameDay}
          </span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* "nyní" pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px 4px 8px',
        borderRadius: '999px',
        background: TOKENS.accentSoft,
        border: `1px solid ${TOKENS.accent}30`,
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: TOKENS.accent,
        }} />
        <span style={{
          fontFamily: FONTS.mono,
          fontSize: '11px',
          fontWeight: 700,
          color: TOKENS.accent,
          letterSpacing: '0.05em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          nyní {nowLabel}
        </span>
      </div>
    </div>
  );
}

function TimelineStrip({ state, dispatch }) {
  const today = todayStr();
  const todayEvents = eventsForDay(allEvents(state), today);
  const todayTasks = tasksForDay(state.tasks, today);

  const START_HOUR = 6;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  const timeToPercent = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const decimal = h + m / 60;
    if (decimal < START_HOUR || decimal > END_HOUR) return null;
    return ((decimal - START_HOUR) / TOTAL_HOURS) * 100;
  };

  const now = new Date();
  const nowPercent = timeToPercent(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);

  const hourMarks = [];
  for (let h = START_HOUR; h <= END_HOUR; h += 2) {
    hourMarks.push(h);
  }

  return (
    <div style={{
      background: TOKENS.bg,
      border: `1px solid ${TOKENS.borderSoft}`,
      borderRadius: '14px',
      padding: '14px 20px 16px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        position: 'relative',
      }}>
        {hourMarks.map(h => (
          <div key={h} style={{
            fontFamily: FONTS.mono,
            fontSize: '10px',
            color: TOKENS.textMuted,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {String(h).padStart(2,'0')}:00
          </div>
        ))}
      </div>

      <div style={{
        position: 'relative',
        height: '60px',
        background: `linear-gradient(180deg, ${TOKENS.bgSoft} 0%, ${TOKENS.bg} 100%)`,
        border: `1px solid ${TOKENS.borderSoft}`,
        borderRadius: '10px',
      }}>
        {/* Vertical guide lines */}
        {hourMarks.slice(1, -1).map((h, i) => (
          <div key={h} style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`,
            width: '1px',
            background: TOKENS.borderSoft,
          }} />
        ))}

        {/* Event blocks (top half) */}
        {todayEvents.filter(e => e.time && timeToPercent(e.time) !== null).map((e) => {
          const left = timeToPercent(e.time);
          const cfg = EVENT_TYPES[e.type];
          return (
            <div
              key={e.id}
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'editEvent', data: e } })}
              style={{
                position: 'absolute',
                top: '6px',
                left: `${left}%`,
                maxWidth: '220px',
                minWidth: '90px',
                padding: '4px 8px 4px 8px',
                background: `${cfg.color}15`,
                borderLeft: `3px solid ${cfg.color}`,
                borderRadius: '4px',
                cursor: 'pointer',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: '10px',
                fontWeight: 700,
                color: cfg.color,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {e.time}
              </div>
              <div style={{
                fontFamily: FONTS.body,
                fontSize: '11px',
                fontWeight: 500,
                color: TOKENS.text,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {e.person}
              </div>
            </div>
          );
        })}

        {/* Task dots (bottom row) */}
        {todayTasks.filter(t => t.time && timeToPercent(t.time) !== null).map((t) => {
          const left = timeToPercent(t.time);
          const cat = state.categories.find(c => c.id === t.categoryId) || state.categories[0];
          return (
            <div
              key={t.id}
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'editTask', data: t } })}
              style={{
                position: 'absolute',
                bottom: '6px',
                left: `${left}%`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: t.completed ? 'transparent' : cat.color,
                border: t.completed ? `1.5px solid ${cat.color}` : `2px solid ${TOKENS.bg}`,
                boxShadow: `0 0 0 1px ${cat.color}`,
              }} />
              <span style={{
                fontFamily: FONTS.body,
                fontSize: '10.5px',
                color: TOKENS.textSecondary,
                maxWidth: '120px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontWeight: 500,
              }}>
                {t.title}
              </span>
            </div>
          );
        })}

        {/* "Nyní" line */}
        {nowPercent !== null && (
          <>
            <div style={{
              position: 'absolute',
              top: '-2px',
              bottom: '-2px',
              left: `${nowPercent}%`,
              width: '2px',
              background: TOKENS.accent,
              zIndex: 2,
            }} />
            <div style={{
              position: 'absolute',
              top: '-6px',
              left: `calc(${nowPercent}% - 4px)`,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: TOKENS.accent,
              zIndex: 3,
              boxShadow: '0 0 0 2px white',
            }} />
          </>
        )}
      </div>
    </div>
  );
}

function DesktopMonthSection({ state, dispatch }) {
  return (
    <div style={{
      background: TOKENS.bg,
      border: `1px solid ${TOKENS.borderSoft}`,
      borderRadius: '14px',
      overflow: 'hidden',
      flex: 1,
      minHeight: '420px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 20px',
        borderBottom: `1px solid ${TOKENS.borderSoft}`,
      }}>
        <h2 style={{
          fontFamily: FONTS.display,
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '-0.015em',
          color: TOKENS.text,
          margin: 0,
          textTransform: 'capitalize',
        }}>
          {MONTHS_NOM[state.currentMonth]} {state.currentYear}
        </h2>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={() => dispatch({ type: 'PREV_MONTH' })}
            style={{
              width: '28px', height: '28px',
              padding: 0,
              borderRadius: '6px',
              background: 'transparent',
              border: `1px solid ${TOKENS.borderSoft}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: TOKENS.textSecondary,
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => dispatch({ type: 'NEXT_MONTH' })}
            style={{
              width: '28px', height: '28px',
              padding: 0,
              borderRadius: '6px',
              background: 'transparent',
              border: `1px solid ${TOKENS.borderSoft}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: TOKENS.textSecondary,
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          onClick={() => dispatch({ type: 'GO_TODAY' })}
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            background: TOKENS.accentSoft,
            border: `1px solid ${TOKENS.accent}30`,
            color: TOKENS.accent,
            fontFamily: FONTS.body,
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Dnes
        </button>
      </div>
      <DesktopMonthGrid state={state} dispatch={dispatch} />
    </div>
  );
}

function DesktopMonthGrid({ state, dispatch }) {
  const { currentYear, currentMonth, tasks, categories, selectedDay } = state;
  const events = allEvents(state);
  const dim = daysInMonth(currentYear, currentMonth);
  const offset = firstDayOffset(currentYear, currentMonth);
  const today = todayStr();
  const getCategoryColor = (catId) => categories.find(c => c.id === catId)?.color || '#888';

  const cells = [];
  for (let i = 0; i < offset; i++) {
    cells.push(<div key={`e-${i}`} style={{ background: TOKENS.bgSoft }} />);
  }

  for (let d = 1; d <= dim; d++) {
    const dateStr = fmtDate(currentYear, currentMonth, d);
    const mmdd = `${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvents = eventsForDay(events, dateStr);
    const dayTasks = tasksForDay(tasks, dateStr);
    const isToday = dateStr === today;
    const isSelected = selectedDay === dateStr;
    const dow = new Date(currentYear, currentMonth, d).getDay();
    const isWeekend = dow === 0 || dow === 6;

    const items = [
      ...dayEvents.map(e => ({ kind: 'event', data: e })),
      ...dayTasks.map(t => ({ kind: 'task', data: t })),
    ];
    const visible = items.slice(0, 3);
    const overflow = items.length - visible.length;

    cells.push(
      <button
        key={d}
        onClick={() => {
          dispatch({ type: 'SELECT_DAY', day: dateStr });
          dispatch({ type: 'OPEN_MODAL', modal: { type: 'dayDetail', data: { day: dateStr } } });
        }}
        style={{
          background: isWeekend ? TOKENS.bgSoft : TOKENS.bg,
          padding: '8px',
          border: 'none',
          borderLeft: isSelected ? `3px solid ${TOKENS.accent}` : 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          alignItems: 'stretch',
          textAlign: 'left',
          minHeight: '90px',
          position: 'relative',
          fontFamily: FONTS.body,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isToday ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '22px',
              height: '22px',
              padding: '0 7px',
              borderRadius: '999px',
              background: TOKENS.accent,
              color: '#fff',
              fontFamily: FONTS.mono,
              fontSize: '11px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {d}
            </div>
          ) : (
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: '13px',
              fontWeight: 600,
              color: isWeekend ? TOKENS.textMuted : TOKENS.text,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {d}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {visible.map((item, i) => {
            if (item.kind === 'event') {
              const cfg = EVENT_TYPES[item.data.type];
              return (
                <div key={`e-${i}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontFamily: FONTS.body,
                  fontWeight: 500,
                  color: TOKENS.text,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  <div style={{
                    width: '10px',
                    height: '2.5px',
                    borderRadius: '2px',
                    background: cfg.color,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.data.person}
                  </span>
                  {item.data.time && (
                    <span style={{
                      fontFamily: FONTS.mono,
                      fontSize: '9.5px',
                      color: TOKENS.textMuted,
                      fontVariantNumeric: 'tabular-nums',
                      marginLeft: 'auto',
                      flexShrink: 0,
                    }}>
                      {item.data.time}
                    </span>
                  )}
                </div>
              );
            } else {
              const color = getCategoryColor(item.data.categoryId);
              return (
                <div key={`t-${i}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10.5px',
                  fontFamily: FONTS.body,
                  fontWeight: 500,
                  color: TOKENS.text,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  <div style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: item.data.completed ? 'transparent' : color,
                    border: item.data.completed ? `1.2px solid ${color}` : 'none',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    textDecoration: item.data.completed ? 'line-through' : 'none',
                    opacity: item.data.completed ? 0.55 : 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.data.title}
                  </span>
                </div>
              );
            }
          })}
          {overflow > 0 && (
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: '9.5px',
              color: TOKENS.textMuted,
              fontWeight: 600,
              paddingLeft: '14px',
            }}>
              +{overflow} dalších
            </div>
          )}
        </div>
      </button>
    );
  }

  // Fill trailing cells to keep grid aligned
  const totalCells = offset + dim;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < trailing; i++) {
    cells.push(<div key={`et-${i}`} style={{ background: TOKENS.bgSoft }} />);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        columnGap: '1px',
        background: TOKENS.bgSoft,
        borderBottom: `1px solid ${TOKENS.borderSoft}`,
      }}>
        {DAYS_SHORT.map((d, i) => (
          <div key={i} style={{
            padding: '8px 10px',
            fontFamily: FONTS.mono,
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: i >= 5 ? TOKENS.textMuted : TOKENS.textSecondary,
            fontWeight: 700,
          }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        flex: 1,
        gap: '1px',
        background: TOKENS.borderSoft,
      }}>
        {cells}
      </div>
    </div>
  );
}

// ============ DESKTOP TASKS VIEW (Kanban) ============

function DesktopTasksView({ state, dispatch }) {
  const today = new Date();
  return (
    <div style={{
      padding: '20px 24px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '20px',
        marginBottom: '4px',
      }}>
        <div>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TOKENS.accent,
            fontWeight: 700,
            marginBottom: '4px',
          }}>
            {DAYS_FULL[today.getDay()].toUpperCase()} {today.getDate()}. {MONTHS_LOWER[today.getMonth()].toUpperCase()}
          </div>
          <h1 style={{
            fontFamily: FONTS.display,
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: TOKENS.text,
            margin: 0,
            lineHeight: 1,
          }}>
            Úkoly
          </h1>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newTask', data: {} } })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '999px',
            background: TOKENS.accent,
            color: '#fff',
            border: 'none',
            fontFamily: FONTS.body,
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(122,24,64,.22)',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Přidat úkol
        </button>
      </div>

      {/* Kanban: dynamic columns — show only categories with tasks */}
      {(() => {
        const activeCategories = state.categories.filter(c =>
          state.tasks.some(t => t.categoryId === c.id)
        );
        if (activeCategories.length === 0) {
          return (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              border: `1px dashed ${TOKENS.border}`,
              borderRadius: '14px',
              color: TOKENS.textMuted,
              fontFamily: FONTS.body,
              fontSize: '14px',
              textAlign: 'center',
            }}>
              Zatím žádné úkoly. Přidej úkol vlevo nebo přes „Přidat úkol" nahoře.
            </div>
          );
        }
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${activeCategories.length}, minmax(0, 1fr))`,
            gap: '14px',
            flex: 1,
            minHeight: 0,
          }}>
            {activeCategories.map(c => (
              <KanbanColumn key={c.id} category={c} state={state} dispatch={dispatch} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function KanbanColumn({ category, state, dispatch }) {
  const tasks = state.tasks.filter(t => t.categoryId === category.id && !t.completed);
  const done = state.tasks.filter(t => t.categoryId === category.id && t.completed);

  return (
    <div style={{
      background: TOKENS.bg,
      border: `1px solid ${TOKENS.borderSoft}`,
      borderRadius: '14px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: '360px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 14px',
        borderBottom: `1px solid ${TOKENS.borderSoft}`,
      }}>
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'editCategory', data: category } })}
          title="Přejmenovat kategorii"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: category.color,
          }} />
          <div style={{
            fontFamily: FONTS.body,
            fontSize: '13px',
            fontWeight: 700,
            color: TOKENS.text,
          }}>
            {category.name}
          </div>
        </button>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10.5px',
          color: TOKENS.textMuted,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {tasks.length}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newTask', data: { categoryId: category.id } } })}
          style={{
            width: '22px',
            height: '22px',
            padding: 0,
            borderRadius: '6px',
            background: TOKENS.bgSoft,
            border: `1px solid ${TOKENS.borderSoft}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TOKENS.textSecondary,
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      </div>

      <div style={{
        flex: 1,
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto',
      }}>
        {tasks.length === 0 && done.length === 0 && (
          <div style={{
            padding: '24px 12px',
            textAlign: 'center',
            fontFamily: FONTS.body,
            fontSize: '12.5px',
            color: TOKENS.textMuted,
            fontWeight: 500,
          }}>
            Nic tady není.
          </div>
        )}
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} categories={state.categories} dispatch={dispatch} />
        ))}

        {done.length > 0 && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '8px 0 4px',
            }}>
              <div style={{ flex: 1, borderTop: `1px dashed ${TOKENS.borderSoft}` }} />
              <span style={{
                fontFamily: FONTS.mono,
                fontSize: '9.5px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: TOKENS.textMuted,
                fontWeight: 700,
              }}>
                Hotovo {done.length}
              </span>
              <div style={{ flex: 1, borderTop: `1px dashed ${TOKENS.borderSoft}` }} />
            </div>
            <div style={{ opacity: 0.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {done.map(t => (
                <TaskCard key={t.id} task={t} categories={state.categories} dispatch={dispatch} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ DESKTOP DAY RAIL ============

function DesktopDayRail({ state, dispatch }) {
  const dateStr = state.selectedDay || todayStr();
  const isSelectedToday = dateStr === todayStr();
  const { y, m, d } = parseDate(dateStr);
  const mmdd = `${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const nameDay = NAME_DAYS[mmdd];

  const everyEvent = allEvents(state);
  const dayEvents = eventsForDay(everyEvent, dateStr);
  const dayTasks = state.tasksForDay(tasks, dateStr);

  // Upcoming: next 14 days, events + scheduled tasks, excluding selected day
  const upcoming = [];
  const baseDate = new Date(y, m, d);
  for (let i = 1; i <= 14; i++) {
    const future = new Date(baseDate);
    future.setDate(future.getDate() + i);
    const fStr = fmtDate(future.getFullYear(), future.getMonth(), future.getDate());
    const fMmdd = `${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
    const fEvents = eventsForDay(everyEvent, fStr);
    const fTasks = tasksForDay(state.tasks, fStr).filter(t => !t.completed);
    [...fEvents, ...fTasks].forEach(item => {
      upcoming.push({
        date: future,
        item,
        kind: item.type ? 'event' : 'task',
      });
    });
  }

  return (
    <div style={{
      borderLeft: `1px solid ${TOKENS.borderSoft}`,
      padding: '20px 18px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Day header */}
      <div style={{
        position: 'relative',
        padding: '16px 18px',
        borderRadius: '14px',
        background: isSelectedToday ? TOKENS.accentSoft : TOKENS.bgSoft,
        border: `1px solid ${isSelectedToday ? TOKENS.accent + '30' : TOKENS.borderSoft}`,
        overflow: 'hidden',
      }}>
        {isSelectedToday && (
          <svg width="80" height="80" style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            opacity: 0.08,
          }} viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="none" stroke={TOKENS.accent} strokeWidth="1" />
            <circle cx="40" cy="40" r="28" fill="none" stroke={TOKENS.accent} strokeWidth="1" />
            <circle cx="40" cy="40" r="18" fill="none" stroke={TOKENS.accent} strokeWidth="1" />
          </svg>
        )}

        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: isSelectedToday ? TOKENS.accent : TOKENS.textMuted,
          fontWeight: 700,
          marginBottom: '8px',
        }}>
          {isSelectedToday ? 'VYBRANÝ DEN · DNES' : 'VYBRANÝ DEN'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <div style={{
            fontFamily: FONTS.display,
            fontSize: '44px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: TOKENS.text,
            lineHeight: 0.95,
          }}>
            {d}.
          </div>
          <div style={{
            fontFamily: FONTS.display,
            fontSize: '17px',
            fontWeight: 700,
            color: TOKENS.text,
            letterSpacing: '-0.015em',
          }}>
            {MONTHS_LOWER[m]}
          </div>
        </div>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: '12px',
          fontWeight: 500,
          color: TOKENS.textSecondary,
        }}>
          {DAYS_FULL[new Date(y, m, d).getDay()]}
          {nameDay && (
            <> · <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'people' } })}
              title="Otevřít seznam známých a svátků"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: TOKENS.accent,
                fontFamily: FONTS.body,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textUnderlineOffset: '2px',
              }}
            >svátek {nameDay}</button></>
          )}
        </div>
      </div>

      {/* Události */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <SectionHeader marker="bar" label="Události" count={dayEvents.length} />
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {Object.entries(EVENT_TYPES).map(([id, cfg]) => (
            <button
              key={id}
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newEvent', data: { date: dateStr, type: id } } })}
              title={`Přidat: ${cfg.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 9px',
                borderRadius: '999px',
                background: `${cfg.color}15`,
                border: `1px solid ${cfg.color}40`,
                color: cfg.color,
                fontFamily: FONTS.body,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={10} strokeWidth={2.5} />
              {cfg.label}
            </button>
          ))}
        </div>
        {dayEvents.length === 0 ? (
          <EmptyMini text="Žádné události." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dayEvents.map(e => <EventCard key={e.id} event={e} dispatch={dispatch} />)}
          </div>
        )}
      </div>

      {/* Úkoly — pouze v Kalendář pohledu */}
      {state.view === 'calendar' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <SectionHeader marker="dot" label="Úkoly" count={dayTasks.filter(t => !t.completed).length} />
            <div style={{ flex: 1 }} />
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'newTask', data: { scheduledDate: dateStr } } })}
              title="Přidat úkol na tento den"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: TOKENS.accent,
                color: '#fff',
                border: 'none',
                fontFamily: FONTS.body,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(122,24,64,.22)',
              }}
            >
              <Plus size={10} strokeWidth={2.5} />
              Úkol
            </button>
          </div>
          {dayTasks.length === 0 ? (
            <EmptyMini text="Žádné úkoly na tento den." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dayTasks.map(t => <TaskCard key={t.id} task={t} categories={state.categories} dispatch={dispatch} />)}
            </div>
          )}
        </div>
      )}

      {/* Brzy */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}>
          <ArrowRight size={12} strokeWidth={2.5} color={TOKENS.text} />
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '10.5px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: TOKENS.text,
          }}>
            Brzy
          </div>
          {upcoming.length > 0 && (
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: '10.5px',
              color: TOKENS.textMuted,
              fontWeight: 500,
            }}>
              {upcoming.length}
            </div>
          )}
        </div>
        {upcoming.length === 0 ? (
          <EmptyMini text="Nic dalšího naplánovaného." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {upcoming.slice(0, 8).map((u, i) => (
              <UpcomingRow key={i} entry={u} categories={state.categories} dispatch={dispatch} baseDate={baseDate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyMini({ text }) {
  return (
    <div style={{
      padding: '14px',
      textAlign: 'center',
      background: TOKENS.bgSoft,
      borderRadius: '10px',
      border: `1px dashed ${TOKENS.borderSoft}`,
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: TOKENS.textMuted,
      fontWeight: 500,
    }}>
      {text}
    </div>
  );
}

function UpcomingRow({ entry, categories, dispatch, baseDate }) {
  const { date, item, kind } = entry;
  const dayDiff = Math.round((date - baseDate) / 86400000);
  const relLabel = dayDiff === 1 ? 'zítra'
                 : dayDiff <= 7 ? `za ${dayDiff} dní`
                 : `${date.getDate()}. ${MONTHS_LOWER[date.getMonth()].slice(0,3)}`;

  const onClick = () => {
    if (kind === 'event') {
      if (item._derived) {
        dispatch({ type: 'OPEN_MODAL', modal: { type: 'people' } });
      } else {
        dispatch({ type: 'OPEN_MODAL', modal: { type: 'editEvent', data: item } });
      }
    } else {
      dispatch({ type: 'OPEN_MODAL', modal: { type: 'editTask', data: item } });
    }
  };

  const cat = kind === 'task' ? (categories.find(c => c.id === item.categoryId) || categories[0]) : null;
  const cfg = kind === 'event' ? EVENT_TYPES[item.type] : null;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px',
        borderRadius: '8px',
        background: 'transparent',
        border: `1px solid ${TOKENS.borderSoft}`,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: FONTS.body,
      }}
    >
      {/* Date stamp */}
      <div style={{
        width: '34px',
        flexShrink: 0,
        border: `1px solid ${TOKENS.borderSoft}`,
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '8px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          background: TOKENS.bgSoft,
          color: TOKENS.textSecondary,
          fontWeight: 700,
          padding: '2px 0',
        }}>
          {MONTHS_LOWER[date.getMonth()].slice(0,3)}
        </div>
        <div style={{
          fontFamily: FONTS.display,
          fontSize: '14px',
          fontWeight: 800,
          color: TOKENS.text,
          padding: '2px 0 3px',
          lineHeight: 1,
        }}>
          {date.getDate()}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {kind === 'event' ? (
            <div style={{
              width: '10px',
              height: '2.5px',
              borderRadius: '2px',
              background: cfg.color,
              flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: cat.color,
              flexShrink: 0,
            }} />
          )}
          <div style={{
            fontSize: '12.5px',
            fontWeight: 500,
            color: TOKENS.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {kind === 'event' ? item.person : item.title}
          </div>
        </div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          color: TOKENS.textMuted,
          fontWeight: 600,
          marginTop: '2px',
          paddingLeft: '14px',
        }}>
          {relLabel}
        </div>
      </div>
    </button>
  );
}
