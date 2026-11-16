# Demonstracja MazurPort

[Obejrzyj nagranie MP4](demo.mp4), długość **3 min 53 s**. Nagranie przedstawia rzeczywiste działanie lokalnej aplikacji i API, wykonane 19.11.2026. Nie zawiera narracji. Czasy poniżej są orientacyjne.

| Czas | Co widać |
| --- | --- |
| 0:00–0:30 | Logowanie żeglarza i panel portu |
| 0:30–1:05 | Wyszukanie dopasowanego miejsca A-01, cena 65 zł i potwierdzenie |
| 1:05–1:35 | Zgłoszenie krytycznej usterki zasilania przy A-02 |
| 1:35–2:00 | Logowanie administratora i kontrola rezerwacji |
| 2:00–2:20 | Obsłużony błąd zbyt wczesnego meldowania, następnie poprawne zameldowanie i wymeldowanie |
| 2:20–3:25 | Rozwiązanie usterki i ponowne otwarcie A-02 |
| 3:25–3:53 | Dziennik zdarzeń oraz widok na wąskim ekranie |

## Powtórzenie pokazu

1. Uruchom Compose i seed zgodnie z README.
2. Zaloguj się jako żeglarz. Wybierz Błękitną, przyjazd za około dwie minuty i wyjazd następnego dnia. Zarezerwuj dostępne miejsce.
3. Zgłoś krytyczną usterkę na innym miejscu. Pokaż jego zamknięcie i brak nowych rezerwacji.
4. Zaloguj się jako obsługa lub administrator. Przed początkiem terminu spróbuj meldowania, aby pokazać błąd reguły biznesowej. Po rozpoczęciu terminu zamelduj i wymelduj jacht.
5. Otwórz szczegóły zakończonej rezerwacji. Wcześniejsze wymeldowanie zachowuje koszt zarezerwowanej doby.
6. Rozwiąż usterkę z opisem naprawy, a następnie otwórz miejsce. Sprawdź dziennik i powiadomienia żeglarza.

## Pytania do obrony

- Dlaczego przedziały są półotwarte i co stanie się przy dwóch równoczesnych POST-ach?
- W której warstwie sprawdzana jest własność, rola i dopasowanie wymiarów?
- Dlaczego zmiana cennika nie zmienia kosztu istniejącej rezerwacji?
- Jak działa cookie HttpOnly i token CSRF? Dlaczego frontend nie jest granicą bezpieczeństwa?
- Co dzieje się ze zdarzeniem po COMMIT i jakie ograniczenie ma EventEmitter?
- Jak zachowuje się aplikacja przy restarcie kontenerów i ponownym seedzie?

Przy prezentacji warto otworzyć serwis rezerwacji, migrację z `EXCLUDE`, jeden test integracyjny oraz Swagger UI. README i ERD opisują przepływ bez konieczności pokazywania całego kodu.
