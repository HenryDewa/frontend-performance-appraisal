import { useState } from 'react';
import { toast } from 'sonner';
import { Award, GraduationCap, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmProvider';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../api.ts';
import { useSkillSuggestions } from '../lib/useSkillSuggestions.ts';
import { hasSeparator } from './TagInput.tsx';
import { SkillCombobox } from './SkillCombobox.tsx';
import { Badge, Card, ErrorBox, Field, Loading, Modal, fmtDate, useAction, useLoad } from '../ui.tsx';

// ---------------------------------------------------------------- Skill & tech stack
export const SKILL_LEVELS = [
  { value: 'dasar', label: 'Dasar', hint: 'Memahami konsep dan memakainya dengan bimbingan.', dots: 1, tone: 'bg-sky-500' },
  { value: 'praktisi', label: 'Praktisi', hint: 'Memakainya secara mandiri dalam pekerjaan sehari-hari.', dots: 2, tone: 'bg-amber-500' },
  { value: 'mahir', label: 'Mahir', hint: 'Sangat menguasai, bisa memimpin dan mengajarkan orang lain.', dots: 3, tone: 'bg-emerald-500' },
] as const;
export const LEVEL: Record<string, (typeof SKILL_LEVELS)[number]> = Object.fromEntries(SKILL_LEVELS.map((l) => [l.value, l]));

export function LevelDots({ level }: { level: string }) {
  const l = LEVEL[level];
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((n) => <i key={n} className={cn('size-2 rounded-full', n <= (l?.dots ?? 0) ? l.tone : 'bg-muted-foreground/25')} />)}
    </span>
  );
}

interface CardProps { employeeId: number; canEdit: boolean }

