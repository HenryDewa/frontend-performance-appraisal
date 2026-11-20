import { Fragment, useState } from 'react';
import { Download, FileDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import { api, qs } from '../api.ts';
import { Input } from '@/components/ui/input';
import { PaginationBar } from '@/components/Pagination.tsx';
import { useDebounced } from '../lib/useDebounced.ts';
import type { Paged } from '../types.ts';
import { Card, ErrorBox, Field, Loading, Page, fmtDate, useAction, useLoad } from '../ui.tsx';
import { todayWib } from '../lib/time.ts';

const FINAL = ['Approved', 'Published', 'Closed'];

export default function Reports() {
  const periods = useLoad(() => api.get('/periods'));
  const [f, setF] = useState({ period_id: '', seniority: '', classification: '' });
  const { busy, error, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Page title="Laporan & Export">
      <Card title="Laporan evaluasi (CSV)">
        <p className="mb-4 text-[13px] text-muted-foreground">Memuat evaluasi yang telah disetujui sesuai hak akses Anda. Setiap unduhan dicatat pada audit log.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Periode"><FormSelect value={f.period_id} onChange={set('period_id')}><option value="">Semua</option>{(periods.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</FormSelect></Field>
          <Field label="Seniority"><FormSelect value={f.seniority} onChange={set('seniority')}><option value="">Semua</option><option>junior</option><option>middle</option><option>senior</option></FormSelect></Field>
          <Field label="Klasifikasi"><FormSelect value={f.classification} onChange={set('classification')}><option value="">Semua</option><option>Low Performer</option><option>Middle Performer</option><option>Top Performer</option></FormSelect></Field>
        </div>
        <ErrorBox error={error} />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => run(() => api.download('/reports/evaluations.csv' + qs(f), 'evaluations.csv'))}><Download />Unduh CSV</Button>
          <Button variant="outline" disabled={busy} onClick={() => run(() => api.download('/reports/evaluations.xlsx' + qs(f), 'evaluasi.xlsx'))}><FileSpreadsheet />Unduh Excel</Button>
        </div>
      </Card>
      <EmployeeReport periods={periods.data ?? []} />
      <ProjectLoadReport />
    </Page>
  );
}

function EmployeeReport({ periods }: { periods?: any }) {
  const employees = useLoad(() => api.get('/employees?size=100&status=active'));
  const [empId, setEmpId] = useState('');
  const [periodSel, setPeriodSel] = useState('');
  const periodId = periodSel || (periods[0] ? String(periods[0].id) : '');
  const evals = useLoad(() => (periodId ? api.get(`/evaluations?period_id=${periodId}`) : Promise.resolve([])), [periodId]);
  const { busy, error, run } = useAction();
  const ev = empId ? (evals.data ?? []).find((e) => String(e.employee_id) === empId) : null;
  const ready = !!ev && FINAL.includes(ev.status);
  const why = !empId ? 'Pilih karyawan terlebih dahulu.' : !periodId ? 'Belum ada periode.' : !ev ? 'Karyawan ini tidak memiliki evaluasi pada periode tersebut.' : !ready ? `Hasil periode ini belum disetujui (status: ${ev.status}).` : '';
  return (
    <Card title="Laporan per karyawan (PDF)">
      <p className="mb-4 text-[13px] text-muted-foreground">Laporan individual yang siap dicetak. Hanya hasil yang telah disetujui yang dapat diunduh; setiap unduhan dicatat pada audit log.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Karyawan"><FormSelect value={empId} onChange={(e) => setEmpId(e.target.value)}><option value="">Pilih karyawan</option>{(employees.data?.rows ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}</FormSelect></Field>
        <Field label="Periode"><FormSelect value={periodId} onChange={(e) => setPeriodSel(e.target.value)}>{periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</FormSelect></Field>
      </div>
      <ErrorBox error={error} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !ready} onClick={() => run(() => api.download(`/evaluations/${ev.id}/report.pdf`, `hasil-evaluasi-${ev.id}.pdf`))}><FileDown />Unduh PDF hasil periode</Button>
        <Button variant="outline" disabled={busy || !empId} onClick={() => run(() => api.download(`/employees/${empId}/report.pdf`, `riwayat-${empId}.pdf`))}><FileDown />Unduh PDF riwayat</Button>
      </div>
      {why && !ready && <p className="mt-3 text-xs text-muted-foreground">{why}</p>}
    </Card>
  );
}

