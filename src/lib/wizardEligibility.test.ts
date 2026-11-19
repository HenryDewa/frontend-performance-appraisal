import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whyNot, groupByTechLead, warningSummary, planReplace, applyReplace, commonTechLeads, setGroupTechLead, sourceUsage, setAllMetrics } from './wizardEligibility.ts';
const why = (...a: Parameters<typeof whyNot>) => whyNot(...a) as string;

const users = [
  { id: 1, name: 'TL1', role: 'tech_lead', department: 'FE' },
  { id: 2, name: 'TL2', role: 'tech_lead', department: 'FE' },
  { id: 3, name: 'EM', role: 'engineering_manager', department: 'FE' },
  { id: 4, name: 'PM', role: 'project_manager' },
  { id: 5, name: 'CL', role: 'client_evaluator', client_id: 9 },
  { id: 6, name: 'HR', role: 'hr' },
  { id: 7, name: 'HR2', role: 'hr' },
];
const empMap = { 10: { id: 10, lead_user_id: 1, department: 'FE' }, 11: { id: 11, lead_user_id: 1, department: 'FE' }, 12: { id: 12, lead_user_id: 2, department: 'FE' } };
const projects = { 100: { id: 100, name: 'P', pm_user_id: 4, client_id: 9 } };
const row = (id, tl, extra = []) => ({
  employee: { id, name: `E${id}` }, warnings: [], infos: [],
  proposals: [...(tl ? [{ key: `t${id}`, source: 'tech_lead', evaluator_user_id: tl, evaluator_name: `TL${tl}` }] : []), { key: `m${id}`, source: 'metrics', evaluator_user_id: 6, evaluator_name: 'HR' }, ...extra],
});

test('whyNot mengikuti aturan backend', () => {
  assert.equal(whyNot(users[0], 'tech_lead', empMap[10], null), null);
  assert.match(why(users[1], 'tech_lead', empMap[10], null), /anggota timnya/);
  assert.equal(whyNot(users[2], 'tech_lead', empMap[12], null), null);
  assert.match(why(users[3], 'tech_lead', empMap[10], null), /Tech Lead/);
  assert.match(why(users[3], 'project_manager', empMap[10], { name: 'X', pm_user_id: 99 }), /Bukan PM/);
  assert.match(why(users[4], 'client', empMap[10], { name: 'X', client_id: 1 }), /client/);
  assert.match(why(users[0], 'metrics', empMap[10], null), /HR/);
});

test('pengelompokan, ringkasan peringatan, dan pemakaian sumber', () => {
  const rows = [row(10, 1), row(11, 1), row(12, 2), { ...row(13, null), warnings: ['w'] }];
  const g = groupByTechLead(rows);
  assert.equal(g[0].key, 'none');
  assert.deepEqual(g.map((x) => x.rows.length), [1, 2, 1]);
  assert.deepEqual(warningSummary(rows)[0], { text: 'w', empIds: [13] });
  assert.equal(sourceUsage(rows, 'tech_lead')[0].count, 2);
});

test('planReplace/applyReplace hanya mengganti yang valid', () => {
  const rows = [row(10, 1), row(11, 1), row(12, 2)];
  const p = planReplace({ rows, empMap, evaluators: users, projectsById: projects, source: 'tech_lead', fromId: 1, toId: 3 });
  assert.equal(p.changes.length, 2);
  const bad = planReplace({ rows, empMap, evaluators: users, projectsById: projects, source: 'tech_lead', fromId: 1, toId: 2 });
  assert.equal(bad.changes.length, 0);
  assert.equal(bad.skipped.length, 2);
  const out = applyReplace(rows, p.changes, users[2]);
  assert.equal(out[0].proposals[0].evaluator_user_id, 3);
  assert.equal(out[2].proposals[0].evaluator_user_id, 2);
});

test('Tech Lead tim: hanya kandidat eligible untuk semua anggota', () => {
  const opts = commonTechLeads(users, [empMap[10], empMap[12]]).map((u) => u.id);
  assert.deepEqual(opts, [3]);
  const rows = setGroupTechLead([row(10, 1), row(13, null)], new Set([10, 13]), users[2]);
  assert.ok(rows.every((r) => r.proposals.find((p) => p.source === 'tech_lead').evaluator_user_id === 3));
});

test('setAllMetrics mengganti semua dan melewati diri sendiri', () => {
  const r = setAllMetrics([row(10, 1), row(11, 1)], { ...empMap, 11: { ...empMap[11], id: 11 } }, { ...users[6], employee_id: 11 });
  assert.equal(r.changed, 1);
  assert.equal(r.skipped, 1);
});
