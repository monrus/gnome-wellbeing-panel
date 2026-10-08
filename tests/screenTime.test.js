/*
 * Тесты чистой логики экранного времени.
 *
 * Запуск: gjs -m tests/screenTime.test.js   (или: make test)
 */

import {parseHistory, sumActiveSeconds, USER_STATE} from '../src/screenTime.js';

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

check('parse: пустой массив', parseHistory('[]'), []);
check('parse: битый JSON', parseHistory('not json'), null);
check('parse: не массив', parseHistory('{"a":1}'), null);
check('parse: oldState === newState', parseHistory(
    '[{"oldState":0,"newState":0,"wallTimeSecs":1}]'), null);
check('parse: неизвестное состояние', parseHistory(
    '[{"oldState":0,"newState":2,"wallTimeSecs":1}]'), null);
check('parse: немонотонное время', parseHistory(
    '[{"oldState":0,"newState":1,"wallTimeSecs":5},' +
    '{"oldState":1,"newState":0,"wallTimeSecs":3}]'), null);
check('parse: будущее отбрасывается', parseHistory(
    '[{"oldState":0,"newState":1,"wallTimeSecs":1000}]', 500), []);
check('parse: валидный переход', parseHistory(
    '[{"oldState":0,"newState":1,"wallTimeSecs":100}]'),
    [{oldState: USER_STATE.INACTIVE, newState: USER_STATE.ACTIVE, wallTimeSecs: 100}]);

// --- sumActiveSeconds -------------------------------------------------------

check('sum: пусто', sumActiveSeconds([], 0, 100), 0);

check('sum: висящий ACTIVE (идёт до now)', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 100}], 0, 150), 50);

check('sum: завершённая пара', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 100},
     {oldState: 1, newState: 0, wallTimeSecs: 200}], 0, 300), 100);

check('sum: активность началась до диапазона', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 50},
     {oldState: 1, newState: 0, wallTimeSecs: 150}], 100, 200), 50);

check('sum: интервал через полночь (только часть в диапазоне)', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: -3600},
     {oldState: 1, newState: 0, wallTimeSecs: 3600}], 0, 7200), 3600);

check('sum: всё вне диапазона', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 10},
     {oldState: 1, newState: 0, wallTimeSecs: 20}], 100, 200), 0);

check('sum: висящий ACTIVE начался до диапазона', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: -100}], 0, 50), 50);

check('sum: несколько интервалов', sumActiveSeconds(
    [{oldState: 0, newState: 1, wallTimeSecs: 100},
     {oldState: 1, newState: 0, wallTimeSecs: 200},
     {oldState: 0, newState: 1, wallTimeSecs: 500},
     {oldState: 1, newState: 0, wallTimeSecs: 600}], 0, 1000), 200);

// --- итог -------------------------------------------------------------------

print('');
print(`${checks - failures}/${checks} проверок пройдено`);
if (failures > 0)
    throw new Error(`${failures} проверок не пройдено`);
