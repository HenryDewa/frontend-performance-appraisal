import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { useConfirm } from '@/components/ConfirmProvider';
import { useEffect, useState } from 'react';
import type { Paged } from '../types.ts';
import { PaginationBar } from '@/components/Pagination.tsx';
import { CheckCircle2, Clock, Plus, ShieldAlert, Target } from 'lucide-react';
import { StatCard } from './Dashboard.tsx';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.ts';
import { useAuth, isMgmt } from '../auth.tsx';
import { Badge, Bar, Card, ErrorBox, Field, Loading, Modal, Page, fmtDate, useAction, useLoad } from '../ui.tsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormSelect } from '@/components/ui/form-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TH = 'text-xs uppercase tracking-wide text-muted-foreground';
const daysTo = (d) => Math.ceil((+new Date(String(d).slice(0, 10) + 'T00:00:00') - +new Date(new Date().toDateString())) / 86400000);
const blankAct = () => ({ title: '', owner: '', due: '', measure: '' });

export default function DevPlans() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const mgmt = isMgmt(user);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('active');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => api.get<Paged<any, any>>('/dev-plans' + qs({ page, size: 10, status: tab === 'all' ? '' : tab })), [page, tab]);
  useEffect(() => { if (data && data.rows.length === 0 && page > 1) setPage(page - 1); }, [data, page]);
  const emps = useLoad(() => (mgmt ? api.get('/employees?status=active&size=100') : Promise.resolve({ rows: [] })));
  const [form, setForm] = useState<any>(() => params.get('employee_id') ? { employee_id: params.get('employee_id'), evaluation_id: params.get('evaluation_id') ?? '', type: 'development', goal: '', support: '', review_date: '', activities: [blankAct()] } : null);
  const [ack, setAck] = useState<any>(null);
  const { busy, error: err, run, setError } = useAction();
  const closeForm = () => { setForm(null); setError(null); if (params.get('employee_id')) setParams({}); };

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post('/dev-plans', {
        employee_id: Number(form.employee_id), evaluation_id: form.evaluation_id ? Number(form.evaluation_id) : null, type: form.type, goal: form.goal, support: form.support || null,
        review_date: form.review_date || null, activities: form.activities.filter((a) => a.title).map((a) => ({ title: a.title, owner: a.owner || undefined, due: a.due || undefined, measure: a.measure || undefined })),
      });
      toast.success('Rencana pengembangan dibuat');
      closeForm(); reload();
    });
  };
  const toggleDone = (plan, idx) => run(async () => {
    const activities = plan.activities.map((a, i) => (i === idx ? { ...a, done: !a.done } : a));
    await api.patch(`/dev-plans/${plan.id}`, { activities });
    toast.success('Aktivitas diperbarui');
    reload();
  });
  const setStatus = (plan, status) => run(async () => { await api.patch(`/dev-plans/${plan.id}`, { status }); toast.success(`Status rencana diubah: ${status}`); reload(); });
  const setAct = (i, k, v) => setForm({ ...form, activities: form.activities.map((a, j) => (j === i ? { ...a, [k]: v } : a)) });

  const plans: any[] = data?.rows ?? [];
  const sum = data?.summary;
  const stat = (s) => sum?.counts?.[s] ?? 0; // ringkasan seluruh rencana, tidak mengikuti filter/halaman
  const TABS = [['active', 'Aktif', stat('active')], ['draft', 'Draft', stat('draft')], ['completed', 'Selesai', stat('completed')], ['cancelled', 'Dibatalkan', stat('cancelled')], ['all', 'Semua', stat('all')]];
  const shownTabs = TABS.filter(([k, , n]) => k === 'active' || k === 'all' || n > 0);
  const shown = plans;
  const acts = sum?.activities ?? { total: 0, done: 0, overdue: 0 };
  const overdueActs = acts.overdue;

  return (
    <Page title="Development Plan & PIP" eyebrow="Pengembangan" actions={mgmt && <Button onClick={() => setForm({ employee_id: '', evaluation_id: '', type: 'development', goal: '', support: '', review_date: '', activities: [blankAct()] })}><Plus />Rencana</Button>}>
      <ErrorBox error={err && !form && !ack ? err : null} />
      <Loading loading={loading && !data} error={error}>
        {data && <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Target} tone="blue" value={stat('active')} label="Rencana aktif" sub={`${sum?.pips ?? 0} berupa PIP`} />
            <StatCard icon={CheckCircle2} tone="green" value={acts.total ? `${acts.done}/${acts.total}` : '—'} label="Aktivitas selesai" sub={acts.total ? `${Math.round((acts.done / acts.total) * 100)}% dari rencana aktif` : 'belum ada aktivitas'} />
            <StatCard icon={Clock} tone={overdueActs ? 'red' : 'amber'} value={overdueActs} label="Aktivitas lewat tenggat" sub={overdueActs ? 'perlu ditindaklanjuti' : 'tidak ada yang tertunda'} />
            <StatCard icon={ShieldAlert} tone="violet" value={sum?.unacknowledged ?? 0} label="Belum di-acknowledge" sub="menunggu karyawan" />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter status rencana">
            {shownTabs.map(([k, label, n]) => (
              <Button key={k} role="tab" aria-selected={tab === k} size="sm" variant={tab === k ? 'default' : 'outline'} onClick={() => { setTab(k); setPage(1); }}>
                {label}<span className={`ml-1 rounded-full px-1.5 text-[11px] font-bold ${tab === k ? 'bg-white/25' : 'bg-muted'}`}>{n}</span>
              </Button>
            ))}
          </div>

          {shown.length === 0 && <Card><p className="py-6 text-center text-sm text-muted-foreground">Belum ada rencana pada filter ini.</p></Card>}
          <div className="grid gap-5 xl:grid-cols-2">
            {shown.map((p) => {
              const done = p.activities.filter((a) => a.done).length;
              const pct = p.activities.length ? Math.round((done / p.activities.length) * 100) : 0;
              const rd = p.review_date ? daysTo(p.review_date) : null;
              const pip = p.type === 'pip';
              return (
                <div key={p.id} className={`flex flex-col rounded-2xl border bg-card shadow-sm ${pip ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'}`}>
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{p.employee_name?.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</span>
                        <div className="leading-tight"><div className="font-semibold">{p.employee_name}</div><Badge tone={pip ? 'red' : 'blue'}>{pip ? 'PIP' : 'Development plan'}</Badge></div>
                      </div>
                      <Badge>{p.status}</Badge>
                    </div>
                    <p className="text-[15px] font-bold leading-snug">{p.goal}</p>
                    {p.support && <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px]"><b>Dukungan perusahaan:</b> {p.support}</p>}
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>{done}/{p.activities.length} aktivitas · {pct}%</span>
                        {rd != null && <span className={rd < 0 && p.status === 'active' ? 'font-semibold text-red-600 dark:text-red-400' : ''}>Review {fmtDate(p.review_date)}{p.status === 'active' ? (rd < 0 ? ` · lewat ${-rd} hari` : ` · ${rd} hari lagi`) : ''}</span>}
                      </div>
                      <Bar value={done} max={Math.max(p.activities.length, 1)} />
                    </div>
                  </div>
                  <ul className="divide-y border-t">
                    {p.activities.map((a, i) => {
                      const dd = a.due && !a.done ? daysTo(a.due) : null;
                      return (
                        <li key={i} className="flex items-start gap-3 px-5 py-3">
                          <Checkbox className="mt-0.5" checked={!!a.done} disabled={!mgmt || busy} onCheckedChange={() => toggleDone(p, i)} aria-label={`Selesai: ${a.title}`} />
                          <div className="min-w-0 flex-1 text-[13.5px]">
                            <div className={a.done ? 'text-muted-foreground line-through' : 'font-medium'}>{a.title}</div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                              {a.owner && <span>Owner: {a.owner}</span>}
                              {a.due && <span className={dd != null && dd < 0 ? 'font-semibold text-red-600 dark:text-red-400' : ''}>Tenggat {fmtDate(a.due)}{dd != null && dd < 0 ? ` · lewat ${-dd} hari` : ''}</span>}
                              {a.measure && <span>Ukuran: {a.measure}</span>}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-auto space-y-3 border-t p-4">
                    {p.acknowledged_at && <p className="text-xs text-muted-foreground">Di-acknowledge karyawan {fmtDate(p.acknowledged_at)}{p.employee_comment && ` — “${p.employee_comment}”`}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      {mgmt && p.status === 'draft' && <Button variant="outline" size="sm" onClick={() => setStatus(p, 'active')}>Aktifkan</Button>}
                      {mgmt && p.status === 'active' && <Button variant="outline" size="sm" onClick={() => setStatus(p, 'completed')}>Tandai selesai</Button>}
                      {mgmt && ['draft', 'active'].includes(p.status) && <Button variant="destructive" size="sm" onClick={async () => (await confirm({ title: 'Batalkan rencana?', tone: 'danger', confirmText: 'Batalkan rencana', cancelText: 'Kembali', description: 'Rencana pengembangan ini akan ditandai dibatalkan dan tidak lagi dipantau.' })) && setStatus(p, 'cancelled')}>Batalkan</Button>}
                      {user.employee_id === p.employee_id && !p.acknowledged_at && <Button size="sm" onClick={() => setAck({ id: p.id, comment: '' })}>Acknowledge</Button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationBar page={data.page} size={data.size} total={data.total} onPage={setPage} unit="rencana" />
        </div>}
      </Loading>
      {form && (
        <Modal title="Rencana pengembangan / PIP" onClose={closeForm} wide>
          <form onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Karyawan"><FormSelect value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required><option value="">Pilih…</option>{(emps.data?.rows ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></Field>
              <Field label="Jenis"><FormSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="development">Development plan</option><option value="pip">PIP</option></FormSelect></Field>
            </div>
            <Field label="Tujuan"><Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} required minLength={3} /></Field>
            <Field label={form.type === 'pip' ? 'Dukungan perusahaan' : 'Dukungan (opsional)'}><Textarea value={form.support} onChange={(e) => setForm({ ...form, support: e.target.value })} /></Field>
            <Field label="Tanggal review"><DatePicker value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} /></Field>
            <h3 className="mb-2 mt-4 font-semibold">Aktivitas / milestone</h3>
            {form.activities.map((a, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input placeholder="Aktivitas" value={a.title} onChange={(e) => setAct(i, 'title', e.target.value)} aria-label="Aktivitas" />
                <Input placeholder="Owner" value={a.owner} onChange={(e) => setAct(i, 'owner', e.target.value)} aria-label="Owner" />
                <DatePicker value={a.due} onChange={(e) => setAct(i, 'due', e.target.value)} aria-label="Tenggat" />
                <Input placeholder="Ukuran keberhasilan" value={a.measure} onChange={(e) => setAct(i, 'measure', e.target.value)} aria-label="Ukuran keberhasilan" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, activities: [...form.activities, blankAct()] })}>+ Aktivitas</Button>
            <ErrorBox error={err} />
            <div className="mt-3"><Button disabled={busy}>Simpan</Button></div>
          </form>
        </Modal>
      )}
      {ack && (
        <Modal title="Acknowledge rencana" onClose={() => setAck(null)}>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/dev-plans/${ack.id}/acknowledge`, { comment: ack.comment || undefined }); toast.success('Rencana di-acknowledge'); setAck(null); reload(); }); }}>
            <Field label="Komentar (opsional)"><Textarea value={ack.comment} onChange={(e) => setAck({ ...ack, comment: e.target.value })} /></Field>
            <ErrorBox error={err} /><Button disabled={busy}>Acknowledge</Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
