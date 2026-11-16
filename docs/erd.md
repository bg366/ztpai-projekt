# Diagram ERD

Pięć encji domenowych to użytkownik, jacht, miejsce, rezerwacja i usterka. Sesja, zdarzenie audytu i powiadomienie obsługują bezpieczeństwo oraz komunikację.

```mermaid
erDiagram
 USERS ||--o{ BOATS : posiada
 USERS ||--o{ RESERVATIONS : rezerwuje
 USERS ||--o{ FAULTS : zglasza
 USERS ||--o{ SESSIONS : loguje_sie
 USERS ||--o{ NOTIFICATIONS : otrzymuje
 USERS ||--o{ AUDIT_EVENTS : wykonuje
 BOATS ||--o{ RESERVATIONS : uczestniczy
 BERTHS ||--o{ RESERVATIONS : przyjmuje
 BERTHS ||--o{ FAULTS : ma
 USERS {
  uuid id PK
  text email UK
  text name
  text password_hash
  text role
  boolean active
  timestamptz created_at
 }
 BOATS {
  uuid id PK
  uuid owner_id FK
  text name
  text registration UK
  int length_cm
  int width_cm
  int draft_cm
  boolean archived
 }
 BERTHS {
  uuid id PK
  text code UK
  int max_length_cm
  int max_width_cm
  int max_draft_cm
  int rate_cents
  text status
  text closure_reason
  boolean archived
 }
 RESERVATIONS {
  uuid id PK
  uuid user_id FK
  uuid boat_id FK
  uuid berth_id FK
  timestamptz starts_at
  timestamptz ends_at
  text status
  int rate_cents
  int quoted_cents
  int final_cents
  timestamptz checked_in_at
  timestamptz checked_out_at
 }
 FAULTS {
  uuid id PK
  uuid berth_id FK
  uuid reporter_id FK
  text description
  text severity
  text status
  text resolution
  uuid resolved_by FK
  timestamptz resolved_at
 }
 SESSIONS {
  uuid id PK
  uuid user_id FK
  text token_hash UK
  text csrf_token
  timestamptz expires_at
 }
 AUDIT_EVENTS {
  bigint id PK
  uuid actor_id FK
  text type
  jsonb payload
  timestamptz created_at
 }
 NOTIFICATIONS {
  uuid id PK
  uuid user_id FK
  text message
  timestamptz read_at
  timestamptz created_at
 }
```

Rezerwacje przechowują stawkę z chwili utworzenia. Wymiary są w centymetrach, kwoty w groszach, daty jako `timestamptz`. Jachty i miejsca są archiwizowane zamiast kasowania historii. Klucze obce wymuszają spójność; e-maile, numery rejestracyjne i oznaczenia miejsc są unikalne.

Ograniczenia `berth_no_overlap` i `boat_no_overlap` korzystają z `btree_gist` i przedziałów `tstzrange`. Obejmują stany `CONFIRMED` i `CHECKED_IN`, więc anulowana albo zakończona rezerwacja nie blokuje nowego terminu. Indeksy częściowe chronią również bieżące meldowanie. Dokładny model znajduje się w migracjach SQL.
