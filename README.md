# MazurPort

System obsługi mariny: rezerwacja miejsc dla jachtów, meldowanie i rozliczanie pobytów, zgłaszanie usterek oraz zarządzanie portem. Projekt ZTPAI, React + Express + PostgreSQL.

![Panel rezerwacji](docs/screenshots/rozliczenie.png)

## Uruchomienie z czystego repozytorium

Wymagania: Git oraz Docker z Compose v2. Lokalny Node.js nie jest potrzebny do uruchomienia kontenerów.

```sh
git clone https://github.com/bg366/ztpai-projekt.git
cd ztpai-projekt
cp .env.example .env
docker compose up --build -d
docker compose --profile tools run --rm seed
```

- Aplikacja: **http://localhost:8082**
- Swagger UI: **http://localhost:8082/api/docs/**
- OpenAPI JSON: **http://localhost:8082/api/openapi.json**
- Gotowość API i bazy: **http://localhost:8082/api/health**

Pierwsze uruchomienie wykonuje migracje. Seed jest jawny i powtarzalny: dodaje brakujące dane, nie nadpisuje istniejących kont ani haseł. Tworzy 12 miejsc oraz dwa jachty żeglarza.

| Konto demonstracyjne | Rola |
| --- | --- |
| `zeglarz@mazurport.local` | Żeglarz |
| `obsluga@mazurport.local` | Obsługa portu |
| `admin@mazurport.local` | Administrator |

Hasło demonstracyjne z `.env.example`: `PortDemo123!`. Można je zmienić przez `SEED_PASSWORD` **przed pierwszym seedem**. To jawne dane do lokalnego pokazu, nie konta produkcyjne.

```sh
docker compose ps
docker compose logs api
docker compose down
```

`down` zachowuje dane. `docker compose down -v` usuwa bazę, więc używaj go tylko przy świadomym resecie lokalnego środowiska. Porty aplikacji i bazy są wystawione wyłącznie na `127.0.0.1`.

## Funkcje i role

| Funkcja | Żeglarz | Obsługa | Administrator |
| --- | --- | --- | --- |
| Własne jachty, dostępność, nowe rezerwacje | Tak | Tak | Tak |
| Lista i szczegóły rezerwacji | Własne | Wszystkie | Wszystkie |
| Anulowanie potwierdzonej rezerwacji | Własna, przed terminem | Wszystkie | Wszystkie |
| Meldowanie, wymeldowanie, rozliczenie | Nie | Tak | Tak |
| Zgłaszanie usterek | Tak | Tak | Tak |
| Naprawy, zamykanie/otwieranie miejsc, dziennik | Nie | Tak | Tak |
| Dodawanie, edycja i archiwizacja miejsc | Nie | Nie | Tak |
| Role i wyłączanie kont | Nie | Nie | Tak |

Koszt pobytu jest liczony w groszach. Każda rozpoczęta doba ma 24 godziny od planowanego przyjazdu. Wcześniejszy wyjazd nie zmniejsza opłaty, przekroczenie końca rezerwacji nalicza kolejne doby. Stawka jest zapisywana przy rezerwacji. System nie przyjmuje płatności online.

## Praca lokalna i testy

Wymagany Node.js 22. Kontenery używają tej samej wersji głównej.

```sh
npm ci
docker compose up -d db
DATABASE_URL=postgres://mazurport:mazurport_local_change_me@localhost:5434/mazurport npm run migrate
DATABASE_URL=postgres://mazurport:mazurport_local_change_me@localhost:5434/mazurport SEED_PASSWORD='PortDemo123!' npm run seed
DATABASE_URL=postgres://mazurport:mazurport_local_change_me@localhost:5434/mazurport APP_ORIGIN=http://localhost:5173 npm run dev:api
```

W drugim terminalu: `npm run dev:web`, następnie http://localhost:5173. Jeżeli zmieniono hasło bazy w `.env`, użyj tej samej wartości w `DATABASE_URL`.

```sh
npm run typecheck
npm test
docker compose --profile test up -d --wait test-db
TEST_DATABASE_URL=postgres://mazurport:test_password@localhost:5435/mazurport_test npm run test:integration
npm run build
```

Testy integracyjne uruchamiają prawdziwą bazę PostgreSQL, wykonują migracje i czyszczą dane między przypadkami. Wymagają osobnej bazy z nazwą zakończoną `_test`; nigdy nie kieruj ich do bazy aplikacji. Przypadki obejmują uprawnienia, CSRF, cudze zasoby, nakładanie terminów, równoczesne żądania, stawki i usterki. GitHub Actions wykonuje instalację, typecheck, oba zestawy testów, build oraz budowanie obrazów Docker.

## Dokumentacja

- [Architektura, bezpieczeństwo i reguły biznesowe](docs/architektura.md)
- [Diagram ERD](docs/erd.md)
- [Przykłady API i kody błędów](docs/api.md)
- [Scenariusz prezentacji i nagranie 3:53](docs/demo.md)
- [Przeprowadzona walidacja](docs/weryfikacja.md)

Struktura: `backend/src/routes.ts` definiuje dostępne operacje, `controllers.ts` obsługuje HTTP i DTO, `services/` zawiera reguły i transakcje, `repositories/` wykonuje parametryzowany SQL. Frontend znajduje się w `frontend/src/`, migracje w `backend/migrations/`.

## Konfiguracja i ograniczenia

`.env` nie trafia do Gita. Zmienne: `DATABASE_URL`, `POSTGRES_PASSWORD`, `APP_ORIGIN`, `PORT`, `COOKIE_SECURE`, `SEED_PASSWORD`. Przy zmianie adresu aplikacji ustaw odpowiedni `APP_ORIGIN`. Dla publicznego wdrożenia wymagane są HTTPS, `COOKIE_SECURE=true`, własne hasła i usunięcie kont demonstracyjnych. Lokalny Compose celowo działa przez HTTP.

Zdarzenia korzystają z `EventEmitter` w jednym procesie. Odbiorcy zapisują audyt i powiadomienia po zakończeniu transakcji. Awaria odbiorcy nie cofa rezerwacji, ale awaria procesu między COMMIT a zapisem zdarzenia może zgubić powiadomienie. Nie jest to trwała kolejka; wariant produkcyjny wymagałby outboxa i ponawiania. API nie wysyła e-maili, nie obsługuje odzyskiwania hasła ani rozliczeń bankowych.
