/*
 * Tests for duration formatting.
 *
 * Run: gjs -m tests/formatTime.test.js   (or: make test)
 */

import {formatDuration} from '../src/formatTime.js';

let checks = 0;
let failures = 0;

function check(name, actual, expected) {
    checks++;
    if (actual === expected) {
        print(`ok   ${name}`);
    } else {
        failures++;
        print(`FAIL ${name}`);
        print(`       expected: ${JSON.stringify(expected)}`);
        print(`       actual:   ${JSON.stringify(actual)}`);
    }
}

// Identity translation — the source strings are English.
check('fmt: null', formatDuration(null), '—');
check('fmt: negative', formatDuration(-1), '—');
check('fmt: zero', formatDuration(0), '0 min');
check('fmt: minutes only', formatDuration(45 * 60), '45 min');
check('fmt: hours and minutes', formatDuration(90 * 60), '1 h 30 min');
check('fmt: whole hour', formatDuration(3600), '1 h 00 min');
check('fmt: padded minutes', formatDuration(3660), '1 h 01 min');

// Verify that the translator is actually applied.
const fake = s => s.replace('min', 'MIN');
check('fmt: translator applied (hours)', formatDuration(90 * 60, fake), '1 h 30 MIN');
check('fmt: translator applied (minutes)', formatDuration(45 * 60, fake), '45 MIN');

print('');
print(`${checks - failures}/${checks} checks passed`);
if (failures > 0)
    throw new Error(`${failures} checks failed`);
