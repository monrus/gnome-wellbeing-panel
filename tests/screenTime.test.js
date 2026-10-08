/*
 * Tests for the pure screen time logic.
 *
 * Run: gjs -m tests/screenTime.test.js   (or: make test)
 */

import GLib from 'gi://GLib';

import {parseHistory, sumActiveSeconds, startOfDaySecs, USER_STATE} from '../src/screenTime.js';

let checks = 0;
let failures = 0;

function check(name, actual, expected) {
    checks++;
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
        print(`ok   ${name}`);
    } else {
        failures++;
        print(`FAIL ${name}`);
        print(`       expected: ${e}`);
        print(`       actual:   ${a}`);
    }
}

// --- parseHistory -----------------------------------------------------------

check('parse: empty array', parseHistory('[]'), []);
check('parse: broken JSON', parseHistory('not json'), null);
check('parse: not an array', parseHistory('{"a":1}'), null);
check('parse: oldState === newState', parseHistory(
    '[{"oldState":0,"newState":0,"wallTimeSecs":1}]'), null);
check('parse: unknown state', parseHistory(
    '[{"oldState":0,"newState":2,"wallTimeSecs":1}]'), null);
check('parse: non-monotonic time', parseHistory(
    '[{"oldState":0,"newState":1,"wallTimeSecs":5},' +
    '{"oldState":1,"newState":0,"wallTimeSecs":3}]'), null);
check('parse: future entries are dropped', parseHistory(
    '[{"oldState":0,"newState":1,"wallTimeSecs":1000}]', 500), []);
check('parse: valid transition', parseHistory(
    '[{"oldState":0,"newState":1,"wallTimeSecs":100}]'),
    [{oldState: USER_STATE.INACTIVE, newState: USER_STATE.ACTIVE, wallTimeSecs: 100}]);

// --- sumActiveSeconds -------------------------------------------------------

check('sum: empty', sumActiveSeconds([], 0, 100), 0);

check('sum: dangling ACTIVE (runs to now)', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 100}], 0, 150), 50);

check('sum: completed pair', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 100},
     {oldState: 1, newState: 0, wallTimeSecs: 200}], 0, 300), 100);

check('sum: activity started before the range', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 50},
     {oldState: 1, newState: 0, wallTimeSecs: 150}], 100, 200), 50);

check('sum: interval across midnight (only the part inside the range)', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: -3600},
     {oldState: 1, newState: 0, wallTimeSecs: 3600}], 0, 7200), 3600);

check('sum: entirely outside the range', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 10},
     {oldState: 1, newState: 0, wallTimeSecs: 20}], 100, 200), 0);

check('sum: dangling ACTIVE started before the range', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: -100}], 0, 50), 50);

check('sum: multiple intervals', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 100},
     {oldState: 1, newState: 0, wallTimeSecs: 200},
     {oldState: 0, newState: 1, wallTimeSecs: 500},
     {oldState: 1, newState: 0, wallTimeSecs: 600}], 0, 1000), 200);

// --- startOfDaySecs ---------------------------------------------------------

const nowSecs = Math.floor(GLib.get_real_time() / GLib.USEC_PER_SEC);

for (const hour of [0, 1, 3, 6, 12, 23]) {
    const start = startOfDaySecs(nowSecs, hour);
    check(`dayStart: ${hour}:00 not in the future`, start <= nowSecs, true);
    check(`dayStart: ${hour}:00 has the right hour`,
        GLib.DateTime.new_from_unix_local(start).get_hour(), hour);
    check(`dayStart: ${hour}:00 within the last day`,
        nowSecs - start < 26 * 3600, true);
}

const midnight = startOfDaySecs(nowSecs, 0);
const earlyMorning = midnight + 1800; // today 00:30
check('dayStart: rolls back when the hour has not occurred yet',
    startOfDaySecs(earlyMorning, 1) < midnight, true);
check('dayStart: rollback has the right hour',
    GLib.DateTime.new_from_unix_local(startOfDaySecs(earlyMorning, 1)).get_hour(), 1);

// --- summary ----------------------------------------------------------------

print('');
print(`${checks - failures}/${checks} checks passed`);
if (failures > 0)
    throw new Error(`${failures} checks failed`);
