# Organizér — aktuální produktové schopnosti

Osobní organizér v ručně-malovaném stylu pro českého uživatele. Sjednocuje kalendář, úkoly, poznámky, adresář blízkých a vzpomínky do jedné tiché appky, která funguje na mobilu, tabletu i desktopu.

---

## 1. Tři hlavní pohledy

Uživatel se v aplikaci pohybuje mezi třemi rovnocennými sekcemi:

- **Kalendář** — měsíční přehled, dnešní den, plánování událostí.
- **Úkoly** — kanbanová tabule rozdělená podle kategorií.
- **Poznámky** — masonry lístečky s ručně psanými poznámkami.

Přepínání mezi nimi je vždy dostupné v hlavičce na mobilu i desktopu. Stav (vybraný den, aktivní kategorie) se mezi pohledy přenáší.

---

## 2. Kalendář

### Měsíční pohled

- Uživatel vidí celý kalendářní měsíc s českými dny v týdnu, víkendy jsou vizuálně utlumené.
- Šipkami v hlavičce listuje mezi měsíci, tlačítkem **„Dnes"** se vrací na aktuální měsíc.
- **Dnešní den** je v kalendáři zvýrazněn ručně-malovaným kroužkem.
- **Vybraný den** se odlišuje barevným orámováním a otevírá detail vpravo (desktop) nebo pod kalendářem (mobil).
- V každé buňce dne jsou:
  - **Číslo dne**
  - **Doodle srdíčko**, pokud na ten den někdo zapamatoval výročí
  - **Žlutý proužek**, pokud někdo z adresáře v ten den slaví svátek nebo narozeniny
  - **Až 3 ikonky/popisky** událostí a úkolů, ostatní se zobrazí jako „+ N dalších"

### Mini-kalendář (desktop sidebar)

- V levém sloupci je vždy zmenšený měsíční přehled pro rychlou navigaci.
- Stejné indikátory jako velký kalendář: dnešek, vybraný den, žlutý proužek pro slavící, srdíčka pro výročí, tečka pro dny s obsahem.

### Časová osa (timeline)

- Nad měsíčním přehledem je vodorovný proužek 06:00–22:00 ukazující dnešní rozvrh.
- Schůzky se zobrazují jako barevné bloky napříč svým časovým rozsahem.
- Úkoly s nastaveným časem jsou jako tečky pod osou.
- Indikátor **„nyní"** je svislá čára na aktuálním čase.

### Denní poznámka

- Ke každému dni si uživatel může napsat krátkou poznámku v ručně psaném písmu („vyzvednout léky", „chemička v lékárně").
- Editovatelná inline, ukládá se sama.

---

## 3. Detail dne (pravý sloupec / day rail)

Když uživatel vybere den, vpravo se zobrazí:

- **Datum a den v týdnu**
- **Český svátek** (jméno z kalendáře svátků, klikací na seznam lidí)
- **Speciální svátky** (viz sekce 8) jako barevné pilulky
- **Sekce Události** — typy ke vložení (Schůzka / Narozeniny / Ostatní) + existující události na ten den
- **Sekce Úkoly** — existující úkoly + rychlé tlačítko pro přidání
- **Sekce Brzy** — nadcházejících 14 dní, seřazeno

Každá sekce defaultně ukazuje **první 3 položky** s tlačítkem **„+ N dalších"** k rozbalení / sbalení. Při přepnutí na jiný den se sekce vrátí do sbaleného stavu.

---

## 4. Události (kalendář)

### Typy

- **Schůzka** — pro klasické setkání s osobou v konkrétním čase.
- **Narozeniny / svátek** — celodenní událost, primárně se vyplňuje z adresáře.
- **Ostatní** — vlastní volný typ s pojmenovatelným štítkem („Klíště", „Tržnice", …). Jednou vytvořený štítek se nabízí v dalších záznamech (datalist).

### Pole

