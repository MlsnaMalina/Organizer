// Edge Function: notify-tick
// Spouští se každou minutu (Supabase Cron).
// Najde notifikace, které mají být odeslány v tomto okně, a pošle web-push.
//
// Env potřebuje:
//   VAPID_PUBLIC_KEY   (env / secret)
//   VAPID_PRIVATE_KEY  (secret)
//   VAPID_SUBJECT      (např. "mailto:zlatenkak@gmail.com")
//   SUPABASE_URL       (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

// --------- Konstanty / pravidla notifikací ---------

const NAME_DAYS: Record<string, string> = {
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

// Časové okno: notifikaci považujeme za "k odpálení", pokud její target time
// je v intervalu [now - 30s, now + 60s]. Tím pokryjeme nedokonalou periodicitu cronu.
const WINDOW_BEFORE_MS = 30 * 1000;
const WINDOW_AFTER_MS = 60 * 1000;

// Která lokální (Europe/Prague) hodina+minuta odpovídá "morning"/"evening" upozorněním
const MORNING_HOUR = 8;
const MORNING_MIN = 0;
const EVENING_HOUR = 18;
const EVENING_MIN = 0;

// --------- Time helpers v Europe/Prague ---------

// Vrátí "wall-clock" v Europe/Prague jako parts
function pragueParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  return {
    y: parseInt(map.year), m: parseInt(map.month), d: parseInt(map.day),
    h: parseInt(map.hour), min: parseInt(map.minute), s: parseInt(map.second),
  };
}

