import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmProvider';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, Lock, Plus, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalibrationCard } from '@/components/CalibrationCard';
import { EvaluationDiscussion } from '@/components/EvaluationDiscussion';
import { api } from '../api.ts';
import { useAuth, isHR } from '../auth.tsx';
import { Badge, Bar, Card, ErrorBox, Field, Loading, Modal, Page, SOURCE_LABEL, fmt, fmtDate, useAction, useLoad } from '../ui.tsx';

const DECISIONS = [
  { key: 'ok', label: 'Sesuai, tidak ada perubahan', tone: 'green' },
  { key: 'revisi', label: 'Minta revisi evaluator', tone: 'amber', needNote: true },
  { key: 'tindak_lanjut', label: 'Tindak lanjut (PIP/pengembangan)', tone: 'blue', needNote: true },
  { key: 'tunda', label: 'Tunda', tone: 'gray' },
];
const DECISION = Object.fromEntries(DECISIONS.map((d) => [d.key, d]));
const STATUS = { pending: ['Belum dibahas', 'bg-slate-400'], discussed: ['Sudah dibahas', 'bg-amber-500'], decided: ['Diputuskan', 'bg-emerald-500'] };
const FLAG_TONE = { divergent: 'amber', near_threshold: 'blue', redistributed: 'gray', extremes: 'red', bias_evaluator: 'amber', manual: 'gray' };
const BIAS = { longgar: ['Longgar', 'amber'], ketat: ['Ketat', 'blue'], netral: ['Netral', 'green'], data_kurang: ['Data kurang', 'gray'] };
const TH = 'text-xs uppercase tracking-wide text-muted-foreground';
const FILTERS = [['all', 'Semua'], ['open', 'Belum diputuskan'], ['done', 'Sudah diputuskan']];
const when = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '');

const StatusDot = ({ status }: { status?: any }) => <span className={cn('inline-block size-2 shrink-0 rounded-full', STATUS[status][1])} title={STATUS[status][0]} role="img" aria-label={STATUS[status][0]} />;
const Chip = ({ flag, className }: { flag?: any; className?: any }) => <Badge tone={flag.code === 'extremes' ? (flag.label === 'Top Performer' ? 'green' : 'red') : FLAG_TONE[flag.code]} className={cn('px-2 py-0 text-[11px]', className)}>{flag.label}</Badge>;

