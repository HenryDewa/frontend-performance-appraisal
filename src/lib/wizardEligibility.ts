// Fungsi murni untuk langkah Evaluator pada wizard periode (tanpa import agar mudah dites dengan `node --test`).
// Aturan kelayakan SAMA dengan validateEvaluatorScope di backend.

export const PLAN_SOURCES = ['tech_lead', 'project_manager', 'client', 'metrics'];
export const NEEDS_PROJECT = ['project_manager', 'client'];

export const missingMandatory = (row) => row.proposals.length === 0;
export const rowIssues = (row) => row.warnings.length + (missingMandatory(row) ? 1 : 0);

const projectOf = (p, projectsById) => (p.project_id ? projectsById?.[p.project_id] ?? { id: p.project_id, name: p.project_name } : null);

/** Alasan user TIDAK boleh menjadi evaluator `source` bagi `emp` (null = boleh). `project` null/tanpa pm_user_id = longgar. */
export function whyNot(user, source, emp, project) {
  if (!user) return 'Evaluator tidak ditemukan';
  if (user.employee_id && emp && user.employee_id === emp.id) return 'Tidak boleh menilai diri sendiri';
  if (source === 'tech_lead') {
    if (user.role === 'tech_lead') return user.id === emp?.lead_user_id ? null : 'Tech Lead hanya boleh menilai anggota timnya';
    if (user.role === 'engineering_manager') return user.department === emp?.department ? null : 'Engineering Manager hanya menilai karyawan divisinya';
    return 'Hanya Tech Lead tim atau Engineering Manager divisi yang sama';
  }
  if (source === 'project_manager') {
    if (user.role !== 'project_manager') return 'Evaluator bukan Project Manager';
    if (project && 'pm_user_id' in project && project.pm_user_id !== user.id) return `Bukan PM project ${project.name}`;
    return null;
  }
  if (source === 'client') {
    if (user.role !== 'client_evaluator') return 'Evaluator bukan perwakilan client';
    if (project && 'client_id' in project && project.client_id !== user.client_id) return `Bukan perwakilan client project ${project.name}`;
    return null;
  }
  if (source === 'metrics') return user.role === 'hr' ? null : 'Objective Metrics harus berole HR';
  return 'Sumber tidak dikenal';
}

export const eligibleUsers = (evaluators, source, emp, project) => evaluators.filter((u) => !whyNot(u, source, emp, project));

const firstTL = (row) => row.proposals.find((p) => p.source === 'tech_lead') ?? null;

/** Kelompok per Tech Lead (proposal tech_lead pertama). Grup tanpa TL (key 'none') di urutan pertama. */
export function groupByTechLead(rows) {
  const map = new Map();
  for (const r of rows) {
    const tl = firstTL(r);
    const key = tl ? `tl:${tl.evaluator_user_id}` : 'none';
    if (!map.has(key)) map.set(key, { key, techLeadId: tl?.evaluator_user_id ?? null, name: tl ? tl.evaluator_name : 'Belum ada Tech Lead', rows: [] });
    map.get(key).rows.push(r);
  }
  return [...map.values()].sort((a, b) => (a.key === 'none' ? -1 : b.key === 'none' ? 1 : a.name.localeCompare(b.name)));
}

/** Satu entri per jenis peringatan: [{ text, empIds }] — termasuk "Belum ada evaluator". */
export function warningSummary(rows) {
  const m = new Map();
  for (const r of rows) {
    const texts = [...r.warnings, ...(missingMandatory(r) ? ['Belum ada evaluator'] : [])];
    for (const t of texts) {
      if (!m.has(t)) m.set(t, []);
      m.get(t).push(r.employee.id);
    }
  }
  return [...m.entries()].map(([text, empIds]) => ({ text, empIds })).sort((a, b) => b.empIds.length - a.empIds.length);
}

