// Cloud sync engine: pull all data, push local up (migration), diff-based push deltas, realtime subscription.
import { supabase } from './supabase';
import {
  taskToRow, rowToTask,
  eventToRow, rowToEvent,
  categoryToRow, rowToCategory,
  personToRow, rowToPerson,
  miniNoteToRow, rowToMiniNote,
  anniversaryToRow, rowToAnniversary,
} from './syncMappers';

// =================================================================
// PULL — načte všechno z cloudu do state-tvaru
// =================================================================
export async function pullCloudState() {
  if (!supabase) return null;

  const [cats, tasks, events, subtypes, notesDay, miniNotes, people, anniversaries, askedEvents, featureMarks] =
    await Promise.all([
      supabase.from('categories').select('*').order('position'),
      supabase.from('tasks').select('*'),
      supabase.from('events').select('*'),
      supabase.from('event_subtypes').select('*'),
      supabase.from('notes_day').select('*'),
      supabase.from('mini_notes').select('*'),
      supabase.from('people').select('*'),
      supabase.from('anniversaries').select('*'),
      supabase.from('asked_events').select('*'),
      supabase.from('feature_marks').select('*'),
    ]);

  const err = [cats, tasks, events, subtypes, notesDay, miniNotes, people, anniversaries, askedEvents, featureMarks]
    .find(r => r.error);
  if (err?.error) {
    console.error('[pullCloudState] error', err.error);
    return null;
  }

  const notes = {};
  (notesDay.data || []).forEach(r => { notes[r.day] = r.text; });

  const featureMarksMap = {};
  (featureMarks.data || []).forEach(r => { featureMarksMap[r.key] = r.value; });

  return {
    categories: (cats.data || []).map(rowToCategory),
    tasks: (tasks.data || []).map(rowToTask),
    events: (events.data || []).map(rowToEvent),
    eventSubtypes: (subtypes.data || []).map(r => r.label),
    notes,
    miniNotes: (miniNotes.data || []).map(rowToMiniNote),
    people: (people.data || []).map(rowToPerson),
    anniversaries: (anniversaries.data || []).map(rowToAnniversary),
    askedEventIds: (askedEvents.data || []).map(r => r.event_id),
    featureMarks: featureMarksMap,
  };
}

// Detekce: je cloud úplně prázdný? Pak provedeme migraci z localStorage.
// (Kategorie nepočítáme — vždycky jsou v defaultech.)
export function isCloudEmpty(cloudState) {
  if (!cloudState) return true;
  return (
    (cloudState.tasks?.length || 0) === 0 &&
    (cloudState.events?.length || 0) === 0 &&
    (cloudState.people?.length || 0) === 0 &&
    (cloudState.miniNotes?.length || 0) === 0 &&
    (cloudState.anniversaries?.length || 0) === 0 &&
    Object.keys(cloudState.notes || {}).length === 0
  );
}

// =================================================================
// PUSH ALL — migrace z localStorage do cloudu (one-shot)
// =================================================================
export async function pushAllToCloud(state, userId) {
  if (!supabase || !userId) return;

  const ops = [];

  if (state.categories?.length) {
    ops.push(supabase.from('categories').upsert(
      state.categories.map((c, i) => categoryToRow(c, userId, i))
    ));
  }
  if (state.tasks?.length) {
    ops.push(supabase.from('tasks').upsert(state.tasks.map(t => taskToRow(t, userId))));
  }
  if (state.events?.length) {
    ops.push(supabase.from('events').upsert(state.events.map(e => eventToRow(e, userId))));
  }
  if (state.eventSubtypes?.length) {
    ops.push(supabase.from('event_subtypes').upsert(
      state.eventSubtypes.map(label => ({ user_id: userId, label }))
    ));
  }
  const noteRows = Object.entries(state.notes || {}).map(([day, text]) => ({
    user_id: userId, day, text,
  }));
  if (noteRows.length) {
    ops.push(supabase.from('notes_day').upsert(noteRows));
  }
  if (state.miniNotes?.length) {
    ops.push(supabase.from('mini_notes').upsert(state.miniNotes.map(n => miniNoteToRow(n, userId))));
  }
  if (state.people?.length) {
    ops.push(supabase.from('people').upsert(state.people.map(p => personToRow(p, userId))));
  }
  if (state.anniversaries?.length) {
    ops.push(supabase.from('anniversaries').upsert(
      state.anniversaries.map(a => anniversaryToRow(a, userId))
    ));
  }
  if (state.askedEventIds?.length) {
    ops.push(supabase.from('asked_events').upsert(
      state.askedEventIds.map(event_id => ({ user_id: userId, event_id }))
    ));
  }
  const featureRows = Object.entries(state.featureMarks || {}).map(([key, value]) => ({
    user_id: userId, key, value,
  }));
  if (featureRows.length) {
    ops.push(supabase.from('feature_marks').upsert(featureRows));
  }

  const results = await Promise.all(ops);
  results.forEach((r, i) => {
    if (r.error) console.error('[pushAllToCloud] op', i, 'error', r.error);
  });
}

// =================================================================
// DIFF PUSH — porovná dva stavy a pošle jen rozdíly
// =================================================================
const byId = (arr) => {
  const m = new Map();
  (arr || []).forEach(x => m.set(x.id, x));
  return m;
};

const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
};