- **Osoba** (povinné)
- **Datum od – do** (pro vícedenní události typu cesta nebo prázdniny)
- **Čas od – do** (zobrazí se jako blok v časové ose)
- **Místo** (jen u schůzky)
- **Vlastní štítek** (jen u „Ostatní")
- **Připomenutí** (viz sekce 11)

### Automaticky generované události

- **Narozeniny lidí z adresáře** se každý rok automaticky propisují do kalendáře, nejsou potřeba ručně.

---

## 5. Úkoly (kanban)

### Kanbanová tabule

- Sloupce odpovídají kategoriím úkolů.
- **Dynamicky se zobrazují jen sloupce s úkoly** — prázdné kategorie tabuli nezahlcují.
- Zobrazené sloupce se rovnoměrně rozlejí po šířce.
- V sidebaru má uživatel přístup ke všem kategoriím (i prázdným) pro přidání nového úkolu.

### Editace kategorií

- Kliknutím na hlavičku sloupce uživatel kategorii přejmenuje.
- V Nastavení může změnit i její barvu.
- Výchozí kategorie: **Práce, Rodina, Osobní, Ostatní**.

### Úkoly

- Pole: titulek, kategorie, datum (volitelně), čas (volitelně), připomenutí, splnění.
- Klik na den v mini-kalendáři v pohledu Úkoly otevře dialog na nový úkol s předvyplněným datem.
- Úkoly bez data se zobrazí jako nedělané na dnešku, ať neuniknou.
- Odškrtnutí úkolu se okamžitě zaznamená a po **5 dnech** se úkol sám smaže (viz sekce 13).

---

## 6. Poznámky (Mini-notes)

- Třetí rovnocenný pohled, ne podsekce.
- Tvoří **masonry mříž ručně-malovaných lístečků** — každý lísteček má jednu ze 4 doodle obrysových variant.
- **Titulek** (volitelný, displayed display fontem) a **tělo** (psané rukou ručně-malovaným fontem).
- **Pin** připne lístek nahoru.
- Datum vzniku je viditelné.
- Lístečky se otvírají v editoru přes celou plochu, ukládají se na blur.

---

## 7. Lidé (adresář svátků a narozenin)

- Uživatel vede vlastní seznam blízkých.
- Každý záznam: **Jméno, Příjmení, Svátek (DD.MM), Narozeniny (YYYY-MM-DD)**.
- **Auto-detekce svátku podle jména** podle českého kalendáře svátků (založeno na 366 dnech).
- **Plně editovatelný seznam** — uživatel může změnit jméno, příjmení, svátek (i ručně, např. pro někoho, kdo si změnil jméno a chce slavit původní den) a narozeniny.
- Auto-detekce při editaci jména **nepřepíše** existující ručně zadaný svátek.
- Uvnitř příjmení a narozenin lze pole vymazat, položku smazat tlačítkem.
- Kliknutí na český svátek v kalendáři (např. „svátek Valdemar") otevře adresář.

---

## 8. Speciální svátky a oslavné dny

Vedle českého kalendáře jmen (366 dní) appka zná i:

### Tradiční / lidskoprávní (✦ zlaté)

- Mezinárodní den žen (8.3.)
- Den Země (22.4.)
- Den dětí (1.6.)
- Štědrý den (24.12.)

### Pohanské kolo roku (☾ zelené)

- Imbolc (1.2.), Ostara (21.3.), Beltane (1.5.), Litha (21.6.), Lughnasadh (1.8.), Mabon (22.9.), Samhain (31.10.), Yule (21.12.)

### Velikonoce (✿ fialové) — počítané pro daný rok

- Velký pátek, Velikonoční neděle, Velikonoční pondělí

### Rodinné svátky (♥ modré) — počítané pro daný rok

- Den matek (2. neděle v květnu)
- Den otců (3. neděle v červnu)

### Hravé / popkulturní (✺ růžové)

- Svátek zamilovaných (14.2.), Apríl (1.4.), Mezinárodní den knihy (23.4.), Svátek lásky Máchův Máj (1.5.), Den Star Wars (4.5.), Ručníkový den (25.5.), Den Harryho Pottera (22.7.), Den Hobbita (21.9.)

Každý typ má svoji barevnou pilulku s ikonkou, zobrazuje se v sidebaru („dnes je"), v detailu vybraného dne i v rozbaleném dnu na mobilu.

---

## 9. Výročí (post-event memory)

- Po skončení **Schůzky** nebo **Ostatní události** (max. 14 dní zpětně) appka tiše vyskočí s doodle pop-upem **„Mám si tohle zapamatovat?"**.
- Uživatel může napsat **vzkaz sobě za rok** (rukou psaný textový vstup) a uložit, nebo prompt zavřít.
- Uložené výročí se každý rok v daný den v kalendáři ohlásí **doodle srdíčkem**.
- Klik na srdíčko otevře vzpomínku: 1–10 srdíček podle počtu let (nad 10 už jen číslo), titul, místo, vzkaz v Caveat bublině.
- Seznam všech výročí je dostupný v Nastavení.
- Appka má **zámek prvního spuštění** — neptá se na události, které se odehrály před tím, než uživatel feature poprvé spustil.

---

## 10. Probliknutí jména slavícího

- Pokud někdo z adresáře dnes slaví svátek nebo narozeniny, na hlavní obrazovce se objeví **žlutá karta „TVOJI SLAVÍ: Petra, Josef"**.
- Jméno se **pravidelně probliká** (cca jednou za 7 sekund několik krátkých záblesků), aby si toho uživatel všiml.
- V Nastavení lze probliknutí **vypnout** přepínačem ZAP/VYP, aniž by zmizela karta samotná.

---

## 11. Upozornění a notifikace

### Konfigurace per událost / úkol

Uživatel může u libovolné události nebo úkolu s časem nastavit:

- **15 minut předem**
- **1 hodinu předem**
- **1 den předem** (= ráno v 8:00 předchozího dne)
- **Cascade** = všechna tři postupně
- **Žádné**

### Pravidla, která fungují vždy automaticky

- **Vždy v přesný čas události**, pokud má jakékoli připomenutí zapnuté (nejen X minut/hodin předem).
- **Úkol bez času** s dnešním datem: ráno v 8:00 a v 18:00.
- **Narozeniny** lidí z adresáře: ráno v 8:00 v den narozenin.
- **Svátky** lidí z adresáře: ráno v 8:00 ve dni svátku.

### Doručení

- **Při zavřené appce** přijde **systémová notifikace** (Windows / Android / macOS / iOS po instalaci na plochu).
  - Notifikace **nezmizí sama** — drží na obrazovce, dokud na ni uživatel nezareaguje.
  - Nabízí akci **„Otevřít"** (skočí do appky) a **„Posunout (10 min)"**.
- **Při otevřené appce** se místo sterilní bubliny zobrazí **plný doodle pop-up** v duchu vizuálu appky.

### Globální nastavení

- Uživatel může notifikace zapnout/vypnout v Nastavení.
- Po prvním zapnutí prohlížeč požádá o povolení; v případě odmítnutí je popsáno, jak to v prohlížeči odblokovat.
- **Tichý čas** (default 22:00–07:00) — během něj se nic neposílá.
- **Per-typ vypínače** (schůzky, narozeniny, svátky, úkoly, ostatní).

### Náhled

- V Nastavení je tlačítko **„Otestovat vzhled upozornění"**, které ukáže, jak vypadá doodle pop-up pro 5 typů (Schůzka, Narozeniny, Svátek, Úkol, Ostatní).

---

## 12. Cloud sync (online účet)

- Při prvním otevření se uživatel přihlásí **magic-linkem** (zadá e-mail, klikne na odkaz z mailu, žádné heslo).
- Účet si může založit kdokoliv (veřejná registrace).
- Po přihlášení appka:
  - **Pulluje data z cloudu** a nahrazuje jimi lokální stav, případně
  - **Pushuje lokální data nahoru**, pokud byl cloud prázdný (jednorázová migrace).
- Změny se **synchronizují v reálném čase** mezi všemi přihlášenými zařízeními (desktop, mobil, tablet).
- Data jsou izolovaná per uživatel (nikdo nevidí cizí záznamy).
- **Offline režim** funguje — lokální úložiště drží stav, sync se vyřeší při opětovném připojení.
- Uživatel se může odhlásit v Nastavení.

---

## 13. Auto-úklid po 5 dnech

- **Splněné úkoly** se 5 dní po odškrtnutí sami smažou.
- **Skončené události** (kromě narozenin) se 5 dní po skončení sami smažou — **ale jen pokud:**
  - Outro pop-up „Mám si tohle zapamatovat?" už proběhl
  - Uživatel nezvolil uložit výročí
- Události s uloženým výročím **zůstávají navždy** (chce-li je smazat, dělá to ručně).
- Narozeniny se nemažou nikdy (jsou věčné).

Cílem je udržovat kalendář čistý bez toho, aby uživatel musel ručně promazávat staré věci.

---

## 14. Vzhled a tón

- **Vizuální jazyk**: ručně-malovaný, doodle SVG kresby, hlavní barva **malinová `#7A1840`**, bílé pozadí karet (žádné béžové).
- **Typografie**:
  - Display: **Syne** (jména, čísla dní)
  - Tělo: **Space Grotesk**
  - Mono: **IBM Plex Mono** (popisky, časy)
  - Ručně psané: **Caveat** (poznámky, vzkazy, vybrané popisky)
- **Tón**: tykání, lidský, ne corporate. Příklady mikrokopií: „chvilku…", „už nic není", „pošli mi přihlašovací odkaz".
- **Emoji** se neobjevují (nebo jen velmi zřídka jako součást doodle SVG).
- **Doodle objekty**: TodayDoodle (kroužek dnešního dne), DoodleHeart (srdíčko výročí), DoodleNotePaper (lísteček poznámky), DoodleFrame (rám), DoodleUnderline (podtržítko), DoodleButton, doodle ikonky pro typy upozornění.

---

## 15. Responzivita

- **Mobil** (do 1023 px): jednoduché vertikální rozložení, FAB tlačítko pro nový záznam, header + view + modal slot.
- **Desktop** (od 1024 px): tříkomponentové rozložení — sidebar (sidebar + mini-měsíc + nav) | hlavní oblast (kalendář / úkoly / poznámky) | day rail (detail vybraného dne, brzy, časová osa).
- Layout se mění živě podle šířky okna.

---

## 16. PWA — instalace jako appka

- Uživatel může appku **nainstalovat na plochu** (mobil i desktop) přes vlastní funkci prohlížeče („Přidat na plochu" / „Nainstalovat aplikaci").
- Po instalaci se chová jako nativní appka: vlastní ikona, samostatné okno bez adresního řádku, ikona v dock / start menu.
- **Offline** funguje díky service workeru — první načtení uloží assets, pak appka jede bez sítě.
- **Auto-update** — když je deployovaná nová verze, service worker ji při dalším otevření aktivuje.
- Manifest: jméno „Organizér", malinová theme color, ikonky 192 a 512 px (včetně maskable).

---

## 17. Nastavení

V jednom dialogu uživatel najde:

- **Kategorie úkolů** — klik upravit (název, barva)
- **Push notifikace** — zapnout / vypnout, informace o stavu povolení v prohlížeči
- **Otestovat vzhled upozornění** — náhled 5 typů
- **Seznam výročí** — všechny uložené vzpomínky
- **Občas problikávat jméno slavícího** — ZAP / VYP
- **Odhlásit se** — z cloud účtu (po odhlášení appka jede offline / nabízí znovu přihlášení)

---

## 18. Klíčové ne-funkční požadavky

- **Žádné secrets v gitu** — všechny klíče jen v `.env` (gitignored) a v Supabase secrets.
- **Row-Level Security** — databázová pravidla na úrovni řádku, žádný řádek neopustí svého uživatele.
- **Bez paywallu, bez reklam, bez gamifikace** — appka neotravuje, neukazuje streak, nenutí používat.
- **Bez závislostí na třetích stranách** kromě Supabase (Postgres + Auth + Realtime + Edge Functions) a Vercelu (hosting). Žádný Google Analytics, žádné trackery.
- **Čeština jako default** — UI texty, formáty data (DD.MM.YYYY, dny v týdnu, měsíce v genitivu).

---

## 19. Co aplikace zatím neumí (mimo rozsah)

Tento seznam je pro orientaci, **co by se mohlo dotahovat dál**:

- Vyhledávání v kalendáři (políčko „Hledat v kalendáři…" je zatím jen vizuální).
- Opakující se události (každý týden, každý měsíc, …) — narozeniny jsou jediná opakovaná logika, kterou má.
- Sdílení záznamů mezi uživateli (např. rodinný kalendář).
- Export do iCal / CSV.
- Příloh u událostí / úkolů (obrázky, soubory).
- Vlastní svátky definované uživatelem (rozšíření speciálních svátků).
- Týdenní pohled v kalendáři.
- Tmavý režim.
- Lokalizace mimo češtinu.
