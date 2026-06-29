# Bingo App

Mobile-first aplikacja przeglądarkowa do gry w bingo (3×3 lub 4×4), hostowana na **Cloudflare Workers** z bazą **D1**.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem podanym przez Wrangler (zwykle `http://localhost:8787`).

## Deploy na Cloudflare

Projekt używa Cloudflare Workers (statyczne pliki + API) i bazy D1 `bingo-app-db`.

### Aktualny deploy (preview)

Aplikacja jest wdrożona i działa pod adresem:

**https://bingo-app.goofy-yarrow.workers.dev**

Aby przenieść deploy na stałe konto Cloudflare (ważne ~60 min od wdrożenia), otwórz link claim w przeglądarce i zaloguj się na swoje konto Cloudflare:

**https://dash.cloudflare.com/claim-preview?claimToken=QccWSGOMlxyqSqBbzyHd7sD-O6gFjyRMVAkjOkC7TLg**

### Wymagane sekrety w GitHub (Settings → Secrets)

- `CLOUDFLARE_API_TOKEN` — token z uprawnieniami Workers Scripts:Edit i D1:Edit
- `CLOUDFLARE_ACCOUNT_ID` — ID konta Cloudflare

### Ręczny deploy

```bash
npm install
npm run db:migrate
npm run deploy
```

Wymaga zalogowania: `npx wrangler login`

## Architektura

- `public/` — frontend (HTML, CSS, JS)
- `src/worker.js` — API `/api/board/:id` zapisujące stan w D1
- `wrangler.jsonc` — konfiguracja Workera i bindingu D1

Każde bingo ma unikalny 6-znakowy kod. Stan planszy (nazwa, teksty, oznaczenia, rozmiar) jest zapisywany w chmurze w D1.

## Funkcje

- Ekran startowy: utwórz nowe bingo (nazwa + unikalny kod) lub dołącz kodem
- Wybór planszy 3×3 lub 4×4
- Wpisywanie własnego tekstu w każdej komórce
- Oznaczanie komórek przyciskiem „Mark it” (zielone tło, biały tekst)
- Automatyczny zapis stanu w Cloudflare D1
- Domyślny styl czarno-biały z wyraźnymi tekstami
