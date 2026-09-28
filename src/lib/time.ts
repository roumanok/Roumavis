import { Temporal } from "@js-temporal/polyfill";
export const relationshipStart = Temporal.ZonedDateTime.from(
  "2004-07-09T03:00:00-03:00[America/Argentina/Buenos_Aires]",
);
export function relationshipDuration(iso = new Date().toISOString()) {
  const now = Temporal.Instant.from(iso).toZonedDateTimeISO(
    "America/Argentina/Buenos_Aires",
  );
  return relationshipStart.until(now, {
    largestUnit: "years",
    smallestUnit: "seconds",
    roundingMode: "trunc",
  });
}
