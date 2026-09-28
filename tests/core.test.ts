import test from "node:test";
import assert from "node:assert/strict";
import { relationshipDuration } from "../src/lib/time";
import { sign, verify } from "../src/lib/session";
import { contentSchema, defaults, surveySchema } from "../src/lib/models";

test("calendar counter uses Buenos Aires and exact anniversary boundaries", () => {
  const start = relationshipDuration("2004-07-09T06:00:00Z");
  assert.equal(start.total("seconds"), 0);
  const day = relationshipDuration("2026-10-10T13:43:18Z");
  assert.deepEqual(
    [day.years, day.months, day.days, day.hours, day.minutes, day.seconds],
    [22, 3, 1, 7, 43, 18],
  );
  const before = relationshipDuration("2026-07-09T05:59:59Z");
  assert.deepEqual(
    [
      before.years,
      before.months,
      before.days,
      before.hours,
      before.minutes,
      before.seconds,
    ],
    [21, 11, 29, 23, 59, 59],
  );
  const leap = relationshipDuration("2024-03-01T06:00:00Z");
  assert.deepEqual([leap.years, leap.months, leap.days], [19, 7, 21]);
});
test("sessions reject tampering, wrong roles and expiration", () => {
  process.env.SESSION_SECRET =
    "unit-test-only-secret-with-at-least-32-characters";
  const token = sign("guest", 1000);
  assert.equal(verify(token, "guest", 2000), true);
  assert.equal(verify(token, "admin", 2000), false);
  assert.equal(verify(token + "x", "guest", 2000), false);
  assert.equal(verify(token, "guest", 1000 + 61 * 86400000), false);
  assert.equal(verify(undefined, "guest"), false);
  assert.equal(verify("guest.NaN.x", "guest"), false);
  const admin = sign("admin", 1000);
  assert.equal(verify(admin, "admin", 1000 + 9 * 3600000), false);
});
test("editable content requires all 22 unique years and bounds text", () => {
  assert.equal(contentSchema.safeParse(defaults).success, true);
  assert.equal(
    contentSchema.safeParse({ ...defaults, history: defaults.history.slice(1) })
      .success,
    false,
  );
  assert.equal(
    contentSchema.safeParse({
      ...defaults,
      history: defaults.history.map(() => defaults.history[0]),
    }).success,
    false,
  );
});
test("survey accepts only nine actual ratings and the specified repeat choices", () => {
  const valid = {
    id: crypto.randomUUID(),
    ratings: Array(9).fill(5),
    repeatTrip: "NO PUEDO ESPERAR",
    favorite: "",
    missed: "",
    message: "",
  };
  assert.equal(surveySchema.safeParse(valid).success, true);
  assert.equal(
    surveySchema.safeParse({ ...valid, ratings: [0, ...Array(8).fill(5)] })
      .success,
    false,
  );
  assert.equal(
    surveySchema.safeParse({ ...valid, repeatTrip: "NO" }).success,
    false,
  );
});
