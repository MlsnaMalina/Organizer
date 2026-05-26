import { useEffect, useState } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabase';

const ACCENT = '#7A1840';
const ACCENT_HOVER = '#B83066';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseEnabled) { setReady(true); return; }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  if (!supabaseEnabled) {
    // Fallback: cloud sync vypnutý → appka jede čistě offline.
    return children;
  }

  if (!ready) return <SplashScreen />;
  if (!session) return <LoginScreen />;
  return children;
}

function SplashScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      color: ACCENT,
    }}>
      <div style={{ fontFamily: '"Caveat", cursive', fontSize: 28 }}>chvilku…</div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setSending(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: v,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'oklch(99% 0.002 350)',
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      color: '#1A1714',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: '#FFFFFF',
        border: `1.5px solid ${ACCENT}`,
        borderRadius: 18,
        padding: '32px 28px 28px',
        boxShadow: '0 4px 24px rgba(122,24,64,0.08)',
      }}>
        <div style={{
          fontFamily: '"Syne", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: 32,
          color: ACCENT,
          textAlign: 'center',
          letterSpacing: '-0.02em',
        }}>Organizér</div>
        <div style={{
          fontFamily: '"Caveat", cursive',
          fontSize: 22,
          color: 'rgba(26,23,20,0.55)',
          textAlign: 'center',
          marginTop: 4,
          marginBottom: 24,
        }}>tvůj kalendář, úkoly a poznámky</div>

        {sent ? (
          <SentMessage email={email} onBack={() => { setSent(false); setEmail(''); }} />
        ) : (
          <form onSubmit={submit}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 6,
              color: 'rgba(26,23,20,0.7)',
            }}>e-mail</label>
            <input
              type="email"
              autoFocus
              required
              autoComplete="email"
              placeholder="ty@nekde.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: 15,
                fontFamily: 'inherit',
                border: '1.5px solid rgba(26,23,20,0.15)',
                borderRadius: 10,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = ACCENT}
              onBlur={(e) => e.target.style.borderColor = 'rgba(26,23,20,0.15)'}
            />
            {error && (
              <div style={{
                marginTop: 10,
                fontSize: 13,
                color: '#B83066',
              }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={sending || !email.trim()}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '12px 16px',
                background: ACCENT,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: sending ? 'wait' : 'pointer',
                opacity: sending || !email.trim() ? 0.6 : 1,
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = ACCENT_HOVER; }}
              onMouseLeave={(e) => e.currentTarget.style.background = ACCENT}
            >
              {sending ? 'posílám…' : 'pošli mi přihlašovací odkaz'}
            </button>
            <div style={{
              marginTop: 14,
              fontSize: 12,
              color: 'rgba(26,23,20,0.5)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              do e-mailu ti přijde odkaz<br/>kliknutím na něj se přihlásíš
            </div>
          </form>
        )}
      </div>

      <div style={{
        marginTop: 18,
        fontFamily: '"Caveat", cursive',
        fontSize: 17,
        color: 'rgba(26,23,20,0.55)',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        vytvořila Kateřina Mlsnová{' '}
        <a
          href="https://www.katerinamlsnova.cz"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: ACCENT, textDecoration: 'none', borderBottom: `1px dashed ${ACCENT}` }}
        >www.katerinamlsnova.cz</a>
      </div>
    </div>
  );
}

function SentMessage({ email, onBack }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: '"Caveat", cursive',
        fontSize: 26,
        color: ACCENT,
        marginBottom: 8,
      }}>odkaz letí k tobě</div>
      <div style={{
        fontSize: 14,
        color: 'rgba(26,23,20,0.7)',
        lineHeight: 1.6,
      }}>
        zkontroluj schránku<br/>
        <strong style={{ color: '#1A1714' }}>{email}</strong><br/>
        a klikni na přihlašovací odkaz
      </div>
      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 20,
          background: 'transparent',
          border: 'none',
          color: ACCENT,
          fontSize: 13,
          textDecoration: 'underline',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >zadat jiný e-mail</button>
    </div>
  );
}