/** Evaluator yang sedang dipakai pada sumber tertentu beserta jumlah karyawan. */
export function sourceUsage(rows, source) {
  const m = new Map();
  for (const r of rows) {
    for (const id of new Set(r.proposals.filter((p) => p.source === source).map((p) => p.evaluator_user_id))) {
      const name = r.proposals.find((p) => p.source === source && p.evaluator_user_id === id).evaluator_name;
      m.set(id, { id, name, count: (m.get(id)?.count ?? 0) + 1 });
    }
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Pratinjau penggantian massal. scopeIds null = semua. Mengembalikan { changes, skipped, affected }. */
export function planReplace({ rows, empMap, evaluators, projectsById, source, fromId, toId, scopeIds = null }: { rows?: any; empMap?: any; evaluators?: any; projectsById?: any; source?: any; fromId?: any; toId?: any; scopeIds?: any }) {
  const to = evaluators.find((u) => u.id === toId);
  const changes: any[] = [];
  const skipped: any[] = [];
  for (const r of rows) {
    if (scopeIds && !scopeIds.has(r.employee.id)) continue;
    for (const p of r.proposals) {
      if (p.source !== source || p.evaluator_user_id !== fromId) continue;
      const reason = !to ? 'Pilih evaluator pengganti' : toId === fromId ? 'Evaluator sama' : whyNot(to, source, empMap[r.employee.id] ?? r.employee, projectOf(p, projectsById));
      if (reason) skipped.push({ empId: r.employee.id, name: r.employee.name, reason });
      else changes.push({ empId: r.employee.id, key: p.key });
    }
  }
  return { changes, skipped, affected: changes.length + skipped.length };
}

const dedupe = (proposals) => {
  const seen = new Set();
  return proposals.filter((p) => {
    const k = `${p.source}|${p.evaluator_user_id}|${p.project_id ?? ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/** Terapkan hasil planReplace. */
export function applyReplace(rows, changes, to) {
  const keys = new Set(changes.map((c) => c.key));
  if (!keys.size) return rows;
  return rows.map((r) => (r.proposals.some((p) => keys.has(p.key))
    ? { ...r, proposals: dedupe(r.proposals.map((p) => (keys.has(p.key) ? { ...p, evaluator_user_id: to.id, evaluator_name: to.name, manual: true } : p))) }
    : r));
}

/** User yang eligible sebagai Tech Lead untuk SEMUA anggota grup. */
export function commonTechLeads(evaluators, members) {
  return evaluators.filter((u) => members.length > 0 && members.every((m) => !whyNot(u, 'tech_lead', m, null)));
}

/** Ganti (atau tetapkan) Tech Lead seluruh anggota grup. memberIds: Set id karyawan. */
export function setGroupTechLead(rows, memberIds, to) {
  let n = 0;
  return rows.map((r) => {
    if (!memberIds.has(r.employee.id)) return r;
    const tl = firstTL(r);
    n++;
    const proposals = tl
      ? r.proposals.map((p) => (p === tl ? { ...p, evaluator_user_id: to.id, evaluator_name: to.name, manual: false } : p))
      : [...r.proposals, { key: `g${Date.now()}-${n}-${r.employee.id}`, source: 'tech_lead', evaluator_user_id: to.id, evaluator_name: to.name, project_id: null, project_name: null }];
    return { ...r, proposals: dedupe(proposals) };
  });
}

/** Metrics untuk semua: ganti semua proposal metrics (atau tambahkan bila belum ada). Mengembalikan { rows, changed, skipped }. */
export function setAllMetrics(rows, empMap, to) {
  let changed = 0;
  let skipped = 0;
  const out = rows.map((r) => {
    if (whyNot(to, 'metrics', empMap[r.employee.id] ?? r.employee, null)) { skipped++; return r; }
    changed++;
    const has = r.proposals.some((p) => p.source === 'metrics');
    const proposals = has
      ? r.proposals.map((p) => (p.source === 'metrics' ? { ...p, evaluator_user_id: to.id, evaluator_name: to.name, manual: true } : p))
      : [...r.proposals, { key: `m${Date.now()}-${r.employee.id}`, source: 'metrics', evaluator_user_id: to.id, evaluator_name: to.name, project_id: null, project_name: null, manual: true }];
    return { ...r, proposals: dedupe(proposals) };
  });
  return { rows: out, changed, skipped };
}
