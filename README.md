# Bingo App

Mobile-first aplikacja przeglądarkowa do gry w bingo (3×3 lub 4×4).

## Uruchomienie lokalne

```bash
python3 -m http.server 8080
```

Następnie wejdź na [http://localhost:8080](http://localhost:8080).

## GitHub Pages

Aplikacja jest publikowana na branchu `gh-pages` (automatycznie przy każdym pushu do `main`).

**Jeśli widzisz błąd 404**, GitHub Pages nie są jeszcze włączone — zrób to raz ręcznie:

1. Otwórz [Settings → Pages](https://github.com/jakszt/bingo-app/settings/pages)
2. W **Build and deployment → Source** wybierz **Deploy from a branch**
3. Ustaw branch: **gh-pages**, folder: **/ (root)**
4. Kliknij **Save**
5. Poczekaj 1–2 minuty i odśwież: **https://jakszt.github.io/bingo-app/**

Adres po wdrożeniu: `https://jakszt.github.io/bingo-app/`

## „Mini baza danych”

GitHub Pages serwuje tylko pliki statyczne — bez własnego backendu. Stan planszy (teksty, oznaczenia, rozmiar) jest zapisywany w **localStorage** przeglądarki (darmowe, bez konfiguracji). Dane zostają po odświeżeniu strony na tym samym urządzeniu i w tej samej przeglądarce.

Jeśli kiedyś potrzebujesz synchronizacji między urządzeniami, można dodać darmowy tier **Supabase** lub **Firebase**.

## Funkcje

- Wybór planszy 3×3 lub 4×4
- Wpisywanie własnego tekstu w każdej komórce
- Oznaczanie komórek przyciskiem „Mark it” (zielone tło, biały tekst)
- Automatyczny zapis stanu w przeglądarce
- Domyślny styl czarno-biały z wyraźnymi tekstami
