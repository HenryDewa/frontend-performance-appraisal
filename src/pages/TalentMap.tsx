import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Award, CheckCircle2, Layers, RotateCcw, Search, Sparkles, UserCheck, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginationBar } from '@/components/Pagination.tsx';
import { LEVEL, LevelDots, SKILL_LEVELS } from '@/components/ProfileSkills.tsx';
import { TagInput } from '@/components/TagInput.tsx';
import { PersonAvatar, SeniorityBadge } from '@/components/employee-ui.tsx';
import { api, qs } from '../api.ts';
import { useDebounced } from '../lib/useDebounced.ts';
import { useSkillSuggestions } from '../lib/useSkillSuggestions.ts';
import type { Department, Paged } from '../types.ts';
import { Badge, Card, Loading, Page, fmtDate, useLoad } from '../ui.tsx';

const HEAD = 'text-xs uppercase tracking-wide text-muted-foreground';

interface Scope { department: string; seniority: string; status: string }
const DEFAULT_SCOPE: Scope = { department: '', seniority: '', status: 'active' };

function ScopeFilters({ scope, onChange, departments }: { scope: Scope; onChange: (s: Scope) => void; departments: Department[] }) {
  const set = (k: keyof Scope) => (e) => onChange({ ...scope, [k]: e.target.value });
  return (
    <>
      <FormSelect className="w-auto min-w-40" value={scope.department} onChange={set('department')} aria-label="Departemen">
        <option value="">Semua departemen</option>
        {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
      </FormSelect>
      <FormSelect className="w-auto min-w-36" value={scope.seniority} onChange={set('seniority')} aria-label="Seniority">
        <option value="">Semua seniority</option>
        <option value="junior">Junior</option><option value="middle">Middle</option><option value="senior">Senior</option>
      </FormSelect>
      <FormSelect className="w-auto min-w-36" value={scope.status} onChange={set('status')} aria-label="Status karyawan">
        <option value="active">Karyawan aktif</option><option value="inactive">Nonaktif</option><option value="all">Semua status</option>
      </FormSelect>
    </>
  );
}

const Bar3 = ({ dasar, praktisi, mahir }: { dasar: number; praktisi: number; mahir: number }) => {
  const total = Math.max(1, dasar + praktisi + mahir);
  return (
    <div className="flex h-2 w-40 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Dasar ${dasar}, Praktisi ${praktisi}, Mahir ${mahir}`}>
      <div className="bg-sky-500" style={{ width: `${(dasar / total) * 100}%` }} />
      <div className="bg-amber-500" style={{ width: `${(praktisi / total) * 100}%` }} />
      <div className="bg-emerald-500" style={{ width: `${(mahir / total) * 100}%` }} />
    </div>
  );
};

// ---------------------------------------------------------------- Cari talent
interface SearchState { skills: string; mode: string; minLevel: string; available: string; need: string }

function TalentSearch({ scope, state, setState }: { scope: Scope; state: SearchState; setState: (s: SearchState) => void }) {
  const suggestions = useSkillSuggestions();
  const [page, setPage] = useState(1);
  const skillsParam = state.skills.split(',').map((s) => s.trim()).filter(Boolean).join(',');
  useEffect(() => { setPage(1); }, [scope.department, scope.seniority, scope.status, skillsParam, state.mode, state.minLevel, state.available]);
  const { data, error, loading } = useLoad(
    () => api.get<Paged<any>>('/talent/search' + qs({ ...scope, skills: skillsParam, mode: state.mode, min_level: state.minLevel, available: state.available, page, size: 15 })),
    [JSON.stringify(scope), skillsParam, state.mode, state.minLevel, state.available, page],
  );
  const set = (k: keyof SearchState) => (e) => setState({ ...state, [k]: e.target.value });
  const need = Number(state.need);
  const total = data?.total ?? 0;
  const hasSkills = skillsParam.length > 0;
  const hasCriteria = hasSkills || !!state.minLevel || !!state.available || !!state.need || state.mode !== 'all';

  return (
    <div className="space-y-4">
      <Card title="Kriteria kebutuhan" actions={hasCriteria && <Button type="button" variant="ghost" size="sm" onClick={() => setState({ ...state, skills: '', mode: 'all', minLevel: '', available: '', need: '' })}><RotateCcw className="size-3.5" />Atur ulang</Button>}>
        <div className="grid gap-5">
          <div className="grid gap-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />Skill yang dibutuhkan</div>
              <p className="text-xs text-muted-foreground">Ketik atau pilih satu per satu. Kosongkan untuk melihat semua karyawan.</p>
            </div>
            <TagInput value={state.skills} onChange={(v) => setState({ ...state, skills: v })} suggestions={suggestions} placeholder="Cari atau ketik skill, mis. React" aria-label="Skill yang dibutuhkan" />
          </div>

          <div className="grid gap-x-6 gap-y-4 border-t pt-4 md:grid-cols-2">
            <Segmented
              icon={<Layers className="size-3.5" />} label="Cocokkan" value={state.mode} onChange={(v) => setState({ ...state, mode: v })}
              options={[{ value: 'all', label: 'Semua skill', hint: 'Harus punya semua skill' }, { value: 'any', label: 'Salah satu', hint: 'Cukup punya salah satu skill' }]}
            />
            <Segmented
              icon={<Award className="size-3.5" />} label="Pemahaman minimal" value={state.minLevel} onChange={(v) => setState({ ...state, minLevel: v })}
              options={[{ value: '', label: 'Semua' }, ...SKILL_LEVELS.map((l) => ({ value: l.value, label: l.label, hint: `${l.label} ke atas`, dots: l.value }))]}
            />
            <Segmented
              icon={<UserCheck className="size-3.5" />} label="Ketersediaan" value={state.available} onChange={(v) => setState({ ...state, available: v })}
              options={[{ value: '', label: 'Semua' }, { value: '1', label: 'Tersedia', hint: 'Belum punya project aktif' }, { value: '0', label: 'Sibuk', hint: 'Sudah punya project aktif' }]}
            />
            <div className="grid min-w-0 content-start gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><UsersRound className="size-3.5" />Jumlah orang dibutuhkan</span>
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="outline" size="icon" className="size-9" disabled={!need} aria-label="Kurangi" onClick={() => setState({ ...state, need: need > 1 ? String(need - 1) : '' })}>−</Button>
                <Input type="number" min={1} max={999} className="text-center" value={state.need} onChange={set('need')} placeholder="Opsional" aria-label="Jumlah orang dibutuhkan" />
                <Button type="button" variant="outline" size="icon" className="size-9" aria-label="Tambah" onClick={() => setState({ ...state, need: String(Math.min(999, need + 1)) })}>+</Button>
              </div>
              <span className="text-[11px] text-muted-foreground">Untuk melihat kebutuhan terpenuhi atau kurang.</span>
            </div>
          </div>
        </div>
      </Card>

      {data && need > 0 && (
        <div className={cn('flex items-start gap-3 rounded-2xl border p-4 text-sm', total >= need ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200')}>
          {total >= need ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
          <div>
            <b>{total >= need ? 'Kebutuhan terpenuhi' : `Kurang ${need - total} orang`}</b>
            <div>Dibutuhkan {need} orang, yang cocok {total} orang{state.available === '' ? '' : state.available === '1' ? ' (belum punya project aktif)' : ' (sudah punya project aktif)'}.</div>
          </div>
        </div>
      )}

      <Loading loading={loading && !data} error={error}>
        {data && (
          <Card title={`${total} karyawan cocok`} actions={<UsersRound className="size-4 text-muted-foreground" />}>
            {data.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{hasSkills ? 'Tidak ada karyawan yang memenuhi kriteria ini. Coba longgarkan pemahaman minimal atau pilih "salah satu skill".' : 'Tidak ada karyawan pada filter ini.'}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={HEAD}>Karyawan</TableHead>
                    <TableHead className={HEAD}>Seniority</TableHead>
                    <TableHead className={HEAD}>Skill</TableHead>
                    <TableHead className={HEAD}>Project aktif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <PersonAvatar name={r.name} />
                          <div className="min-w-0 leading-tight">
                            <Link to={`/employees/${r.id}`} className="block truncate font-semibold hover:text-primary hover:underline">{r.name}</Link>
                            <span className="block truncate text-xs text-muted-foreground">{r.code} · {r.position} · {r.department}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><SeniorityBadge value={r.seniority} /></TableCell>
                      <TableCell className="max-w-md whitespace-normal">
                        {r.skills.length === 0 ? <span className="text-xs text-muted-foreground">Belum mengisi skill</span> : (
                          <div className="flex flex-wrap gap-1.5">
                            {r.skills.map((s) => (
                              <span key={s.skill} title={`${s.skill}: ${LEVEL[s.level]?.label}`}
                                className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs', s.matched ? 'border-primary/40 bg-primary/10 font-semibold text-foreground' : 'bg-muted/30 text-muted-foreground')}>
                                <LevelDots level={s.level} />{s.skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-48 whitespace-normal">
                        {r.projects.length ? <span className="text-xs">{r.projects.join(', ')}</span> : <Badge tone="green">Tersedia</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <PaginationBar page={data.page} size={data.size} total={data.total} onPage={setPage} unit="karyawan" />
          </Card>
        )}
      </Loading>
    </div>
  );
}

interface SegOption { value: string; label: string; hint?: string; dots?: string }
/** Pilihan tunggal berupa deretan tombol, lebih cepat dipindai daripada dropdown untuk 2-4 opsi. */
function Segmented({ icon, label, value, onChange, options }: { icon?: React.ReactNode; label: string; value: string; onChange: (v: string) => void; options: SegOption[] }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-xl border bg-muted/30 p-0.5">
        {options.map((o) => (
          <button
            key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.hint ?? o.label} onClick={() => onChange(o.value)}
            className={cn('flex min-h-8 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-2 text-xs font-medium transition-colors', value === o.value ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')}
          >
            {o.dots && <LevelDots level={o.dots} />}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Peta skill
function SkillMap({ scope, onPick }: { scope: Scope; onPick: (skill: string) => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const { data, error, loading } = useLoad(() => api.get<any>('/talent/skills/summary' + qs({ ...scope, q: dq })), [JSON.stringify(scope), dq]);
  const pct = data?.employees ? Math.round((data.with_skills / data.employees) * 100) : 0;
  return (
    <div className="space-y-4">
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-xs font-medium text-muted-foreground">Karyawan dalam cakupan</div><div className="text-3xl font-extrabold">{data.employees}</div></div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-xs font-medium text-muted-foreground">Sudah mengisi skill</div><div className="text-3xl font-extrabold">{data.with_skills} <span className="text-base font-semibold text-muted-foreground">({pct}%)</span></div></div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-xs font-medium text-muted-foreground">Jenis skill tercatat</div><div className="text-3xl font-extrabold">{data.skills.length}</div></div>
        </div>
      )}
      <Card
        title="Sebaran pemahaman per skill"
        actions={(
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari skill…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari skill" />
          </div>
        )}
      >
        <Loading loading={loading && !data} error={error}>
          {data && (data.skills.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{dq ? 'Tidak ada skill yang cocok.' : 'Belum ada skill yang dicatat pada cakupan ini.'}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>Skill</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Dasar</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Praktisi</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Mahir</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Total</TableHead>
                  <TableHead className={`${HEAD} text-right`} title="Pemilik skill yang belum punya project aktif">Tersedia</TableHead>
                  <TableHead className={HEAD}>Sebaran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.skills.map((s) => (
                  <TableRow key={s.skill} className="cursor-pointer hover:bg-muted/50" onClick={() => onPick(s.skill)} title="Klik untuk melihat siapa saja yang memiliki skill ini">
                    <TableCell className="font-semibold">{s.skill}</TableCell>
                    <TableCell className="text-right">{s.dasar}</TableCell>
                    <TableCell className="text-right">{s.praktisi}</TableCell>
                    <TableCell className="text-right">{s.mahir}</TableCell>
                    <TableCell className="text-right font-bold">{s.total}</TableCell>
                    <TableCell className="text-right">{s.available}</TableCell>
                    <TableCell><Bar3 dasar={s.dasar} praktisi={s.praktisi} mahir={s.mahir} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
        </Loading>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-sky-500" />Dasar</span>
          <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-amber-500" />Praktisi</span>
          <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-emerald-500" />Mahir</span>
          <span>Klik baris untuk melihat daftar karyawannya.</span>
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Sertifikasi & training
function Certifications({ scope }: { scope: Scope }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const [kind, setKind] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [scope.department, scope.seniority, scope.status, dq, kind, from, to]);
  const { data, error, loading } = useLoad(
    () => api.get<Paged<any, { by_kind: Record<string, number>; employees: number }>>('/talent/certifications' + qs({ ...scope, q: dq, kind, from, to, page, size: 15 })),
    [JSON.stringify(scope), dq, kind, from, to, page],
  );
  const by = data?.summary?.by_kind ?? { sertifikasi: 0, training: 0 };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2.5 rounded-2xl border bg-card p-3 shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama atau keterangan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari sertifikasi atau training" />
        </div>
        <FormSelect className="w-auto min-w-40" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Jenis">
          <option value="">Semua jenis</option><option value="sertifikasi">Sertifikasi</option><option value="training">Training</option>
        </FormSelect>
        <label className="grid gap-1 text-xs font-medium">Dari tanggal<DatePicker value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" /></label>
        <label className="grid gap-1 text-xs font-medium">Sampai tanggal<DatePicker value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" /></label>
        {(q || kind || from || to) && <Button variant="ghost" size="sm" onClick={() => { setQ(''); setKind(''); setFrom(''); setTo(''); }}>Reset</Button>}
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-xs font-medium text-muted-foreground">Sertifikasi</div><div className="text-3xl font-extrabold">{by.sertifikasi}</div></div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-xs font-medium text-muted-foreground">Training</div><div className="text-3xl font-extrabold">{by.training}</div></div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-xs font-medium text-muted-foreground">Karyawan terkait</div><div className="text-3xl font-extrabold">{data.summary.employees}</div></div>
        </div>
      )}

      <Loading loading={loading && !data} error={error}>
        {data && (
          <Card title="Daftar sertifikasi & training" actions={<Award className="size-4 text-muted-foreground" />}>
            {data.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada data yang cocok dengan filter ini.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={HEAD}>Karyawan</TableHead>
                    <TableHead className={HEAD}>Jenis</TableHead>
                    <TableHead className={HEAD}>Nama</TableHead>
                    <TableHead className={HEAD}>Tanggal</TableHead>
                    <TableHead className={HEAD}>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link to={`/employees/${r.employee_id}`} className="block font-semibold hover:text-primary hover:underline">{r.name}</Link>
                        <span className="text-xs text-muted-foreground">{r.code} · {r.department}</span>
                      </TableCell>
                      <TableCell><Badge tone={r.kind === 'sertifikasi' ? 'amber' : 'blue'}>{r.kind === 'sertifikasi' ? 'Sertifikasi' : 'Training'}</Badge></TableCell>
                      <TableCell className="max-w-64 whitespace-normal font-medium">{r.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal text-muted-foreground">{r.notes ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <PaginationBar page={data.page} size={data.size} total={data.total} onPage={setPage} unit="data" />
          </Card>
        )}
      </Loading>
    </div>
  );
}

// ---------------------------------------------------------------- Halaman
export default function TalentMap() {
  const [tab, setTab] = useState('cari');
  const [scope, setScope] = useState<Scope>(DEFAULT_SCOPE);
  const [search, setSearch] = useState<SearchState>({ skills: '', mode: 'all', minLevel: '', available: '', need: '' });
  const departments = useLoad<Department[]>(() => api.get<Department[]>('/departments'));
  const deptList = useMemo(() => departments.data ?? [], [departments.data]);

  const pickSkill = (skill: string) => { setSearch({ ...search, skills: skill }); setTab('cari'); };

  return (
    <Page eyebrow="Organisasi" title="Pemetaan Skill & Resource">
      <p className="-mt-2 text-sm text-muted-foreground"><Sparkles className="mr-1 inline size-4" />Telusuri skill, sertifikasi, dan training karyawan untuk memetakan kebutuhan resource. Data berasal dari catatan yang diisi karyawan di profil masing-masing.</p>
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border bg-card p-3 shadow-sm" role="search" aria-label="Cakupan karyawan">
        <ScopeFilters scope={scope} onChange={setScope} departments={deptList} />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="cari"><Search className="size-4" />Cari talent</TabsTrigger>
          <TabsTrigger value="peta"><Sparkles className="size-4" />Peta skill</TabsTrigger>
          <TabsTrigger value="sertifikasi"><Award className="size-4" />Sertifikasi &amp; training</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'cari' && <TalentSearch scope={scope} state={search} setState={setSearch} />}
      {tab === 'peta' && <SkillMap scope={scope} onPick={pickSkill} />}
      {tab === 'sertifikasi' && <Certifications scope={scope} />}
    </Page>
  );
}
