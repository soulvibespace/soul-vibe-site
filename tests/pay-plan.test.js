// node tests/pay-plan.test.js — проверка расчёта оплаты при записи (pay-plan.js).
'use strict';
const assert = require('assert');
const { planPayment, hadPass } = require('../pay-plan.js');

const NOW = new Date('2026-11-19T10:00:00Z');
const lot = (o) => Object.assign({ status: 'active', source_type: 'membership', source_label: 'MP8 · 160 VIBES', granted_vibes: 160 }, o);
const V = (lots, extra) => Object.assign({ linked: true, lots, transactions: [] }, extra);
const cls = { date: '2026-12-08', time: '18:15:00', service_id: '71' };
const bk = (date, time, status) => ({ id: date + time, date, time, service_id: '12', status: status || 'confirmed' });
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('нет данных VIBES → unknown', () => assert.strictEqual(planPayment(null, [], cls, NOW).kind, 'unknown'));
t('не найден в VIBES → none', () => assert.strictEqual(planPayment({ linked: false, reason: 'not_found' }, [], cls, NOW).kind, 'none'));
t('email не подтверждён → unknown', () => assert.strictEqual(planPayment({ linked: false, reason: 'verify_email' }, [], cls, NOW).kind, 'unknown'));
t('абонемент закончился (0 VIBES) → none', () => {
  const p = planPayment(V([lot({ remaining_vibes: 0, expires_at: '2026-12-10' })]), [], cls, NOW);
  assert.strictEqual(p.kind, 'none'); assert.strictEqual(p.hadPass, true);
});
t('хватает → full, остаток 40', () => {
  const p = planPayment(V([lot({ remaining_vibes: 60, expires_at: '2026-12-10T21:59:59Z' })]), [], cls, NOW);
  assert.deepStrictEqual([p.kind, p.covered, p.left, p.expiry, p.withBookings], ['full', 20, 40, '2026-12-10', false]);
});
t('с учётом будущих записей: 40 VIBES и одна запись раньше → остаток 0', () => {
  const p = planPayment(V([lot({ remaining_vibes: 40, expires_at: '2026-12-10' })]), [bk('2026-11-25', '10:00:00')], cls, NOW);
  assert.deepStrictEqual([p.kind, p.left, p.withBookings], ['full', 0, true]);
});
t('отменённые и прошедшие записи не учитываются', () => {
  const p = planPayment(V([lot({ remaining_vibes: 40, expires_at: '2026-12-10' })]),
    [bk('2026-11-25', '10:00:00', 'cancelled'), bk('2026-11-10', '10:00:00')], cls, NOW);
  assert.deepStrictEqual([p.kind, p.left, p.withBookings], ['full', 20, false]);
});
t('сама запись в списке не считается дважды', () => {
  const p = planPayment(V([lot({ remaining_vibes: 20, expires_at: '2026-12-10' })]),
    [{ id: '9', date: cls.date, time: cls.time, service_id: '71', status: 'confirmed' }], cls, NOW);
  assert.deepStrictEqual([p.kind, p.left], ['full', 0]);
});
t('не хватает 10 → partial, доплата 10', () => {
  const p = planPayment(V([lot({ remaining_vibes: 10, expires_at: '2026-12-10' })]), [], cls, NOW);
  assert.deepStrictEqual([p.kind, p.covered, p.due], ['partial', 10, 10]);
});
t('всё распределено на другие записи → used', () => {
  const p = planPayment(V([lot({ remaining_vibes: 20, expires_at: '2026-12-10' })]), [bk('2026-11-25', '10:00:00')], cls, NOW);
  assert.strictEqual(p.kind, 'used');
});
t('запись позже текущей не забирает VIBES раньше неё', () => {
  const p = planPayment(V([lot({ remaining_vibes: 20, expires_at: '2026-12-31' })]), [bk('2026-12-20', '10:00:00')], cls, NOW);
  assert.deepStrictEqual([p.kind, p.left, p.withBookings], ['full', 0, true]);
});
t('срок кончится до занятия → expired', () => {
  const p = planPayment(V([lot({ remaining_vibes: 60, expires_at: '2026-12-05' })]), [], cls, NOW);
  assert.deepStrictEqual([p.kind, p.expiry], ['expired', '2026-12-05']);
});
t('FIFO по сроку: сначала Стартер пак с ближним сроком', () => {
  const p = planPayment(V([
    lot({ remaining_vibes: 100, expires_at: '2027-01-30' }),
    lot({ source_type: 'starter_pack', source_label: 'SP2 · 40 VIBES', remaining_vibes: 40, expires_at: '2026-12-09' }),
  ]), [], cls, NOW);
  assert.deepStrictEqual([p.kind, p.lot.source_type, p.left], ['full', 'starter_pack', 120]);
});
t('просроченный к дате лот пропускается, берётся следующий', () => {
  const p = planPayment(V([
    lot({ source_type: 'starter_pack', remaining_vibes: 40, expires_at: '2026-12-01' }),
    lot({ remaining_vibes: 30, expires_at: '2027-01-30' }),
  ]), [], cls, NOW);
  assert.deepStrictEqual([p.kind, p.lot.source_type, p.left], ['full', 'membership', 10]);
});
t('добор из двух лотов', () => {
  const p = planPayment(V([lot({ remaining_vibes: 10, expires_at: '2026-12-09' }), lot({ remaining_vibes: 30, expires_at: '2027-01-30' })]), [], cls, NOW);
  assert.deepStrictEqual([p.kind, p.covered, p.left], ['full', 20, 20]);
});
t('hadPass по истории операций', () => {
  assert.strictEqual(hadPass(V([], { transactions: [{ category: 'starter_pack' }] })), true);
  assert.strictEqual(hadPass(V([lot({ source_type: 'bonus', status: 'expired' })])), false);
});
console.log(`\n${n} тестов пройдено`);
