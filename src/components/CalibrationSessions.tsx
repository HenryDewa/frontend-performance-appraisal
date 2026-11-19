import { useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { api } from '../api.ts';
import { Badge, Bar, Card, ErrorBox, Field, Loading, Modal, fmtDate, useAction, useLoad } from '../ui.tsx';

export const RULES = [
  { key: 'divergent', label: 'Selisih evaluator besar', desc: 'Ada indikator yang dinilai sangat berbeda antar-evaluator, juga evaluator yang cenderung longgar/ketat.' },
  { key: 'near_threshold', label: 'Dekat batas klasifikasi', desc: 'Skor akhir berjarak ≤ 2 poin dari batas Middle atau Top sesuai seniority.' },
  { key: 'redistributed', label: 'Bobot didistribusi ulang', desc: 'Ada sumber penilaian yang belum tersedia sehingga bobotnya dibagi ulang.' },
  { key: 'extremes', label: 'Hasil ekstrem', desc: 'Klasifikasi Low Performer atau Top Performer.' },
];

function CreateModal({ periodId, periodName, onClose }: { periodId?: any; periodName?: any; onClose?: any }) {
  const nav = useNavigate();
  const { busy, error, run } = useAction();
  const [title, setTitle] = useState(`Kalibrasi ${periodName ?? ''}`.trim());
  const [rules, setRules] = useState({ divergent: true, near_threshold: true, redistributed: true, extremes: true });
  const [empty, setEmpty] = useState<any>(null);

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api.post('/calibration/sessions', { period_id: Number(periodId), title: title.trim() || undefined, rules });
      toast.success('Sesi kalibrasi dibuat');
      if (r.items_count === 0) setEmpty(r); else nav(`/calibration/sessions/${r.id}`);
    });
  };

  if (empty) {
    return (
      <Modal title="Sesi kalibrasi dibuat" onClose={onClose}>
        <p className="text-sm text-muted-foreground">{empty.hint ?? 'Tidak ada evaluasi yang memenuhi aturan yang dipilih.'}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={() => nav(`/calibration/sessions/${empty.id}`)}>Buka sesi</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Mulai sesi kalibrasi" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mb-3 text-sm text-muted-foreground">
          Sesi otomatis memuat evaluasi berstatus Submitted, Under Review, atau Approved yang memenuhi minimal satu aturan di bawah. Keputusan sesi hanya berupa catatan — tidak mengubah skor atau status evaluasi.
        </p>
        <Field label="Judul sesi"><Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></Field>
        <fieldset className="mb-3 space-y-2.5">
          <legend className="mb-1.5 text-[13px] font-semibold">Aturan evaluasi yang dibahas</legend>
          {RULES.map((r) => (
            <label key={r.key} className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 hover:bg-muted/50">
              <Checkbox className="mt-0.5" checked={rules[r.key]} onCheckedChange={(v) => setRules({ ...rules, [r.key]: v === true })} />
              <span className="grid gap-0.5"><span className="text-sm font-medium">{r.label}</span><span className="text-xs text-muted-foreground">{r.desc}</span></span>
            </label>
          ))}
        </fieldset>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Membuat…' : 'Mulai sesi'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Daftar sesi kalibrasi manajemen untuk satu periode + tombol membuat sesi baru. */
export function CalibrationSessions({ periodId, periodName }: { periodId?: any; periodName?: any }) {
  const { data, error, loading } = useLoad(() => (periodId ? api.get(`/calibration/sessions?period_id=${periodId}`) : Promise.resolve([])), [periodId]);
  const [creating, setCreating] = useState(false);
  const rows = data ?? [];

  return (
    <Card
      title={<span className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" />Sesi kalibrasi</span>}
      actions={<Button size="sm" onClick={() => setCreating(true)} disabled={!periodId}><Plus />Mulai sesi kalibrasi</Button>}
    >
      <p className="mb-3 text-sm text-muted-foreground">Ruang rapat manajemen: bahas evaluasi yang perlu dikalibrasi, catat keputusan per evaluasi, lalu tutup sesi dengan ringkasan.</p>
      <Loading loading={loading && !data} error={error}>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada sesi kalibrasi pada periode ini.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-48 flex-1">
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.created_by_name ?? '—'} · dibuat {fmtDate(s.created_at)}{s.closed_at && ` · ditutup ${fmtDate(s.closed_at)}`}</div>
                </div>
                <Badge tone={s.status === 'open' ? 'blue' : 'gray'}>{s.status === 'open' ? 'Berjalan' : 'Ditutup'}</Badge>
                <div className="w-40">
                  <div className="mb-1 text-xs font-semibold">{s.items_decided}/{s.items_total} diputuskan</div>
                  <Bar value={s.items_decided} max={s.items_total || 1} label={`${s.items_decided} dari ${s.items_total} item diputuskan`} />
                </div>
                <Button asChild size="sm" variant="outline"><Link to={`/calibration/sessions/${s.id}`}>Buka</Link></Button>
              </li>
            ))}
          </ul>
        )}
      </Loading>
      {creating && <CreateModal periodId={periodId} periodName={periodName} onClose={() => setCreating(false)} />}
    </Card>
  );
}
