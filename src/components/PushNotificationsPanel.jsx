import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  pushSupported, getPermission, getCurrentSubscription,
  subscribeToPush, unsubscribeFromPush,
} from '../lib/pushNotifications';

const ACCENT = '#7A1840';
const SOFT = 'oklch(95% 0.025 350)';

export default function PushNotificationsPanel() {
  const [supported] = useState(pushSupported());
  const [permission, setPermission] = useState(supported ? getPermission() : 'unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id || null);
      const sub = await getCurrentSubscription();
      setSubscribed(!!sub);
    })();
  }, []);

  const enable = async () => {
    setBusy(true); setError(null);
    try {
      await subscribeToPush(userId);
      setPermission(getPermission());
      setSubscribed(true);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true); setError(null);
    try {
      await unsubscribeFromPush(userId);
      setSubscribed(false);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return (
      <div style={panelStyle}>
        <div style={titleStyle}>Push notifikace</div>
        <div style={bodyStyle}>
          Tento prohlížeč push notifikace nepodporuje. Na iOS musíš mít appku
          přidanou na plochu (Safari → Sdílet → Přidat na plochu).
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>Push notifikace</div>
      <div style={bodyStyle}>
        {subscribed && permission === 'granted'
          ? 'Notifikace jsou zapnuté. Upozornění budou chodit i když máš appku zavřenou.'
          : permission === 'denied'
            ? 'Notifikace jsou zablokované v prohlížeči. Povol je v nastavení prohlížeče (zámeček vedle adresy → Notifikace → Povolit).'
            : 'Zapni si upozornění, aby ti chodily i když máš appku zavřenou.'}
      </div>

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#B83066' }}>{error}</div>
      )}

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        {subscribed ? (
          <button onClick={disable} disabled={busy} style={btnGhost(busy)}>
            {busy ? '…' : 'Vypnout notifikace'}
          </button>
        ) : (
          <button onClick={enable} disabled={busy || permission === 'denied'} style={btnPrimary(busy || permission === 'denied')}>
            {busy ? 'zapínám…' : 'Zapnout notifikace'}
          </button>
        )}
      </div>
    </div>
  );
}

const panelStyle = {
  padding: '14px 14px 12px',
  background: SOFT,
  borderRadius: 12,
  border: `1px solid ${ACCENT}30`,
};
const titleStyle = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 10.5,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: ACCENT,
  marginBottom: 6,
};
const bodyStyle = {
  fontFamily: '"Space Grotesk", system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.5,
  color: 'rgba(26,23,20,0.75)',
};
const btnPrimary = (disabled) => ({
  padding: '9px 14px',
  background: ACCENT,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontFamily: 'inherit',
  fontWeight: 600,
  fontSize: 13,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
const btnGhost = (disabled) => ({
  padding: '9px 14px',
  background: 'transparent',
  color: ACCENT,
  border: `1.5px solid ${ACCENT}`,
  borderRadius: 8,
  fontFamily: 'inherit',
  fontWeight: 600,
  fontSize: 13,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
