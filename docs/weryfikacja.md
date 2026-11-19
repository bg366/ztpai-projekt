# Weryfikacja projektu

Weryfikację wykonano 19.11.2026 na lokalnym Dockerze. Testy integracyjne używają rzeczywistego PostgreSQL 16.

- TypeScript backendu i frontendu: poprawny typecheck.
- Testy jednostkowe: 9 przypadków, m.in. wymiary, granice dat, rozpoczęte doby, przejścia stanów, hasła i niezależni odbiorcy zdarzeń.
- Testy integracyjne: 19 przypadków w wersji końcowej, w tym równoczesne rezerwacje z wynikiem 201/409, własność zasobów, CSRF, role, unieważnienie sesji, podwójne meldowanie jachtu i obsługa awarii.
- Obrazy Node.js 22 oraz Nginx: poprawny build. Migracje wykonały się przy starcie API, wszystkie trzy serwisy osiągnęły stan healthy.
- Czysty klon z osobnym projektem Compose i nowym wolumenem: build, migracje i seed zakończyły się powodzeniem; HTTP health 200, logowanie żeglarza 200, dwa jachty i 12 miejsc. Tymczasowy wolumen kontrolny usunięto po sprawdzeniu.
- Swagger UI: rzeczywisty request przez Try it out / Execute do `/health`, odpowiedź 200 i `{"status":"ok"}`.
- Przeglądarka: logowanie, rezerwacja, zgłoszenie krytyczne, błąd zbyt wczesnego meldowania, check-in, check-out i koszt 65 zł, rozwiązanie usterki, otwarcie miejsca i dziennik zdarzeń.
- CRUD jachtu sprawdzony przez UI na ekranie 390 px: dodanie, zmiana długości z 7 do 7,1 m i usunięcie z potwierdzeniem.
- Widok 1440 px i 390 px: sprawdzona czytelność, menu mobilne, formularz modalny, brak poziomego przewijania całej strony. Tabele na małym ekranie przewijają się we własnym kontenerze.
- Unieważnienie sesji w drugim oknie: kolejna operacja w panelu przywraca ekran logowania. Sprawdzono logowanie obsługi i brak dostępu do panelu użytkowników w jej nawigacji. Ukryte menu mobilne nie przejmuje fokusu klawiatury.
- Migracje 001 i 002: zastosowane na istniejącej bazie demonstracyjnej. Ponowne uruchomienie zachowało dane i poprawnie wykryło wykonane migracje.
- `npm audit --omit=dev`: brak zgłoszonych podatności w zależnościach produkcyjnych w chwili sprawdzenia.
- Nagranie demonstracji: rzeczywisty MP4/H.264, 232,84 s. Obrazy PNG pochodzą z działającej aplikacji, bez domalowywania wyników.

Artefakty: `docs/screenshots/`, `docs/demo.mp4`. Dokumentacja nie zastępuje samodzielnego uruchomienia ani zrozumienia projektu przed obroną.

## Rzeczywiste przebiegi CI

PR: [Blokada podwójnego meldowania tego samego jachtu](https://github.com/bg366/ztpai-projekt/pull/1).

| Przebieg | Commit | Wynik |
| --- | --- | --- |
| [Wersja bazowa](https://github.com/bg366/ztpai-projekt/actions/runs/44579780246) | `c22f106` | Zielony, dotychczasowe testy i build |
| [Test regresji](https://github.com/bg366/ztpai-projekt/actions/runs/44579898877) | `c8d6d5d` | Czerwony, dokładnie jeden błąd: oczekiwane 409, otrzymane 200 |
| [Poprawka](https://github.com/bg366/ztpai-projekt/actions/runs/44580118184) | `d0a0b22` | Zielony, 9 testów jednostkowych, 19 integracyjnych, typecheck, build i obrazy Docker |

Błąd dotyczył jachtu z niezakończonym pobytem na pierwszym miejscu i kolejną, stykającą się rezerwacją na drugim miejscu. Test pozostał bez osłabiania asercji. Poprawka rozszerzyła kontrolę serwisu i dodała częściowy indeks unikalny dla aktywnego meldowania jachtu. Czerwony i zielony przebieg są w tym samym PR, z rzeczywistą datą 19.11.2026.

Daty części nowych commitów implementacyjnych ustawiono ręcznie na uzgodniony zakres 30.10–18.11.2026. Są metadanymi Git, nie dowodem prowadzenia prac przez trzy tygodnie. Weryfikacja, publikacja oraz uruchomienia GitHub Actions mają rzeczywiste daty.
