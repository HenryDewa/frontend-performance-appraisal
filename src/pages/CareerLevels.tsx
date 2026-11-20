import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Info, Pencil, Plus, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../api.ts';
import { Badge, Card, Drawer, ErrorBox, Field, Loading, Page, useAction, useLoad } from '../ui.tsx';

const SENIORITIES = ['junior', 'middle', 'senior'];
const MUTED = 'text-xs text-muted-foreground';

type Level = {
  id: number; code: string; name: string; seniority: string | null; sort: number; description: string | null;
  expectations: string[]; min_avg_score: number | null; min_tenure_months: number | null; active: boolean;
};

const blank = { id: null as number | null, code: '', name: '', seniority: '', sort: '', description: '', expectations: '', min_avg_score: '', min_tenure_months: '', active: true };
const editOf = (l: Level) => ({
  id: l.id, code: l.code, name: l.name, seniority: l.seniority ?? '', sort: String(l.sort), description: l.description ?? '',
  expectations: l.expectations.join('\n'), min_avg_score: l.min_avg_score == null ? '' : String(l.min_avg_score),
  min_tenure_months: l.min_tenure_months == null ? '' : String(l.min_tenure_months), active: l.active,
});

/** Pengaturan jalur karier (level, ekspektasi, syarat kesiapan naik level). Hanya HR dan Super Admin. */
export default function CareerLevels() {
  const { data, error, loading, reload } = useLoad(() => api.get<Level[]>('/career/levels'));
  const [edit, setEdit] = useState<any>(null);
  const { busy, error: err, run, setError } = useAction();
  const confirm = useConfirm();
  const open = (v) => { setError(null); setEdit(v); };

  const levels = data ?? [];
  const active = levels.filter((l) => l.active);
  // dua level aktif dengan seniority sama: yang urutannya lebih awal dipakai sebagai "level saat ini"
  const dupSeniority = SENIORITIES.filter((s) => active.filter((l) => l.seniority === s).length > 1);

  const lines = edit ? String(edit.expectations).split('\n').map((x) => x.trim()).filter(Boolean) : [];
  const score = edit?.min_avg_score === '' ? null : Number(edit?.min_avg_score);
  const tenure = edit?.min_tenure_months === '' ? null : Number(edit?.min_tenure_months);
  const sortN = edit?.sort === '' ? 0 : Number(edit?.sort);
  const problems: string[] = [];
  if (edit) {
    if (!edit.id && !/^[a-z0-9_]{2,40}$/.test(edit.code)) problems.push('Kode 2–40 karakter: huruf kecil, angka, dan _');
    if (edit.name.trim().length < 2) problems.push('Nama minimal 2 karakter');
    if (score != null && !(score >= 0 && score <= 5)) problems.push('Skor minimal harus 0–5');
    if (tenure != null && !(Number.isInteger(tenure) && tenure >= 0 && tenure <= 600)) problems.push('Masa kerja harus bilangan bulat 0–600 bulan');
    if (!(Number.isInteger(sortN) && sortN >= 0 && sortN <= 1000)) problems.push('Urutan harus bilangan bulat 0–1000');
    if (lines.length > 20) problems.push('Maksimal 20 butir ekspektasi');
    if (lines.some((x) => x.length > 300)) problems.push('Tiap butir ekspektasi maksimal 300 karakter');
  }

  const save = (e) => {
    e.preventDefault();
    run(async () => {
      const body: any = {
        name: edit.name.trim(), seniority: edit.seniority || null, sort: sortN, description: edit.description.trim() || null,
        expectations: lines, min_avg_score: score, min_tenure_months: tenure, active: edit.active,
      };
      if (edit.id) await api.patch(`/career/levels/${edit.id}`, body);
      else await api.post('/career/levels', { ...body, code: edit.code });
      toast.success(edit.id ? `Level "${body.name}" diperbarui` : `Level "${body.name}" ditambahkan`);
      setEdit(null); reload();
    });
  };

  const toggle = async (l: Level) => {
    if (l.active && !(await confirm({
      title: 'Nonaktifkan level?', tone: 'warning', confirmText: 'Nonaktifkan',
      description: `"${l.name}" tidak lagi tampil di jalur karier. Karyawan dengan seniority ${l.seniority ?? 'terkait'} tidak akan punya level saat ini sampai ada level aktif yang cocok.`,
    }))) return;
    run(async () => { await api.patch(`/career/levels/${l.id}`, { active: !l.active }); toast.success(`${l.name} ${l.active ? 'dinonaktifkan' : 'diaktifkan'}`); reload(); });
  };

  return (
    <Page eyebrow="Administrasi" title="Jalur karier" actions={<Button onClick={() => open({ ...blank, sort: String((levels.at(-1)?.sort ?? 0) + 1) })}><Plus />Level</Button>}>
      <div role="status" className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[13px] text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
        <Info className="mt-0.5 size-4 shrink-0" />
        <div>
          Level ditampilkan menurut urutan. <b>Level saat ini</b> karyawan ditentukan dari seniority-nya; <b>kesiapan naik level</b> dihitung dari syarat milik level berikutnya
          (rata-rata maksimal 3 skor akhir terbaru yang terlihat, dan masa kerja sejak tanggal bergabung). Kesiapan hanya indikator; kenaikan seniority tetap diputuskan dan diubah manual.
          Perubahan langsung berlaku dan tercatat di audit log.
        </div>
      </div>
      {dupSeniority.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>Ada lebih dari satu level aktif dengan seniority <b>{dupSeniority.join(', ')}</b>. Hanya yang urutannya paling awal dipakai sebagai level saat ini.</div>
        </div>
      )}
      <ErrorBox error={err && !edit ? err : null} />
      <Loading loading={loading && !data} error={error}>
        <div className="space-y-3">
          {levels.map((l, k) => (
            <div key={l.id} className={cn('rounded-2xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md', !l.active && 'opacity-60')}>
              <div className="flex flex-wrap items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary">{k + 1}</span>
                <div className="min-w-0 flex-1 basis-72">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-[15px] font-extrabold tracking-tight">{l.name}</h3>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">{l.code}</span>
                    {l.seniority ? <Badge tone="blue">{l.seniority}</Badge> : <Badge>tanpa seniority</Badge>}
                    {!l.active && <Badge>inactive</Badge>}
                  </div>
                  {l.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{l.description}</p>}
                  {l.expectations.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-muted-foreground">{l.expectations.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  <div className="text-center"><div className="text-xl font-extrabold leading-none">{l.min_avg_score ?? '—'}</div><div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">skor min</div></div>
                  <div className="text-center"><div className="text-xl font-extrabold leading-none">{l.min_tenure_months ?? '—'}</div><div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">bulan min</div></div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => open(editOf(l))}><Pencil />Ubah</Button>
                  <Button variant="ghost" size="icon" className="size-8" disabled={busy} aria-label={l.active ? 'Nonaktifkan' : 'Aktifkan'} title={l.active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggle(l)}><Power /></Button>
                </div>
              </div>
            </div>
          ))}
          {levels.length === 0 && <Card><p className="py-6 text-center text-muted-foreground">Belum ada level. Tambahkan level pertama.</p></Card>}
        </div>
      </Loading>

      {edit && (
        <Drawer title={edit.id ? `Ubah level — ${edit.name}` : 'Level baru'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            {!edit.id && <Field label="Kode" hint="Huruf kecil, angka, dan _. Tidak dapat diubah setelah dibuat."><Input value={edit.code} pattern="[a-z0-9_]+" minLength={2} maxLength={40} onChange={(e) => setEdit({ ...edit, code: e.target.value })} required /></Field>}
            <Field label="Nama level"><Input value={edit.name} maxLength={100} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Seniority" hint="Karyawan dengan seniority ini berada di level ini. Kosongkan untuk level tanpa pemetaan otomatis (mis. Lead).">
                <FormSelect value={edit.seniority} onChange={(e) => setEdit({ ...edit, seniority: e.target.value })}>
                  <option value="">— tanpa seniority —</option>
                  {SENIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </FormSelect>
              </Field>
              <Field label="Urutan" hint="Angka kecil tampil lebih dulu. Level berikutnya = urutan setelahnya."><Input type="number" min="0" max="1000" step="1" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: e.target.value })} /></Field>
            </div>
            <Field label="Deskripsi"><Input value={edit.description} maxLength={1000} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Ekspektasi" hint="Satu butir per baris (maksimal 20, tiap butir maksimal 300 karakter)."><Textarea className="min-h-28" value={edit.expectations} onChange={(e) => setEdit({ ...edit, expectations: e.target.value })} /></Field>

            <div className="mb-3 rounded-2xl border p-4">
              <h3 className="m-0 text-[14px] font-bold">Syarat untuk mencapai level ini</h3>
              <p className={cn('mb-3 mt-0.5', MUTED)}>Dipakai pada kesiapan karyawan yang berada satu level di bawahnya. Kosongkan bila tidak ada syarat.</p>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Rata-rata skor akhir minimal (0–5)"><Input type="number" min="0" max="5" step="0.1" value={edit.min_avg_score} onChange={(e) => setEdit({ ...edit, min_avg_score: e.target.value })} placeholder="tanpa syarat" /></Field>
                <Field label="Masa kerja minimal (bulan)"><Input type="number" min="0" max="600" step="1" value={edit.min_tenure_months} onChange={(e) => setEdit({ ...edit, min_tenure_months: e.target.value })} placeholder="tanpa syarat" /></Field>
              </div>
            </div>

            <label className="mb-3 flex items-center gap-2 text-[13px]"><Checkbox checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v === true })} />Level aktif</label>

            {problems.length > 0 && <ul className="mb-3 list-disc space-y-0.5 pl-5 text-xs font-semibold text-amber-700 dark:text-amber-300">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
            <ErrorBox error={err} />
            <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-card px-4 py-3">
              <Button type="button" variant="outline" onClick={() => setEdit(null)}>Batal</Button>
              <Button disabled={busy || problems.length > 0}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
            </div>
          </form>
        </Drawer>
      )}
    </Page>
  );
}
