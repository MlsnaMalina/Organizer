import { useEffect, useRef, useState } from 'react';
import { supabase, supabaseEnabled } from './supabase';
import {
  pullCloudState, pushAllToCloud, pushDiff, isCloudEmpty, subscribeRealtime,
} from './cloudSync';

// Hook propojí React state s cloudem.
//   - po loginu pullne data z cloudu (nebo pushne lokální, pokud je cloud prázdný)
//   - sleduje změny state a posílá diffy do cloudu
//   - poslouchá realtime změny z jiných zařízení a re-pulluje
export function useCloudSync(state, dispatch) {
  const [status, setStatus] = useState({ phase: 'idle', userId: null });
  const lastSyncedRef = useRef(null);    // poslední state, který je shodný s cloudem
  const initializedRef = useRef(false);
  const pullingRef = useRef(false);

  // 1) Sledování auth session → userId
  useEffect(() => {
    if (!supabaseEnabled) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const uid = data.session?.user?.id || null;
      setStatus(s => ({ ...s, userId: uid }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const uid = s?.user?.id || null;
      setStatus(prev => {
        if (prev.userId !== uid) {
          initializedRef.current = false;
          lastSyncedRef.current = null;
        }
        return { ...prev, userId: uid };
      });
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // 2) Inicializační sync — pull from cloud / push local if empty
  useEffect(() => {
    if (!status.userId || initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      setStatus(s => ({ ...s, phase: 'pulling' }));
      const cloud = await pullCloudState();

      if (!cloud) {
        setStatus(s => ({ ...s, phase: 'error' }));
        initializedRef.current = false;
        return;
      }

      if (isCloudEmpty(cloud)) {
        // Migrace: lokální data nahoru
        setStatus(s => ({ ...s, phase: 'migrating' }));
        await pushAllToCloud(state, status.userId);
        lastSyncedRef.current = state;
        setStatus(s => ({ ...s, phase: 'ready' }));
      } else {
        // Cloud má data → nahrazuju lokální cloudovými.
        // Některé top-level klíče si necháme lokální (UI state).
        dispatch({
          type: 'SYNC_REPLACE',
          state: {
            categories: cloud.categories.length ? cloud.categories : state.categories,
            tasks: cloud.tasks,
            events: cloud.events,
            eventSubtypes: cloud.eventSubtypes.length ? cloud.eventSubtypes : state.eventSubtypes,
            notes: cloud.notes,
            miniNotes: cloud.miniNotes,
            people: cloud.people,
            anniversaries: cloud.anniversaries,
            askedEventIds: cloud.askedEventIds,
            featureMarks: cloud.featureMarks,
          },
        });
        // lastSyncedRef se nastaví v dalším efektu (kdy už state odráží cloud)
        setStatus(s => ({ ...s, phase: 'ready' }));
      }
    })();
  }, [status.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3) Diff push — kdykoliv se změní state, pošli diff
  useEffect(() => {
    if (status.phase !== 'ready' || !status.userId) return;

    // První běh po inicializaci: jen zapamatuj a netlač
    if (lastSyncedRef.current === null) {
      lastSyncedRef.current = state;
      return;
    }
    if (lastSyncedRef.current === state) return;

    const prev = lastSyncedRef.current;
    lastSyncedRef.current = state;
    pushDiff(prev, state, status.userId).catch(e => console.error('[pushDiff]', e));
  }, [state, status.phase, status.userId]);

  // 4) Realtime: re-pull při změně z jiného zařízení
  useEffect(() => {
    if (status.phase !== 'ready' || !status.userId) return;

    const unsubscribe = subscribeRealtime(status.userId, async (payload) => {
      // Nepullujeme pro vlastní operace — heuristika: krátký debounce
      if (pullingRef.current) return;
      pullingRef.current = true;
      setTimeout(async () => {
        const cloud = await pullCloudState();
        pullingRef.current = false;
        if (!cloud) return;
        dispatch({
          type: 'SYNC_REPLACE',
          state: {
            categories: cloud.categories.length ? cloud.categories : undefined,
            tasks: cloud.tasks,
            events: cloud.events,
            eventSubtypes: cloud.eventSubtypes,
            notes: cloud.notes,
            miniNotes: cloud.miniNotes,
            people: cloud.people,
            anniversaries: cloud.anniversaries,
            askedEventIds: cloud.askedEventIds,
            featureMarks: cloud.featureMarks,
          },
        });
        lastSyncedRef.current = null; // další state update zaznamenáme jako baseline
      }, 600);
    });

    return unsubscribe;
  }, [status.phase, status.userId, dispatch]);

  return status;
}

export async function signOutCloud() {
  if (!supabaseEnabled) return;
  await supabase.auth.signOut();
}
