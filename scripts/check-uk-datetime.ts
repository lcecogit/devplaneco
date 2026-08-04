// Sanity check for lib/time/uk-datetime.ts — run with
//   npm run check:uk-datetime
//
// Worth keeping rather than deleting: the first version of this conversion
// double-applied the BST offset and wrote every summer booking an hour early
// (8am collection stored as 06:00Z instead of 07:00Z). That kind of error is
// invisible in the UI — the page re-renders the customer's chosen window from
// the quote, not from the job — and only shows up when a driver turns up at
// the wrong time. The DST-boundary cases below are the ones that matter.

import { ukWallClockToUtcIso } from "../src/lib/time/uk-datetime";

const cases: { date: string; hour: number; expect: string; note: string }[] = [
  { date: "2026-01-14", hour: 8, expect: "2026-01-14T08:00:00.000Z", note: "winter, GMT — no offset" },
  { date: "2026-01-14", hour: 18, expect: "2026-01-14T18:00:00.000Z", note: "winter, GMT" },
  { date: "2026-08-05", hour: 8, expect: "2026-08-05T07:00:00.000Z", note: "summer, BST — one hour behind wall clock" },
  { date: "2026-08-05", hour: 18, expect: "2026-08-05T17:00:00.000Z", note: "summer, BST" },
  // Clocks go forward 01:00 GMT on 29 Mar 2026 and back 02:00 BST on 25 Oct.
  { date: "2026-03-29", hour: 0, expect: "2026-03-29T00:00:00.000Z", note: "before the spring-forward, same day" },
  { date: "2026-03-29", hour: 8, expect: "2026-03-29T07:00:00.000Z", note: "after the spring-forward, same day" },
  { date: "2026-10-25", hour: 0, expect: "2026-10-24T23:00:00.000Z", note: "before the fall-back, same day" },
  { date: "2026-10-25", hour: 8, expect: "2026-10-25T08:00:00.000Z", note: "after the fall-back, same day" },
];

let failures = 0;
for (const testCase of cases) {
  const actual = ukWallClockToUtcIso(testCase.date, testCase.hour);
  const pass = actual === testCase.expect;
  if (!pass) failures += 1;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${testCase.date} ${String(testCase.hour).padStart(2, "0")}:00 London -> ${actual}` +
      `${pass ? "" : ` (expected ${testCase.expect})`}  — ${testCase.note}`
  );
}

console.log(failures === 0 ? "\nAll cases passed." : `\n${failures} case(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
