import assert from "node:assert/strict";
import { test } from "node:test";

/** The two guards the rate card editor applies before writing.
 *
 *  Both exist because the failure they prevent is invisible until a customer
 *  is quoted: bands that do not ascend silently mis-price every move, and a
 *  later band costing more per ft³ than an earlier one makes a bigger move
 *  cost more per cubic foot, which is a pricing error rather than a policy. */

function bandsAscend(ups: number[]): boolean {
  return !ups.some((n, i) => i > 0 && n <= ups[i - 1]!);
}

function ratesDoNotRise(rates: number[]): boolean {
  return !rates.some((n, i) => i > 0 && n > rates[i - 1]!);
}

test("volume band bounds must strictly increase", () => {
  assert.equal(bandsAscend([250, 500, 900, 1400]), true);
  assert.equal(bandsAscend([250, 250, 900, 1400]), false, "equal bounds are rejected");
  assert.equal(bandsAscend([250, 200, 900, 1400]), false, "a decreasing bound is rejected");
});

test("per-ft3 rates must not rise as volume grows", () => {
  assert.equal(ratesDoNotRise([0.9, 0.7, 0.55, 0.45, 0.38]), true);
  assert.equal(ratesDoNotRise([0.9, 0.7, 0.7, 0.45, 0.38]), true, "holding flat is allowed");
  assert.equal(ratesDoNotRise([0.9, 0.7, 0.8, 0.45, 0.38]), false, "a rise mid-scale is rejected");
});

test("pounds convert to integer minor units without float drift", () => {
  const poundsToMinor = (p: number) => Math.round(p * 100);
  assert.equal(poundsToMinor(180), 18_000);
  assert.equal(poundsToMinor(0.9), 90);
  // 1.1 * 100 is 110.00000000000001 in IEEE 754; rounding is what keeps money exact.
  assert.equal(poundsToMinor(1.1), 110);
  assert.equal(poundsToMinor(350.55), 35_055);
  assert.ok(Number.isInteger(poundsToMinor(19.99)));
});
