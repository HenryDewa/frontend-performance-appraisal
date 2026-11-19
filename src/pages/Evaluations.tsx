import { useEffect, useMemo, useState } from 'react';
import type { Paged } from '../types.ts';
import { PaginationBar } from '@/components/Pagination.tsx';
import { useDebounced } from '../lib/useDebounced.ts';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Scale, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalibrationPanel } from '@/components/CalibrationPanel';
import { CalibrationSessions } from '@/components/CalibrationSessions';
import { api, qs } from '../api.ts';
import { ROLE_LABEL, isHR, isReviewer, useAuth } from '../auth.tsx';
import { Badge, Bar, Card, Loading, Page, fmt, fmtDate, useLoad } from '../ui.tsx';

const HEAD = 'text-xs uppercase tracking-wide text-muted-foreground';
const SHORT = { tech_lead: 'Tech Lead', project_manager: 'PM', client: 'Client', self: 'Self', metrics: 'Metrics' };

/** Rincian penilaian masuk: siapa yang belum mengirim dan sudah sampai mana pengisiannya. */
function IncomingCell({ r }: { r?: any }) {
  const pending = (r.assessments ?? []).filter((a) => a.status !== 'submitted');
  return (
    <div className="min-w-56">
      <div className="mb-1 text-xs font-semibold">{r.assessments_done}/{r.assessments_total} masuk</div>
      <Bar value={r.assessments_done} max={r.assessments_total || 1} label={`${r.assessments_done} dari ${r.assessments_total} penilaian masuk`} />
      <ul className="mt-2 space-y-1">
        {pending.map((a) => (
          <li key={a.id} className="flex items-center gap-1.5 text-[11.5px] leading-tight" title={`${SHORT[a.source]} — ${a.evaluator_name}: ${a.scored === 0 ? 'belum mulai' : `${a.scored} dari ${a.total} butir terisi (draft)`}`}>
            <span className={cn('size-1.5 shrink-0 rounded-full', a.scored === 0 ? 'bg-slate-400' : 'bg-amber-500')} />
            <span className="font-semibold">{SHORT[a.source]}</span>
            <span className="truncate text-muted-foreground">{a.evaluator_name}</span>
            <span className={cn('ml-auto whitespace-nowrap', a.scored === 0 ? 'text-muted-foreground' : 'font-medium text-amber-700 dark:text-amber-300')}>
              {a.scored === 0 ? 'belum mulai' : `draft ${a.scored}/${a.total}`}
            </span>
          </li>
        ))}
        {pending.length === 0 && (r.assessments?.length ?? 0) > 0 && <li className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-300">Semua penilaian sudah masuk</li>}
      </ul>
    </div>
  );
}

// Filter cepat berdasarkan status evaluasi (menggantikan halaman Review Queue terpisah)
const FILTERS = [
  { key: 'all', label: 'Semua', statuses: null },
  { key: 'review', label: 'Perlu review', statuses: ['Submitted', 'Under Review'] },
  { key: 'publish', label: 'Siap dipublikasikan', statuses: ['Approved'] },
  { key: 'progress', label: 'Dalam pengisian', statuses: ['Assigned', 'In Progress', 'Needs Revision'] },
  { key: 'done', label: 'Selesai', statuses: ['Published', 'Closed'] },
];

export default function Evaluations() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'kalibrasi' ? 'kalibrasi' : 'daftar';
  const filter = FILTERS.some((f) => f.key === params.get('filter')) ? params.get('filter') : 'all';
  const setParam = (k, v, def) => {
    const next = new URLSearchParams(params);
    if (v === def) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  const periods = useLoad(() => api.get('/periods'));
  const [pid, setPid] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (pid || !periods.data?.length) return;
    setPid(String((periods.data.find((p) => p.status === 'active') ?? periods.data[0]).id));
  }, [periods.data, pid]);

  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim());
  const statusParam = FILTERS.find((f) => f.key === filter)?.statuses?.join(',') ?? '';
  useEffect(() => { setPage(1); }, [pid, filter, dq]);
  const { data, error, loading } = useLoad(
    () => (pid ? api.get<Paged<any, { by_status: Record<string, number> }>>('/evaluations' + qs({ period_id: pid, page, size: 25, status: statusParam, q: dq })) : Promise.resolve(null)),
    [pid, page, statusParam, dq],
  );
  const period = periods.data?.find((p) => String(p.id) === pid);
  const rows: any[] = data?.rows ?? [];

  // jumlah per tab dari ringkasan seluruh periode (tidak mengikuti filter/halaman)
  const counts = useMemo(() => {
    const by = data?.summary?.by_status ?? {};
    const sum = (list: string[] | null) => (list ? list.reduce((n, s) => n + (by[s] ?? 0), 0) : Object.values(by).reduce((n, v) => n + v, 0));
    return Object.fromEntries(FILTERS.map((f) => [f.key, sum(f.statuses)]));
  }, [data]);
  const active = FILTERS.find((f) => f.key === filter)!;
  const shown = rows; // filter status dan pencarian dilakukan di server

  const reviewer = isReviewer(user);
  const action = (r) => {
    if (reviewer && ['Submitted', 'Under Review'].includes(r.status)) {
      return r.conflict
        ? <span className="text-xs text-muted-foreground" title="Anda evaluator pada evaluasi ini, sehingga tidak dapat mereviewnya">Anda evaluator</span>
        : <Button asChild size="sm"><Link to={`/evaluations/${r.id}`}>Review</Link></Button>;
    }
    if ((isHR(user) || reviewer) && r.status === 'Approved') return <Button asChild size="sm"><Link to={`/evaluations/${r.id}`}>Publikasikan</Link></Button>;
    return <Button asChild variant="outline" size="sm"><Link to={`/evaluations/${r.id}`}>Detail</Link></Button>;
  };

  return (
    <Page
      eyebrow="Evaluasi Berkala"
      title="Penilaian Karyawan"
      actions={(
        <>
          <FormSelect value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Periode" className="w-auto min-w-40">
            {(periods.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </FormSelect>
          {isHR(user) && <Button onClick={() => nav(pid ? `/periods/${pid}` : '/periods')}>+ Kelola Penilaian</Button>}
        </>
      )}
    >
      <Tabs value={tab} onValueChange={(v) => setParam('tab', v, 'daftar')}>
        <TabsList>
          <TabsTrigger value="daftar">Daftar penilaian</TabsTrigger>
          <TabsTrigger value="kalibrasi"><Scale className="size-4" />Kalibrasi evaluator</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'kalibrasi' ? (
        <div className="space-y-4">
          <CalibrationSessions periodId={pid} periodName={period?.name} />
          <CalibrationPanel periodId={pid} />
        </div>
      ) : (
        <Card title={`Daftar Penilaian — ${period?.name ?? ''}`}>
          <p className="mb-3 text-sm text-muted-foreground">Skala 1–5 per indikator; skor akhir 0–100 terbobot otomatis. Penilaian per developer/periode, dihitung dari seluruh sumber penilai.</p>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filter status" className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? 'default' : 'outline'}
                  aria-pressed={filter === f.key}
                  onClick={() => setParam('filter', f.key, 'all')}
                >
                  {f.label}
                  <span className={cn('rounded-full px-1.5 text-[11px] font-bold', filter === f.key ? 'bg-white/25' : 'bg-muted text-muted-foreground', f.key === 'review' && reviewer && counts.review > 0 && filter !== f.key && 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300')}>{counts[f.key]}</span>
                </Button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari developer…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari developer" />
            </div>
          </div>

          <Loading loading={(loading && !data) || periods.loading} error={error || periods.error}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>Developer</TableHead>
                  <TableHead className={HEAD}>Penilai</TableHead>
                  <TableHead className={HEAD}>Penilaian masuk</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Skor Akhir</TableHead>
                  <TableHead className={HEAD}>Kategori</TableHead>
                  <TableHead className={HEAD}>Catatan</TableHead>
                  <TableHead className={HEAD}>Diperbarui</TableHead>
                  <TableHead className={HEAD}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell><Link className="hover:underline" to={`/evaluations/${r.id}`}><b>{r.name}</b></Link><div className="text-xs text-muted-foreground">{r.code} · {r.seniority}</div></TableCell>
                    <TableCell>{r.evaluator_name ? <>{r.evaluator_name}<div className="text-xs text-muted-foreground">{ROLE_LABEL[r.evaluator_role]}</div></> : '—'}</TableCell>
                    <TableCell><IncomingCell r={r} /></TableCell>
                    <TableCell className="text-right"><b>{r.final_score == null ? '—' : fmt(r.final_score)}</b></TableCell>
                    <TableCell><Badge>{r.classification ?? r.status}</Badge>{r.classification && <div className="mt-0.5 text-[11px] text-muted-foreground">{r.status}</div>}</TableCell>
                    <TableCell className="max-w-72 truncate text-muted-foreground" title={r.note ?? ''}>{r.note ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.updated_at)}</TableCell>
                    <TableCell className="text-right">{action(r)}</TableCell>
                  </TableRow>
                ))}
                {shown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      {counts.all === 0 ? 'Belum ada penilaian pada periode ini.' : 'Tidak ada penilaian yang cocok dengan filter ini.'}
                      {filter !== 'all' && counts.all > 0 && <Button variant="link" size="sm" onClick={() => setParam('filter', 'all', 'all')}>Tampilkan semua</Button>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Loading>
          {data && <PaginationBar page={data.page} size={data.size} total={data.total} onPage={setPage} unit="penilaian" />}
        </Card>
      )}
    </Page>
  );
}
