-- Terminy rezerwacji mogą się stykać, ale jacht musi zakończyć poprzedni pobyt.
CREATE UNIQUE INDEX one_checked_in_per_boat
 ON reservations(boat_id) WHERE status='CHECKED_IN';