// ---------- statistik ----------
function Stats({ stats }: { stats?: any }) {
  const dist = stats.distribution;
  const total = Object.values<number>(dist).reduce((s, n) => s + n, 0) || 1;
  const bars = [['Top Performer', 'bg-emerald-500'], ['Middle Performer', 'bg-amber-500'], ['Low Performer', 'bg-red-500']];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card title="Distribusi klasifikasi" className="py-4">
        <ul className="space-y-2.5">
          {bars.map(([k, cls]) => (
            <li key={k}>
              <div className="mb-1 flex justify-between text-xs"><span>{k}</span><b>{dist[k]}</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${k}: ${dist[k]} dari ${total}`}><div className={cn('h-full rounded-full', cls)} style={{ width: `${(dist[k] / total) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Rata-rata skor per seniority" className="py-4">
        {stats.by_seniority.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hasil.</p> : (
          <ul className="space-y-2.5">
            {stats.by_seniority.map((s) => (
              <li key={s.seniority}>
                <div className="mb-1 flex justify-between text-xs"><span className="capitalize">{s.seniority} <span className="text-muted-foreground">({s.count})</span></span><b>{fmt(s.avg)}</b></div>
                <Bar value={s.avg} max={100} label={`${s.seniority}: ${fmt(s.avg)}`} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Kecenderungan evaluator" className="py-4 md:col-span-2 xl:col-span-1">
        {stats.evaluators.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada penilaian terkirim.</p> : (
          <div className="no-scrollbar max-h-44 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left"><th className={cn(TH, 'pb-1 font-medium')}>Evaluator</th><th className={cn(TH, 'pb-1 text-right font-medium')}>Dev.</th><th className="pb-1" /></tr></thead>
              <tbody>
                {stats.evaluators.map((e) => {
                  const [label, tone] = BIAS[e.bias];
                  return (
                    <tr key={`${e.evaluator_user_id}-${e.source}`} className="border-t">
                      <td className="py-1.5 pr-2"><b>{e.evaluator_name}</b><div className="text-muted-foreground">{SOURCE_LABEL[e.source]} · {e.count} dinilai</div></td>
                      <td className="py-1.5 pr-2 text-right font-bold">{e.deviation > 0 ? '+' : ''}{fmt(e.deviation)}</td>
                      <td className="py-1.5 text-right"><Badge tone={tone} className="px-2 py-0 text-[11px]">{label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- daftar item ----------
function ItemList({ items, selectedId, onSelect }: { items?: any; selectedId?: any; onSelect?: any }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const shown = items.filter((i) => (filter === 'all' || (filter === 'done' ? i.status === 'decided' : i.status !== 'decided'))
    && (!term || i.employee.name.toLowerCase().includes(term) || i.employee.code.toLowerCase().includes(term)));

  const onKey = (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const idx = shown.findIndex((i) => i.id === selectedId);
    const next = shown[Math.max(0, Math.min(shown.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) { e.preventDefault(); onSelect(next.id); e.currentTarget.querySelector(`[data-item="${next.id}"]`)?.focus(); }
  };

  return (
    <Card className="gap-3 py-4" title={`Evaluasi dibahas (${items.length})`}>
      <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
        {FILTERS.map(([k, label]) => <Button key={k} size="xs" variant={filter === k ? 'default' : 'outline'} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</Button>)}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama / kode…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari evaluasi" />
      </div>
      <ul className="no-scrollbar -mx-1 max-h-[32rem] space-y-1.5 overflow-y-auto px-1 py-1 lg:max-h-[70vh]" onKeyDown={onKey}>
        {shown.map((it) => {
          const sel = it.id === selectedId;
          return (
            <li key={it.id}>
              <button
                type="button" data-item={it.id} onClick={() => onSelect(it.id)} aria-current={sel}
                className={cn('w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', sel && 'border-primary bg-primary/5 ring-1 ring-primary')}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1.5"><StatusDot status={it.status} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{it.employee.name}</div>
                    <div className="text-xs text-muted-foreground">{it.employee.code} · {it.employee.seniority}</div>
                  </div>
                  <div className="text-right"><b>{fmt(it.final_score)}</b></div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Badge className="px-2 py-0 text-[11px]">{it.classification}</Badge>
                  {it.flags.map((f) => <span key={f.code} title={f.detail ?? f.label}><Chip flag={f} /></span>)}
                </div>
                {it.decision && <div className="mt-1.5"><Badge tone={DECISION[it.decision].tone} className="px-2 py-0 text-[11px]">{DECISION[it.decision].label}</Badge></div>}
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-3 text-center text-sm text-muted-foreground">{items.length === 0 ? 'Belum ada item. Tambahkan evaluasi secara manual.' : 'Tidak ada item yang cocok.'}</li>}
      </ul>
    </Card>
  );
}

// ---------- form keputusan ----------
function DecisionForm({ item, open, onSaved }: { item?: any; open?: any; onSaved?: any }) {
  const [decision, setDecision] = useState(item.decision ?? '');
  const [note, setNote] = useState(item.note ?? '');
  const { busy, error, run } = useAction();
  const need = DECISION[decision]?.needNote;
  const missingNote = need && !note.trim();

  const save = () => run(async () => { await api.patch(`/calibration/items/${item.id}`, { decision, note }); toast.success('Keputusan kalibrasi disimpan'); onSaved(); });
  const discussed = () => run(async () => { await api.patch(`/calibration/items/${item.id}`, { status: 'discussed', ...(note !== (item.note ?? '') ? { note } : {}) }); toast.success('Ditandai sudah dibahas'); onSaved(); });

  return (
    <Card title="Keputusan kalibrasi" actions={<span className="flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot status={item.status} />{STATUS[item.status][0]}</span>}>
      <p className="mb-3 text-xs text-muted-foreground">Keputusan hanya berupa catatan — skor dan status evaluasi tidak berubah otomatis. Untuk menindaklanjuti, buka halaman evaluasi.</p>
      <div role="radiogroup" aria-label="Keputusan" className="mb-3 grid gap-2 sm:grid-cols-2">
        {DECISIONS.map((d) => (
          <button
            key={d.key} type="button" role="radio" aria-checked={decision === d.key} disabled={!open} onClick={() => setDecision(d.key)}
            className={cn('rounded-lg border p-3 text-left text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70',
              decision === d.key && 'border-primary bg-primary/5 ring-1 ring-primary')}
          >
            <span className={cn('mr-2 inline-block size-3.5 rounded-full border align-[-2px]', decision === d.key ? 'border-primary bg-primary' : 'border-muted-foreground')} />
            {d.label}
          </button>
        ))}
      </div>
      <Field label="Catatan keputusan" hint={need ? 'Wajib diisi untuk keputusan ini (maks. 2000 karakter).' : 'Opsional (maks. 2000 karakter).'}>
        <Textarea rows={3} maxLength={2000} value={note} disabled={!open} onChange={(e) => setNote(e.target.value)} aria-invalid={missingNote || undefined} placeholder="Alasan, kesepakatan, atau langkah berikutnya…" />
      </Field>
      {item.decided_at && <p className="mb-2 text-xs text-muted-foreground">Diputuskan oleh {item.decided_by_name ?? '—'} · {when(item.decided_at)}</p>}
      <ErrorBox error={error} className="my-2" />
      {open && (
        <div className="flex flex-wrap justify-end gap-2">
          {item.status === 'pending' && <Button variant="outline" disabled={busy} onClick={discussed}>Tandai sudah dibahas</Button>}
          <Button disabled={busy || !decision || missingNote} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan keputusan'}</Button>
        </div>
      )}
    </Card>
  );
}

// ---------- detail item ----------
function ItemDetail({ item, open, onChanged, onRemove }: { item?: any; open?: any; onChanged?: any; onRemove?: any }) {
  const e = item.employee;
  return (
    <div className="space-y-4">
      <Card className="py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{e.name}</h2>
            <div className="text-sm text-muted-foreground">{e.code} · {e.seniority} · {e.department}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold leading-none">{fmt(item.final_score)}</div>
            <div className="mt-1.5 flex flex-wrap justify-end gap-1.5"><Badge>{item.classification}</Badge><Badge>{item.evaluation_status}</Badge></div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><Link to={`/evaluations/${item.evaluation_id}`}><ExternalLink />Buka evaluasi</Link></Button>
          {open && <Button size="sm" variant="outline" onClick={onRemove}><Trash2 />Keluarkan dari sesi</Button>}
        </div>
        <ul className="mt-4 space-y-2">
          {item.flags.map((f) => (
            <li key={f.code} className="flex flex-wrap items-baseline gap-2 text-sm">
              <Chip flag={f} />
              <span className="text-muted-foreground">{f.detail ?? '—'}</span>
            </li>
          ))}
        </ul>
      </Card>
      <DecisionForm key={`${item.id}-${item.decided_at}-${item.status}`} item={item} open={open} onSaved={onChanged} />
      <CalibrationCard evaluationId={item.evaluation_id} />
      <EvaluationDiscussion evaluationId={item.evaluation_id} />
    </div>
  );
}

// ---------- dialog ----------
function AddDialog({ session, items, onClose, onAdded }: { session?: any; items?: any; onClose?: any; onAdded?: any }) {
  const list = useLoad(() => api.get(`/evaluations?period_id=${session.period_id}`), [session.period_id]);
  const { busy, error, run } = useAction();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<any>(null);
  const [reason, setReason] = useState('');
  const have = new Set(items.map((i) => i.evaluation_id));
  const term = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((r) => r.final_score != null && !have.has(r.id) && (!term || r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term)));

  const add = () => run(async () => { const r = await api.post(`/calibration/sessions/${session.id}/items`, { evaluation_id: picked, reason: reason.trim() || undefined }); toast.success('Evaluasi ditambahkan ke sesi'); onAdded(r.id); });

  return (
    <Modal title="Tambah evaluasi ke sesi" onClose={onClose}>
      <Input placeholder="Cari nama / kode…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari evaluasi" className="mb-2" />
      <Loading loading={list.loading && !list.data} error={list.error}>
        <ul className="no-scrollbar mb-3 max-h-60 space-y-1 overflow-y-auto" role="listbox" aria-label="Evaluasi">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" role="option" aria-selected={picked === r.id} onClick={() => setPicked(r.id)}
                className={cn('flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', picked === r.id && 'border-primary bg-primary/5 ring-1 ring-primary')}>
                <span><b>{r.name}</b><span className="ml-2 text-xs text-muted-foreground">{r.code} · {r.seniority}</span></span>
                <span className="flex items-center gap-2"><b>{fmt(r.final_score)}</b><Badge className="px-2 py-0 text-[11px]">{r.classification ?? r.status}</Badge></span>
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="p-3 text-center text-sm text-muted-foreground">Tidak ada evaluasi tersedia (hanya yang sudah memiliki hasil dan belum ada di sesi).</li>}
        </ul>
      </Loading>
      <Field label="Alasan (opsional)"><Input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Mengapa perlu dibahas?" /></Field>
      <ErrorBox error={error} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button disabled={!picked || busy} onClick={add}>{busy ? 'Menambah…' : 'Tambahkan'}</Button>
      </div>
    </Modal>
  );
}

function CloseDialog({ session, undecided, onClose, onClosed }: { session?: any; undecided?: any; onClose?: any; onClosed?: any }) {
  const { busy, error, run } = useAction();
  const [summary, setSummary] = useState('');
  const force = undecided > 0;
  const submit = () => run(async () => { await api.post(`/calibration/sessions/${session.id}/close`, { summary: summary.trim() || undefined, force: force || undefined }); toast.success('Sesi kalibrasi ditutup'); onClosed(); });
  return (
    <Modal title="Selesaikan sesi kalibrasi" onClose={onClose}>
      {force && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Masih ada <b>{undecided}</b> item yang belum diputuskan. Sesi hanya bisa ditutup paksa dengan ringkasan yang menjelaskan alasannya.
        </div>
      )}
      <Field label={force ? 'Ringkasan & alasan tutup paksa (wajib)' : 'Ringkasan sesi (opsional)'} hint="Tampil sebagai catatan akhir pada sesi. Setelah ditutup, sesi hanya dapat dibaca.">
        <Textarea rows={5} maxLength={4000} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Kesimpulan utama, tindak lanjut yang disepakati…" />
      </Field>
      <ErrorBox error={error} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button variant={force ? 'destructive' : 'default'} disabled={busy || (force && !summary.trim())} onClick={submit}>{busy ? 'Menutup…' : force ? 'Tutup paksa' : 'Tutup sesi'}</Button>
      </div>
    </Modal>
  );
}

// ---------- halaman ----------
export default function CalibrationSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(() => api.get(`/calibration/sessions/${id}`), [id]);
  const [selected, setSelected] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(false);
  const rm = useAction();

  const items = useMemo(() => data?.items ?? [], [data]);
  useEffect(() => {
    if (!items.length) { setSelected(null); return; }
    if (!items.some((i) => i.id === selected)) setSelected(items[0].id);
  }, [items, selected]);

  const session = data?.session;
  const open = session?.status === 'open';
  const item = items.find((i) => i.id === selected);
  const progress = data?.stats.progress;
  const canClose = open && (isHR(user) || session.created_by === user?.id);

  const confirm = useConfirm();
  const remove = async () => {
    if (!item) return;
    if (!(await confirm({
      title: 'Keluarkan dari sesi?', tone: 'danger', confirmText: 'Keluarkan',
      description: `${item.employee.name} akan dikeluarkan dari daftar pembahasan sesi ini. Keputusan yang sudah dicatat untuk evaluasi ini ikut dihapus.`,
    }))) return;
    rm.run(async () => { await api.del(`/calibration/sessions/${session.id}/items/${item.id}`); toast.success('Evaluasi dikeluarkan dari sesi'); reload(); });
  };

  return (
    <Page
      eyebrow={session ? `Sesi kalibrasi · ${session.period_name}` : 'Sesi kalibrasi'}
      title={session?.title ?? 'Sesi kalibrasi'}
      actions={(
        <>
          <Button asChild variant="outline"><Link to="/evaluations?tab=kalibrasi"><ArrowLeft />Kembali</Link></Button>
          {open && <Button variant="outline" onClick={() => setAdding(true)}><Plus />Tambah evaluasi</Button>}
          {canClose && <Button onClick={() => setClosing(true)}><CheckCircle2 />Selesaikan sesi</Button>}
        </>
      )}
    >
      <Loading loading={loading && !data} error={error}>
        {data && (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge tone={open ? 'blue' : 'gray'}>{open ? 'Berjalan' : 'Ditutup'}</Badge>
              <span className="text-sm text-muted-foreground">Dibuat {session.created_by_name ?? '—'} · {fmtDate(session.created_at)}</span>
              <div className="flex min-w-48 items-center gap-2">
                <Bar value={progress.decided} max={progress.total || 1} label="Progres keputusan" className="w-40" />
                <b className="text-sm">{progress.decided}/{progress.total} diputuskan</b>
              </div>
              {progress.discussed > 0 && <span className="text-xs text-muted-foreground">{progress.discussed} sudah dibahas</span>}
            </div>

            {!open && (
              <div className="flex gap-3 rounded-lg border bg-muted/50 p-4 text-sm" role="status">
                <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <b>Sesi ditutup — hanya dapat dibaca.</b>
                  <span className="text-muted-foreground"> Oleh {session.closed_by_name ?? '—'} · {when(session.closed_at)}</span>
                  {session.summary && <p className="mt-2 whitespace-pre-wrap">{session.summary}</p>}
                </div>
              </div>
            )}

            <ErrorBox error={rm.error} />
            <Stats stats={data.stats} />

            {items.length === 0 ? (
              <Card><p className="text-sm text-muted-foreground">Tidak ada evaluasi di sesi ini. {open ? 'Gunakan "Tambah evaluasi" untuk memasukkan evaluasi secara manual.' : ''}</p></Card>
            ) : (
              <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
                <ItemList items={items} selectedId={selected} onSelect={setSelected} />
                {item && <ItemDetail item={item} open={open} onChanged={reload} onRemove={remove} />}
              </div>
            )}
          </>
        )}
      </Loading>

      {adding && <AddDialog session={session} items={items} onClose={() => setAdding(false)} onAdded={(newId) => { setAdding(false); setSelected(newId); reload(); }} />}
      {closing && <CloseDialog session={session} undecided={items.filter((i) => i.status !== 'decided').length} onClose={() => setClosing(false)} onClosed={() => { setClosing(false); reload(); }} />}
    </Page>
  );
}
