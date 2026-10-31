CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
 name text NOT NULL, password_hash text NOT NULL,
 role text NOT NULL DEFAULT 'SAILOR' CHECK(role IN ('SAILOR','STAFF','ADMIN')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, csrf_token text NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE boats (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id),
 name text NOT NULL, registration text NOT NULL UNIQUE,
 length_cm integer NOT NULL CHECK(length_cm>0), width_cm integer NOT NULL CHECK(width_cm>0), draft_cm integer NOT NULL CHECK(draft_cm>0),
 archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boats_owner ON boats(owner_id);
CREATE TABLE berths (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 max_length_cm integer NOT NULL CHECK(max_length_cm>0), max_width_cm integer NOT NULL CHECK(max_width_cm>0), max_draft_cm integer NOT NULL CHECK(max_draft_cm>0),
 rate_cents integer NOT NULL CHECK(rate_cents>0), status text NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','CLOSED')),
 closure_reason text NOT NULL DEFAULT '', archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 boat_id uuid NOT NULL REFERENCES boats(id), berth_id uuid NOT NULL REFERENCES berths(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
 status text NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED')),
 rate_cents integer NOT NULL CHECK(rate_cents>0), quoted_cents integer NOT NULL CHECK(quoted_cents>0),
 checked_in_at timestamptz, checked_out_at timestamptz, final_cents integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT berth_no_overlap EXCLUDE USING gist (berth_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('CONFIRMED','CHECKED_IN')),
 CONSTRAINT boat_no_overlap EXCLUDE USING gist (boat_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('CONFIRMED','CHECKED_IN'))
);
CREATE UNIQUE INDEX one_checked_in_per_berth ON reservations(berth_id) WHERE status='CHECKED_IN';
CREATE INDEX reservations_user ON reservations(user_id);
CREATE TABLE faults (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), berth_id uuid NOT NULL REFERENCES berths(id),
 reporter_id uuid NOT NULL REFERENCES users(id), description text NOT NULL,
 severity text NOT NULL CHECK(severity IN ('MINOR','CRITICAL')),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','RESOLVED')),
 resolution text NOT NULL DEFAULT '', resolved_by uuid REFERENCES users(id), resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX faults_berth ON faults(berth_id);
CREATE TABLE audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, type text NOT NULL,
 actor_id uuid REFERENCES users(id), payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user ON notifications(user_id,created_at DESC);