interface LoadProject { project_id: number; project: string; client: string; complexity: 'low' | 'medium' | 'high'; roles: string[]; start_date: string; end_date: string | null }
interface LoadRow { employee_id: number; code: string; name: string; department: string; seniority: string; status: string; project_count: number; ongoing: number; by_complexity: Record<'low' | 'medium' | 'high', number>; projects: LoadProject[] }
interface LoadSummary { year: number; employees: number; total_projects: number; assignments: number; without_project: number; average: number; max: number }
const CX = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' } as const;
const CX_CLS = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
} as const;
const CX_ORDER = ['high', 'medium', 'low'] as const;
const today = () => todayWib();
const shortDate = (s: string) => fmtDate(s);
const isDone = (p: { end_date: string | null }) => !!p.end_date && p.end_date < today();
/** Yang masih berjalan lebih dulu, lalu yang mulainya paling baru. */
const byRecency = (list: LoadProject[]) => [...list].sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || b.start_date.localeCompare(a.start_date));
const CxBadge = ({ level, children }: { level: keyof typeof CX; children?: React.ReactNode }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CX_CLS[level]}`}>{children ?? CX[level]}</span>
);

function ProjectLoadReport() {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);
  const [year, setYear] = useState(String(thisYear));
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const dq = useDebounced(q.trim());
  const { busy, error, run } = useAction();
  const data = useLoad(() => api.get<Paged<LoadRow, LoadSummary>>('/reports/project-load' + qs({ year, q: dq, page, size: 15 })), [year, dq, page]);
  const sum = data.data?.summary;
  return (
    <Card title="Laporan project per karyawan (1 tahun)">
      <p className="mb-4 text-[13px] text-muted-foreground">Jumlah project yang dikerjakan tiap karyawan dalam satu tahun kalender, dihitung dari penugasan yang beririsan dengan tahun tersebut. Satu project dihitung sekali walau karyawan ditugaskan beberapa kali di dalamnya.</p>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tahun"><FormSelect value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}>{years.map((y) => <option key={y}>{y}</option>)}</FormSelect></Field>
        <Field label="Cari karyawan"><Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Nama atau kode" /></Field>
      </div>
      {sum && (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span><b>{sum.employees}</b> karyawan</span>
          <span><b>{sum.total_projects}</b> project berbeda</span>
          <span>rata-rata <b>{sum.average}</b> project/karyawan</span>
          <span>terbanyak <b>{sum.max}</b></span>
          <span><b>{sum.without_project}</b> belum punya project</span>
        </div>
      )}
      <ErrorBox error={error} />
      <Loading loading={data.loading && !data.data} error={data.error}>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2">Karyawan</th><th className="px-3 py-2">Department</th><th className="px-3 py-2 text-center">Project {year}</th><th className="px-3 py-2 text-center">Berjalan</th><th className="px-3 py-2">Kompleksitas</th><th className="w-20 px-3 py-2" /></tr>
            </thead>
            <tbody>
              {(data.data?.rows ?? []).map((r) => (
                <Fragment key={r.employee_id}>
                  <tr className="border-t">
                    <td className="px-3 py-2"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code} · {r.seniority}{r.status === 'inactive' ? ' · nonaktif' : ''}</div></td>
                    <td className="px-3 py-2">{r.department}</td>
                    <td className="px-3 py-2 text-center text-base font-semibold">{r.project_count}</td>
                    <td className="px-3 py-2 text-center">{r.ongoing}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {CX_ORDER.filter((k) => r.by_complexity[k] > 0).map((k) => <CxBadge key={k} level={k}>{CX[k]} · {r.by_complexity[k]}</CxBadge>)}
                        {r.project_count === 0 && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{r.project_count > 0 && <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.employee_id ? null : r.employee_id)}>{open === r.employee_id ? 'Tutup' : 'Rincian'}</Button>}</td>
                  </tr>
                  {open === r.employee_id && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={6} className="px-3 py-3">
                        <div className="overflow-x-auto rounded-lg border bg-card">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 text-left text-muted-foreground">
                              <tr><th className="px-3 py-2 font-medium">Project</th><th className="px-3 py-2 font-medium">Kompleksitas</th><th className="px-3 py-2 font-medium">Peran</th><th className="px-3 py-2 font-medium">Periode penugasan</th><th className="px-3 py-2 font-medium">Status</th></tr>
                            </thead>
                            <tbody>
                              {byRecency(r.projects).map((p) => {
                                const done = isDone(p);
                                return (
                                  <tr key={p.project_id} className="border-t">
                                    <td className="px-3 py-2"><div className="text-sm font-semibold">{p.project}</div><div className="text-muted-foreground">{p.client}</div></td>
                                    <td className="px-3 py-2"><CxBadge level={p.complexity} /></td>
                                    <td className="px-3 py-2">{p.roles.join(', ') || <span className="text-muted-foreground">—</span>}</td>
                                    <td className="whitespace-nowrap px-3 py-2">{shortDate(p.start_date)} – {p.end_date ? shortDate(p.end_date) : 'berjalan'}</td>
                                    <td className="px-3 py-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${done ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'}`}><span className="size-1.5 rounded-full bg-current" />{done ? 'Selesai' : 'Berjalan'}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data.data && data.data.rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Tidak ada karyawan yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
        {data.data && <PaginationBar page={data.data.page} size={data.data.size} total={data.data.total} onPage={setPage} unit="karyawan" />}
      </Loading>
      <div className="mt-4">
        <Button variant="outline" disabled={busy} onClick={() => run(() => api.download('/reports/project-load.xlsx' + qs({ year, q: dq }), `project-karyawan-${year}.xlsx`))}><FileSpreadsheet />Unduh Excel</Button>
      </div>
    </Card>
  );
}