// Vytvoří absolutní Date z Prague wall-clock (rok-měs-den hh:mm).
// (Berou se průměrné UTC offsety; v praxi stačí — funkce běží každou minutu.)
function pragueToUtc(y: number, m: number, d: number, h: number, min: number): Date {
  // Začneme tím, že předpokládáme UTC = wall-clock, pak iterativně doladíme
  // o pražský offset (CET/CEST). Konvergence v jednom kroku stačí.
  const guess = new Date(Date.UTC(y, m - 1, d, h, min, 0));
  const parts = pragueParts(guess);
  const wantedMs = Date.UTC(y, m - 1, d, h, min, 0);
  const gotMs = Date.UTC(parts.y, parts.m - 1, parts.d, parts.h, parts.min, 0);
  const offset = gotMs - wantedMs;
  return new Date(guess.getTime() - offset);
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function mmdd(m: number, d: number) {
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "Posun zpět" o offset (15min/1h/1d). 1d = 8:00 dne před.
function shiftBefore(target: Date, kind: '15min' | '1h' | '1d', baseDate?: { y: number; m: number; d: number }): Date {
  if (kind === '15min') return new Date(target.getTime() - 15 * 60 * 1000);
  if (kind === '1h') return new Date(target.getTime() - 60 * 60 * 1000);
  if (kind === '1d') {
    // 8:00 dne před `baseDate`
    const yesterday = new Date(target.getTime() - 24 * 60 * 60 * 1000);
    const pp = pragueParts(yesterday);
    return pragueToUtc(pp.y, pp.m, pp.d, MORNING_HOUR, MORNING_MIN);
  }
  return target;
}

function inWindow(target: Date, now: Date): boolean {
  const diff = target.getTime() - now.getTime();
  return diff <= WINDOW_AFTER_MS && diff >= -WINDOW_BEFORE_MS;
}

// --------- Hlavní handler ---------

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:zlatenkak@gmail.com';

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: 'VAPID keys missing' }), { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const sb = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const todayPP = pragueParts(now);
  const todayMmdd = mmdd(todayPP.m, todayPP.d);
  const todayYmd = ymd(todayPP.y, todayPP.m, todayPP.d);

  // Pomocný: dnes ráno v 8:00 (UTC ekvivalent)
  const todayMorningUtc = pragueToUtc(todayPP.y, todayPP.m, todayPP.d, MORNING_HOUR, MORNING_MIN);
  const todayEveningUtc = pragueToUtc(todayPP.y, todayPP.m, todayPP.d, EVENING_HOUR, EVENING_MIN);
  const isMorningTick = inWindow(todayMorningUtc, now);
  const isEveningTick = inWindow(todayEveningUtc, now);

  // 1) Načti všechny aktivní uživatele (ti, co mají push subscription a jsou enabled)
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('*');

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no subs' }), { status: 200 });
  }

  // Map user_id → [subscriptions]
  const byUser = new Map<string, typeof subs>();
  for (const s of subs) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id)!.push(s);
  }

  let totalSent = 0;
  const log: any[] = [];

  for (const [userId, userSubs] of byUser) {
    // Nastavení uživatele
    const { data: settings } = await sb
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const enabled = settings?.enabled ?? true;
    if (!enabled) continue;

    // Tichý čas? (porovnání v Prague wall-clock)
    if (settings?.quiet_start && settings?.quiet_end) {
      const nowMin = todayPP.h * 60 + todayPP.min;
      const [qsH, qsM] = String(settings.quiet_start).split(':').map(Number);
      const [qeH, qeM] = String(settings.quiet_end).split(':').map(Number);
      const qStart = qsH * 60 + qsM;
      const qEnd = qeH * 60 + qeM;
      const inQuiet = qStart < qEnd
        ? (nowMin >= qStart && nowMin < qEnd)
        : (nowMin >= qStart || nowMin < qEnd); // přes půlnoc
      if (inQuiet) continue;
    }

    const toSend: Array<{
      title: string; body: string;
      targetKind: string; targetId: string; notifKind: string;
      url?: string;
    }> = [];

    // === ÚKOLY ===
    if (settings?.tasks !== false) {
      const { data: tasks } = await sb
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .not('scheduled_date', 'is', null);

      for (const t of tasks || []) {
        if (t.time) {
          // Úkol s časem: 15min/1h/1d before
          const [hh, mm] = String(t.time).split(':').map(Number);
          const [y, m, d] = String(t.scheduled_date).split('-').map(Number);
          const targetUtc = pragueToUtc(y, m, d, hh, mm);
          if (t.notification && ['15min', '1h', '1d'].includes(t.notification)) {
            const fireAt = shiftBefore(targetUtc, t.notification as any);
            if (inWindow(fireAt, now)) {
              toSend.push({
                title: 'Úkol',
                body: `${t.notification === '15min' ? 'za 15 min' : t.notification === '1h' ? 'za hodinu' : 'zítra'}: ${t.title}`,
                targetKind: 'task',
                targetId: t.id,
                notifKind: t.notification,
              });
            }
          }
        } else {
          // Úkol bez času: ráno v 8 + 18
          if (t.scheduled_date === todayYmd) {
            if (isMorningTick) {
              toSend.push({
                title: 'Úkol dnes',
                body: t.title,
                targetKind: 'task',
                targetId: t.id,
                notifKind: 'morning',
              });
            }
            if (isEveningTick) {
              toSend.push({
                title: 'Úkol stále otevřený',
                body: t.title,
                targetKind: 'task',
                targetId: t.id,
                notifKind: 'evening',
              });
            }
          }
        }
      }
    }

    // === UDÁLOSTI ===
    const { data: events } = await sb
      .from('events')
      .select('*')
      .eq('user_id', userId);

    for (const e of events || []) {
      const allowed =
        (e.type === 'appointment' && settings?.appointments !== false) ||
        (e.type === 'birthday' && settings?.birthdays !== false) ||
        (e.type === 'other' && settings?.others !== false);
      if (!allowed) continue;

      const [y, m, d] = String(e.date).split('-').map(Number);

      if (e.type === 'birthday') {
        // Vždy ráno 8:00 v daný den
        if (e.date === todayYmd && isMorningTick) {
          toSend.push({
            title: 'Narozeniny',
            body: `${e.person} slaví`,
            targetKind: 'event',
            targetId: e.id,
            notifKind: 'morning',
          });
        }
        continue;
      }

      if (e.time && e.notification && ['15min', '1h', '1d'].includes(e.notification)) {
        const [hh, mm] = String(e.time).split(':').map(Number);
        const targetUtc = pragueToUtc(y, m, d, hh, mm);
        const fireAt = shiftBefore(targetUtc, e.notification as any);
        if (inWindow(fireAt, now)) {
          const headline = e.notification === '15min' ? 'za 15 minut' : e.notification === '1h' ? 'za hodinu' : 'zítra';
          const label = e.type === 'appointment' ? 'Schůzka' : (e.custom_label || 'Událost');
          toSend.push({
            title: `${label} — ${headline}`,
            body: `${e.person}${e.location ? ` · ${e.location}` : ''}`,
            targetKind: 'event',
            targetId: e.id,
            notifKind: e.notification,
          });
        }
      } else if (!e.time && e.date === todayYmd && isMorningTick) {
        // Celodenní událost — ráno
        const label = e.type === 'appointment' ? 'Schůzka' : (e.custom_label || 'Událost');
        toSend.push({
          title: `${label} dnes`,
          body: e.person,
          targetKind: 'event',
          targetId: e.id,
          notifKind: 'morning',
        });
      }
    }

    // === SVÁTKY (jmeniny lidí z adresáře) ===
    if (settings?.namedays !== false && isMorningTick) {
      const { data: people } = await sb
        .from('people')
        .select('*')
        .eq('user_id', userId)
        .eq('name_day', todayMmdd);
      for (const p of people || []) {
        const fullName = p.surname ? `${p.name} ${p.surname}` : p.name;
        toSend.push({
          title: 'Svátek slaví',
          body: fullName,
          targetKind: 'nameday',
          targetId: `${todayYmd}-${p.id}`,
          notifKind: 'morning',
        });
      }
    }

    // === ODESLÁNÍ ===
    for (const n of toSend) {
      // Zkus zapsat do sent_notifications — pokud už tam je, přeskoč (idempotence)
      const { error: insErr } = await sb
        .from('sent_notifications')
        .insert({
          user_id: userId,
          target_kind: n.targetKind,
          target_id: n.targetId,
          notif_kind: n.notifKind,
        });
      if (insErr && !insErr.message.includes('duplicate')) {
        log.push({ skip: n, err: insErr.message });
        continue;
      }
      if (insErr) continue; // duplicate = už posláno

      // Pošli na všechny endpointy daného uživatele
      const payload = JSON.stringify({
        title: n.title,
        body: n.body,
        tag: `${n.targetKind}-${n.targetId}-${n.notifKind}`,
        url: '/',
        targetKind: n.targetKind,
        targetId: n.targetId,
      });

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 60 * 60 * 24 }
          );
          totalSent++;
        } catch (e: any) {
          const code = e?.statusCode;
          if (code === 404 || code === 410) {
            // Mrtvá subscription — vymazat
            await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          } else {
            log.push({ push_err: code, msg: e?.message, endpoint: sub.endpoint.slice(-12) });
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent: totalSent, log }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
