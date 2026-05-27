// Web Push subscription helpers.
import { supabase } from './supabase';

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export function getPermission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Base64-URL → Uint8Array (potřeba pro applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getReg() {
  // VitePWA registruje SW automaticky přes registerSW.js; tady ho jen najdeme.
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

// Vrátí existující subscription (pokud je) nebo null.
export async function getCurrentSubscription() {
  if (!pushSupported()) return null;
  try {
    const reg = await getReg();
    return await reg.pushManager.getSubscription();
  } catch (e) {
    console.error('[push] getSubscription', e);
    return null;
  }
}

// Požádá o povolení + vytvoří subscription + uloží do Supabase.
export async function subscribeToPush(userId) {
  if (!pushSupported()) throw new Error('Tento prohlížeč nepodporuje notifikace.');
  if (!VAPID_PUBLIC) throw new Error('Chybí VAPID public key (env proměnná).');
  if (!supabase || !userId) throw new Error('Nejsi přihlášená.');

  // 1) Povolení
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifikace nebyly povoleny.');

  // 2) Subscribe
  const reg = await getReg();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }

  // 3) Ulož do Supabase
  const subObj = sub.toJSON();
  const row = {
    user_id: userId,
    endpoint: subObj.endpoint,
    p256dh: subObj.keys.p256dh,
    auth: subObj.keys.auth,
    user_agent: navigator.userAgent.slice(0, 200),
    last_seen_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'user_id,endpoint' });
  if (error) throw error;

  return sub;
}

// Odhlásí push (lokálně i v Supabase).
export async function unsubscribeFromPush(userId) {
  try {
    const sub = await getCurrentSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      if (supabase && userId) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', endpoint);
      }
    }
  } catch (e) {
    console.error('[push] unsubscribe', e);
  }
}

// "Heartbeat" — při startu appky aktualizuje last_seen_at, aby Edge Function viděla,
// že tato subscription je aktivní. Volá se tiše, chyby ignoruje.
export async function refreshSubscriptionHeartbeat(userId) {
  if (!supabase || !userId) return;
  const sub = await getCurrentSubscription();
  if (!sub) return;
  await supabase
    .from('push_subscriptions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('endpoint', sub.endpoint);
}
