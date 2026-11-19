import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Clock, ExternalLink, GraduationCap, Pencil, Plus, Power, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { Textarea } from '@/components/ui/textarea';
import { api, qs } from '../api.ts';
import { useAuth, isHR, isMgmt } from '../auth.tsx';
import { Badge, Card, ErrorBox, Field, Loading, Modal, Page, useAction, useLoad } from '../ui.tsx';
import TrainingCard from '../components/TrainingCard.tsx';
import { AssignTrainingModal, KIND_LABEL, KindBadge, SENIORITY_LABEL } from '../components/career-common.tsx';

const EMPTY = { title: '', kind: 'training', provider: '', url: '', duration_hours: '', description: '', indicator_codes: [], seniorities: [], active: true };

function CatalogForm({ initial, indicators, onClose, onSaved }: { initial?: any; indicators?: any; onClose?: any; onSaved?: any }) {
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial, provider: initial.provider ?? '', url: initial.url ?? '', description: initial.description ?? '', duration_hours: initial.duration_hours ?? '' } : EMPTY);
  const { busy, error, run } = useAction();
  const toggle = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = {
        title: f.title, kind: f.kind, provider: f.provider || null, url: f.url || null,
        duration_hours: f.duration_hours === '' ? null : Number(f.duration_hours),
        description: f.description || null, indicator_codes: f.indicator_codes, seniorities: f.seniorities, active: f.active,
      };
      if (initial?.id) await api.patch(`/training/catalog/${initial.id}`, body);
      else await api.post('/training/catalog', body);
      toast.success('Katalog disimpan');
      onSaved();
    });
  };
  return (
    <Modal title={initial?.id ? 'Ubah item katalog' : 'Tambah item katalog'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <Field label="Judul"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required minLength={2} maxLength={200} /></Field>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label="Jenis">
            <FormSelect value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </FormSelect>
          </Field>
          <Field label="Penyedia"><Input value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} maxLength={200} /></Field>
          <Field label="Durasi (jam)"><Input type="number" min="0" step="0.5" value={f.duration_hours} onChange={(e) => setF({ ...f, duration_hours: e.target.value })} /></Field>
        </div>
        <Field label="Tautan"><Input type="url" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
        <Field label="Deskripsi"><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={2000} /></Field>
        <div className="mb-3 grid gap-1.5">
          <span className="text-[13px] font-semibold">Indikator terkait</span>
          <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">
            {indicators.map((i) => (
              <label key={i.code} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={f.indicator_codes.includes(i.code)} onCheckedChange={() => toggle('indicator_codes', i.code)} /> {i.name}
              </label>
            ))}
          </div>
        </div>
        <div className="mb-3 grid gap-1.5">
          <span className="text-[13px] font-semibold">Seniority sasaran <span className="font-normal text-muted-foreground">(kosong = semua)</span></span>
          <div className="flex flex-wrap gap-4 rounded-xl border p-3">
            {Object.entries(SENIORITY_LABEL).map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={f.seniorities.includes(k)} onCheckedChange={() => toggle('seniorities', k)} /> {l}
              </label>
            ))}
          </div>
        </div>
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <Button disabled={busy}>Simpan</Button>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Training() {
  const { user } = useAuth();
  const hr = isHR(user);
  const mgmt = isMgmt(user);
  const [kind, setKind] = useState('');
  const [indicator, setIndicator] = useState('');
  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [assign, setAssign] = useState<any>(null);
  const [rev, setRev] = useState(0);
  const inds = useLoad(() => api.get('/indicators'));
  const cat = useLoad(() => api.get(`/training/catalog${qs({ kind, indicator })}`), [kind, indicator]);
  const indList = (inds.data?.indicators ?? []).filter((i) => i.active);
  const indName = useMemo(() => Object.fromEntries((inds.data?.indicators ?? []).map((i) => [i.code, i.name])), [inds.data]);
  const rows = (cat.data ?? []).filter((c) => (showInactive || c.active) && (!q || `${c.title} ${c.provider ?? ''} ${c.description ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  const toggleActive = async (c) => {
    try {
      await api.patch(`/training/catalog/${c.id}`, { active: !c.active });
      toast.success(c.active ? 'Item dinonaktifkan' : 'Item diaktifkan');
      cat.reload();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <Page eyebrow="Pengembangan" title="Katalog Training" actions={hr && <Button onClick={() => setForm({})}><Plus className="size-4" /> Tambah item</Button>}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari training…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" />
        </div>
        <FormSelect value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Jenis" className="w-auto min-w-36">
          <option value="">Semua jenis</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </FormSelect>
        <FormSelect value={indicator} onChange={(e) => setIndicator(e.target.value)} aria-label="Indikator" className="w-auto min-w-48">
          <option value="">Semua indikator</option>
          {indList.map((i) => <option key={i.code} value={i.code}>{i.name}</option>)}
        </FormSelect>
        {hr && <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} /> Tampilkan nonaktif</label>}
      </div>

      <Loading loading={cat.loading} error={cat.error}>
        {rows.length === 0 ? (
          <Card className="rounded-2xl"><p className="flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap className="size-4" /> Tidak ada item katalog yang cocok.</p></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <div key={c.id} className={`flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm ${c.active ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={c.kind} />
                  {c.duration_hours != null && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5" />{c.duration_hours} jam</span>}
                  {!c.active && <Badge tone="gray">Nonaktif</Badge>}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold leading-snug">{c.title}</h3>
                  {c.provider && <div className="text-xs text-muted-foreground">{c.provider}</div>}
                </div>
                {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {c.indicator_codes.map((code) => <Badge key={code} tone="blue">{indName[code] ?? code}</Badge>)}
                  {c.seniorities.length > 0 && <Badge tone="gray">{c.seniorities.map((s) => SENIORITY_LABEL[s]).join(' / ')}</Badge>}
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {c.url && <Button asChild size="sm" variant="outline"><a href={c.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Buka</a></Button>}
                  {mgmt && c.active && <Button size="sm" onClick={() => setAssign(c)}><UserPlus className="size-3.5" /> Tugaskan</Button>}
                  {hr && <Button size="sm" variant="outline" onClick={() => setForm(c)}><Pencil className="size-3.5" /> Ubah</Button>}
                  {hr && <Button size="sm" variant={c.active ? 'destructive' : 'outline'} onClick={() => toggleActive(c)}><Power className="size-3.5" /> {c.active ? 'Nonaktifkan' : 'Aktifkan'}</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Loading>

      {user?.employee_id && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold">Training saya</h2>
          <TrainingCard employeeId={user.employee_id} isSelf rev={rev} onChange={() => setRev((n) => n + 1)} />
        </div>
      )}

      {form && <CatalogForm initial={form.id ? form : null} indicators={indList} onClose={() => setForm(null)} onSaved={() => { setForm(null); cat.reload(); }} />}
      {assign && <AssignTrainingModal training={assign} onClose={() => setAssign(null)} onDone={() => toast.success('Training ditugaskan')} />}
    </Page>
  );
}
