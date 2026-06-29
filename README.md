# Bingo App

Mobile-first aplikacja przeglądarkowa do gry w bingo (3×3 lub 4×4).

## Uruchomienie lokalne

```bash
python3 -m http.server 8080
```

Następnie wejdź na [http://localhost:8080](http://localhost:8080).

## GitHub Pages

Aplikacja jest hostowana jako statyczna strona przez GitHub Pages (workflow w `.github/workflows/pages.yml`).

## „Mini baza danych”

GitHub Pages serwuje tylko pliki statyczne — bez własnego backendu. Stan planszy (teksty, oznaczenia, rozmiar) jest zapisywany w **localStorage** przeglądarki (darmowe, bez konfiguracji). Dane zostają po odświeżeniu strony na tym samym urządzeniu i w tej samej przeglądarce.

Jeśli kiedyś potrzebujesz synchronizacji między urządzeniami, można dodać darmowy tier **Supabase** lub **Firebase**.

## Funkcje

- Wybór planszy 3×3 lub 4×4
- Wpisywanie własnego tekstu w każdej komórce
- Oznaczanie komórek przyciskiem „Mark it” (zielone tło, biały tekst)
- Automatyczny zapis stanu w przeglądarce
- Domyślny styl czarno-biały z wyraźnymi tekstami
