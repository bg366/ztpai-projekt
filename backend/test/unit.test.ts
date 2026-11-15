import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fits,
  overlaps,
  validatePeriod,
  price,
  checkoutPrice,
  requireTransition,
  DAY,
} from "../src/domain.js";
import { DomainEvents } from "../src/events.js";
import { hashPassword, verifyPassword } from "../src/services/auth.js";
const start = new Date("2027-07-01T10:00:00Z"),
  end = new Date(start.getTime() + DAY);
test("jacht mieszczący się dokładnie w granicach miejsca jest akceptowany", () => {
  assert.equal(
    fits(
      { length_cm: 1000, width_cm: 350, draft_cm: 180 },
      { max_length_cm: 1000, max_width_cm: 350, max_draft_cm: 180 },
    ),
    true,
  );
});
test("przekroczenie dowolnego wymiaru wyklucza miejsce", () => {
  for (const dimension of ["length_cm", "width_cm", "draft_cm"])
    assert.equal(
      fits(
        {
          ...{ length_cm: 1000, width_cm: 350, draft_cm: 180 },
          [dimension]: 10001,
        },
        { max_length_cm: 1000, max_width_cm: 350, max_draft_cm: 180 },
      ),
      false,
    );
});
test("stykające się przedziały nie kolidują, jedna minuta wspólna koliduje", () => {
  assert.equal(overlaps(start, end, end, new Date(end.getTime() + DAY)), false);
  assert.equal(
    overlaps(
      start,
      end,
      new Date(end.getTime() - 60000),
      new Date(end.getTime() + DAY),
    ),
    true,
  );
});
test("cena liczy rozpoczęte doby w całkowitych groszach", () => {
  assert.equal(price(start, end, 6500), 6500);
  assert.equal(price(start, new Date(end.getTime() + 1), 6500), 13000);
  assert.equal(price(start, new Date(start.getTime() + 3600000), 6500), 6500);
});
test("wcześniejszy wyjazd nie obniża ceny, spóźnienie nalicza kolejną dobę", () => {
  assert.equal(
    checkoutPrice(start, end, new Date(start.getTime() + 3600000), 6500),
    6500,
  );
  assert.equal(
    checkoutPrice(start, end, new Date(end.getTime() + 1), 6500),
    13000,
  );
});
test("okres ma granice jednej godziny i 30 dni oraz start w przyszłości", () => {
  const now = new Date(start.getTime() - 1000);
  assert.doesNotThrow(() =>
    validatePeriod(start, new Date(start.getTime() + 3600000), now),
  );
  assert.doesNotThrow(() =>
    validatePeriod(start, new Date(start.getTime() + 30 * DAY), now),
  );
  for (const duration of [0, -1, 3599999, 30 * DAY + 1])
    assert.throws(() =>
      validatePeriod(start, new Date(start.getTime() + duration), now),
    );
  assert.throws(() =>
    validatePeriod(start, end, new Date(start.getTime() + 1)),
  );
});
test("niedozwolone przejście stanu kończy się konfliktem", () => {
  assert.doesNotThrow(() => requireTransition("CONFIRMED", "CONFIRMED"));
  assert.throws(() => requireTransition("CANCELLED", "CONFIRMED"), {
    status: 409,
  });
});
test("hasła są solone i weryfikowane, błędne hasło nie przechodzi", async () => {
  const first = await hashPassword("Bezpieczne123!"),
    second = await hashPassword("Bezpieczne123!");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("Bezpieczne123!", first), true);
  assert.equal(await verifyPassword("Nieprawidlowe", first), false);
});
test("zdarzenia są asynchroniczne, błąd jednego odbiorcy nie blokuje drugiego", async () => {
  const events = new DomainEvents(),
    seen: string[] = [];
  const original = console.error;
  console.error = () => {};
  try {
    events.on(async () => {
      throw new Error("Oczekiwana awaria odbiorcy");
    });
    events.on(async (e) => {
      seen.push(e.type);
    });
    events.publish({ type: "test", actorId: "user", payload: {} });
    assert.deepEqual(seen, []);
    await events.drain();
    assert.deepEqual(seen, ["test"]);
  } finally {
    console.error = original;
  }
});