/** Skill / tech stack yang dicatat sendiri dengan tiga tingkat pemahaman: Dasar, Praktisi, Mahir. */
export function SkillsCard({ employeeId, canEdit }: CardProps) {
  const confirm = useConfirm();
  const list = useLoad<any[]>(() => api.get(`/employees/${employeeId}/skills`), [employeeId]);
  const [skill, setSkill] = useState('');
  const [level, setLevel] = useState('praktisi');
  const { busy, error, run, setError } = useAction();
  const rows = list.data ?? [];
  const suggestions = useSkillSuggestions();
  const mine = new Set(rows.map((r) => r.skill.toLowerCase()));
  const popular = suggestions.filter((s) => !mine.has(s.skill.toLowerCase()));
  const bad = hasSeparator(skill);
  const duplicate = mine.has(skill.trim().toLowerCase());

  const addSkill = (name: string) => run(async () => {
    await api.post(`/employees/${employeeId}/skills`, { skill: name.trim(), level });
    toast.success(`Skill ${name.trim()} ditambahkan`);
    setSkill('');
    list.reload();
  });
  const add = (e) => {
    e.preventDefault();
    if (!bad && !duplicate) addSkill(skill);
  };
  const change = (s, next) => run(async () => {
    await api.patch(`/skills/${s.id}`, { level: next });
    toast.success(`${s.skill}: ${LEVEL[next].label}`);
    list.reload();
  });
  const remove = async (s) => {
    if (!(await confirm({ title: `Hapus skill ${s.skill}?`, tone: 'danger', confirmText: 'Hapus' }))) return;
    run(async () => { await api.del(`/skills/${s.id}`); toast.success('Skill dihapus'); list.reload(); });
  };

  return (
    <Card title="Skill & tech stack" className="rounded-2xl" actions={<Sparkles className="size-4 text-muted-foreground" />}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SKILL_LEVELS.map((l) => <span key={l.value} className="inline-flex items-center gap-1.5" title={l.hint}><LevelDots level={l.value} /><b className="text-foreground">{l.label}</b> {l.hint}</span>)}
        </div>

        {canEdit && (
          <form onSubmit={add} className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-44 flex-1 gap-1.5 text-xs font-medium">Skill / tech stack
              <SkillCombobox value={skill} onChange={(v) => { setSkill(v); setError(null); }} onPick={(v) => { setSkill(v); setError(null); }} options={popular.map((s) => ({ value: s.skill, count: s.count }))} maxLength={80} invalid={bad} placeholder="Cari atau ketik skill, mis. React" />
            </label>
            <label className="grid w-40 gap-1.5 text-xs font-medium">Pemahaman
              <FormSelect value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Tingkat pemahaman">
                {SKILL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </FormSelect>
            </label>
            <Button disabled={busy || !skill.trim() || bad || duplicate}><Plus className="size-4" />Tambah</Button>
          </form>
        )}
        {canEdit && bad && <p role="alert" className="-mt-2 text-xs text-destructive">Tulis satu skill per isian, tanpa koma. Tekan Tambah, lalu isi skill berikutnya.</p>}
        {canEdit && !bad && duplicate && <p className="-mt-2 text-xs text-muted-foreground">Skill “{skill.trim()}” sudah ada di daftar Anda.</p>}
        {canEdit && popular.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Dipakai rekan Anda:</span>
            {popular.slice(0, 10).map((s) => (
              <button key={s.skill} type="button" disabled={busy} onClick={() => addSkill(s.skill)} title={`Dipakai ${s.count} orang/project — klik untuk menambahkan dengan tingkat ${LEVEL[level].label}`}
                className="rounded-full border px-2 py-0.5 hover:bg-muted hover:text-foreground disabled:opacity-50">+ {s.skill} <span className="opacity-60">{s.count}</span></button>
            ))}
          </div>
        )}
        <ErrorBox error={error} />

        <Loading loading={list.loading && !list.data} error={list.error}>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{canEdit ? 'Belum ada skill. Tambahkan skill dan tech stack yang Anda kuasai.' : 'Belum ada skill yang dicatat.'}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {rows.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
                  <LevelDots level={s.level} />
                  <span className="min-w-0 flex-1 truncate font-semibold" title={s.skill}>{s.skill}</span>
                  {canEdit ? (
                    <>
                      <FormSelect value={s.level} onChange={(e) => change(s, e.target.value)} disabled={busy} className="h-8 w-32 text-xs" aria-label={`Tingkat ${s.skill}`}>
                        {SKILL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </FormSelect>
                      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Hapus ${s.skill}`} onClick={() => remove(s)}><Trash2 className="size-4 text-destructive" /></Button>
                    </>
                  ) : <Badge tone={s.level === 'mahir' ? 'green' : s.level === 'praktisi' ? 'amber' : 'blue'}>{LEVEL[s.level]?.label}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Loading>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Sertifikasi & training
const KINDS = [
  { value: 'sertifikasi', label: 'Sertifikasi', icon: Award, tone: 'amber' },
  { value: 'training', label: 'Training', icon: GraduationCap, tone: 'blue' },
] as const;
const EMPTY = { id: null as number | null, kind: 'sertifikasi', title: '', date: '', notes: '' };

function CertForm({ employeeId, initial, onClose, onSaved }: { employeeId: number; initial: typeof EMPTY; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const { busy, error, run } = useAction();
  const isSertifikasi = f.kind === 'sertifikasi';
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = { kind: f.kind, title: f.title.trim(), date: f.date, notes: f.notes.trim() || null };
      if (f.id) await api.patch(`/certifications/${f.id}`, body);
      else await api.post(`/employees/${employeeId}/certifications`, body);
      toast.success(f.id ? 'Data diperbarui' : `${isSertifikasi ? 'Sertifikasi' : 'Training'} ditambahkan`);
      onSaved();
    });
  };
  return (
    <Modal title={f.id ? 'Ubah sertifikasi / training' : 'Tambah sertifikasi / training'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Jenis">
          <FormSelect value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </FormSelect>
        </Field>
        <Field label={isSertifikasi ? 'Nama sertifikasi' : 'Nama training'}>
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} required autoFocus placeholder={isSertifikasi ? 'mis. AWS Certified Developer' : 'mis. Workshop React Performance'} />
        </Field>
        <Field label={isSertifikasi ? 'Tanggal pengambilan sertifikat' : 'Tanggal training'}>
          <DatePicker value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
        </Field>
        <Field label="Keterangan" hint="Opsional: penyelenggara, nomor sertifikat, skor, atau catatan lain.">
          <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={1000} rows={3} />
        </Field>
        <ErrorBox error={error} />
        <div className="mt-2 flex gap-2"><Button disabled={busy || !f.title.trim() || !f.date}>Simpan</Button><Button type="button" variant="outline" onClick={onClose}>Batal</Button></div>
      </form>
    </Modal>
  );
}

/** Riwayat sertifikasi dan training yang diikuti, lengkap dengan tanggal dan keterangan. */
export function CertificationsCard({ employeeId, canEdit }: CardProps) {
  const confirm = useConfirm();
  const list = useLoad<any[]>(() => api.get(`/employees/${employeeId}/certifications`), [employeeId]);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const { run } = useAction();
  const rows = list.data ?? [];

  const remove = async (c) => {
    if (!(await confirm({ title: `Hapus ${c.title}?`, tone: 'danger', confirmText: 'Hapus' }))) return;
    run(async () => { await api.del(`/certifications/${c.id}`); toast.success('Data dihapus'); list.reload(); });
  };

  return (
    <Card
      title="Sertifikasi & training" className="rounded-2xl"
      actions={canEdit && <Button size="sm" onClick={() => setForm({ ...EMPTY })}><Plus className="size-4" />Tambah</Button>}
    >
      <Loading loading={list.loading && !list.data} error={list.error}>
        {rows.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Award className="size-4" />{canEdit ? 'Belum ada data. Catat sertifikasi atau training yang pernah Anda ikuti.' : 'Belum ada sertifikasi atau training yang dicatat.'}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((c) => {
              const k = KINDS.find((x) => x.value === c.kind) ?? KINDS[1];
              const Icon = k.icon;
              return (
                <li key={c.id} className="flex flex-wrap items-start gap-3 rounded-xl border bg-muted/20 p-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground"><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{c.title}</span><Badge tone={k.tone}>{k.label}</Badge></div>
                    <div className="text-xs text-muted-foreground">{c.kind === 'sertifikasi' ? 'Diambil' : 'Tanggal'} {fmtDate(c.date)}</div>
                    {c.notes && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{c.notes}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Ubah ${c.title}`} onClick={() => setForm({ id: c.id, kind: c.kind, title: c.title, date: String(c.date).slice(0, 10), notes: c.notes ?? '' })}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Hapus ${c.title}`} onClick={() => remove(c)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Loading>
      {form && <CertForm employeeId={employeeId} initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />}
    </Card>
  );
}
