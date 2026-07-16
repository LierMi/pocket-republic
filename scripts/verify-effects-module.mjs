import assert from "node:assert/strict";
import {
  getViewIndex,
  normalisePointer,
  shouldEnableMotion,
} from "../effects.js";

assert.equal(getViewIndex("setup"), 0);
assert.equal(getViewIndex("review"), 2);
assert.equal(getViewIndex("trace"), 3);
assert.equal(getViewIndex("unknown"), 0);

assert.deepEqual(normalisePointer(50, 25, 100, 100), { x: 0, y: 0.5 });
assert.deepEqual(normalisePointer(0, 100, 100, 100), { x: -1, y: -1 });

assert.equal(shouldEnableMotion({ reducedMotion: false, hidden: false }), true);
assert.equal(shouldEnableMotion({ reducedMotion: true, hidden: false }), false);
assert.equal(shouldEnableMotion({ reducedMotion: false, hidden: true }), false);

console.log("PASS effects module helpers");