async function diffArrayById({ prev, next, table, toRow, userId }) {
  const prevMap = byId(prev);
  const nextMap = byId(next);
  const upserts = [];
  const deletes = [];

  for (const [id, item] of nextMap) {
    const p = prevMap.get(id);
    if (!p || !shallowEqual(p, item)) upserts.push(toRow(item, userId));
  }
  for (const [id] of prevMap) {
    if (!nextMap.has(id)) deletes.push(id);
  }

  const ops = [];
  if (upserts.length) ops.push(supabase.from(table).upsert(upserts));
  if (deletes.length) ops.push(supabase.from(table).delete().eq('user_id', userId).in('id', deletes));
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) console.error(`[diff ${table}]`, r.error); });
}

async function diffNotes(prev, next, userId) {
  const prevObj = prev || {};
  const nextObj = next || {};
  const upserts = [];
  const deleteDays = [];
  const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]);
  for (const day of allKeys) {
    if (nextObj[day] && nextObj[day] !== prevObj[day]) {
      upserts.push({ user_id: userId, day, text: nextObj[day] });
    } else if (!nextObj[day] && prevObj[day]) {
      deleteDays.push(day);
    }
  }
  const ops = [];
  if (upserts.length) ops.push(supabase.from('notes_day').upsert(upserts));
  if (deleteDays.length) ops.push(supabase.from('notes_day').delete().eq('user_id', userId).in('day', deleteDays));
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) console.error('[diff notes_day]', r.error); });
}

async function diffStringArray({ prev, next, table, column, userId }) {
  const prevSet = new Set(prev || []);
  const nextSet = new Set(next || []);
  const inserts = [];
  const deletes = [];
  for (const v of nextSet) if (!prevSet.has(v)) inserts.push({ user_id: userId, [column]: v });
  for (const v of prevSet) if (!nextSet.has(v)) deletes.push(v);
  const ops = [];
  if (inserts.length) ops.push(supabase.from(table).upsert(inserts));
  if (deletes.length) ops.push(supabase.from(table).delete().eq('user_id', userId).in(column, deletes));
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) console.error(`[diff ${table}]`, r.error); });
}

async function diffFeatureMarks(prev, next, userId) {
  const upserts = [];
  const deletes = [];
  const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  for (const key of allKeys) {
    const pv = prev?.[key];
    const nv = next?.[key];
    if (nv !== undefined && JSON.stringify(nv) !== JSON.stringify(pv)) {
      upserts.push({ user_id: userId, key, value: nv });
    } else if (nv === undefined && pv !== undefined) {
      deletes.push(key);
    }
  }
  const ops = [];
  if (upserts.length) ops.push(supabase.from('feature_marks').upsert(upserts));
  if (deletes.length) ops.push(supabase.from('feature_marks').delete().eq('user_id', userId).in('key', deletes));
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) console.error('[diff feature_marks]', r.error); });
}

export async function pushDiff(prev, next, userId) {
  if (!supabase || !userId || !prev) return;

  const jobs = [];

  if (prev.tasks !== next.tasks) {
    jobs.push(diffArrayById({ prev: prev.tasks, next: next.tasks, table: 'tasks', toRow: taskToRow, userId }));
  }
  if (prev.events !== next.events) {
    jobs.push(diffArrayById({ prev: prev.events, next: next.events, table: 'events', toRow: eventToRow, userId }));
  }
  if (prev.categories !== next.categories) {
    jobs.push(diffArrayById({
      prev: prev.categories, next: next.categories, table: 'categories',
      toRow: (c, uid) => categoryToRow(c, uid, next.categories.indexOf(c)),
      userId,
    }));
  }
  if (prev.people !== next.people) {
    jobs.push(diffArrayById({ prev: prev.people, next: next.people, table: 'people', toRow: personToRow, userId }));
  }
  if (prev.miniNotes !== next.miniNotes) {
    jobs.push(diffArrayById({ prev: prev.miniNotes, next: next.miniNotes, table: 'mini_notes', toRow: miniNoteToRow, userId }));
  }
  if (prev.anniversaries !== next.anniversaries) {
    jobs.push(diffArrayById({ prev: prev.anniversaries, next: next.anniversaries, table: 'anniversaries', toRow: anniversaryToRow, userId }));
  }
  if (prev.notes !== next.notes) {
    jobs.push(diffNotes(prev.notes, next.notes, userId));
  }
  if (prev.eventSubtypes !== next.eventSubtypes) {
    jobs.push(diffStringArray({ prev: prev.eventSubtypes, next: next.eventSubtypes, table: 'event_subtypes', column: 'label', userId }));
  }
  if (prev.askedEventIds !== next.askedEventIds) {
    jobs.push(diffStringArray({ prev: prev.askedEventIds, next: next.askedEventIds, table: 'asked_events', column: 'event_id', userId }));
  }
  if (prev.featureMarks !== next.featureMarks) {
    jobs.push(diffFeatureMarks(prev.featureMarks, next.featureMarks, userId));
  }

  await Promise.all(jobs);
}

// =================================================================
// REALTIME — naslouchá změnám z jiných zařízení
// =================================================================
export function subscribeRealtime(userId, onChange) {
  if (!supabase || !userId) return () => {};

  const channel = supabase
    .channel(`organizer-${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => {
        // Filtr na user_id, kdyby snad RLS nestačilo
        const row = payload.new || payload.old;
        if (row && row.user_id && row.user_id !== userId) return;
        onChange(payload);
      })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
