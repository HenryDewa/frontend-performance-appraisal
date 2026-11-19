import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmProvider';
import { FileDown } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.ts';
import { useAuth, isHR, isReviewer } from '../auth.tsx';
import { Badge, Card, ErrorBox, Field, Loading, Modal, Page, SOURCE_LABEL, fmt, fmtDate, useAction, useLoad } from '../ui.tsx';
import { Button } from '@/components/ui/button';
import { CalibrationCard } from '@/components/CalibrationCard';
import { EvaluationDiscussion } from '@/components/EvaluationDiscussion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormSelect } from '@/components/ui/form-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROLE_SOURCE = { tech_lead: 'tech_lead', engineering_manager: 'tech_lead', project_manager: 'project_manager', client_evaluator: 'client', hr: 'metrics' };

const TH = 'text-xs uppercase tracking-wide text-muted-foreground';
const LBL = 'text-xs text-muted-foreground';
const WARN = 'mt-3 border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';

export default function EvaluationDetail() {
  const confirm = useConfirm();
  const { id } = useParams();
  const { user } = useAuth();
  const hr = isHR(user);
  const { data, error, loading, reload } = useLoad(() => api.get(`/evaluations/${id}`), [id]);
  const evaluators = useLoad(() => (hr ? api.get('/evaluators') : Promise.resolve([])));
  const projects = useLoad(() => (hr ? api.get('/projects') : Promise.resolve([])));
  const [modal, setModal] = useState<any>(null);
  const { busy, error: err, run, setError } = useAction();
  const open = (m) => { setError(null); setModal(m); };
  const close = () => setModal(null);
  // pesan sukses menurut aksi (segmen terakhir path)
  const DONE: Record<string, string> = {
    'start-review': 'Review dimulai', publish: 'Evaluasi dipublikasikan', close: 'Evaluasi ditutup', recalculate: 'Skor dihitung ulang',
    assessments: 'Evaluator ditambahkan', replace: 'Evaluator diganti', reopen: 'Penilaian dibuka kembali', approve: 'Evaluasi disetujui',
    return: 'Evaluasi dikembalikan untuk revisi', revise: 'Evaluasi dibuka untuk revisi',
  };
  const post = (path: string, body?: any, after?: any) => run(async () => { await api.post(path, body); toast.success(DONE[path.split('/').pop() ?? ''] ?? 'Berhasil disimpan'); close(); reload(); after?.(); });

  const ev = data?.evaluation;
  const res = ev?.result;
  const reviewer = isReviewer(user);
  const canAct = (...statuses) => statuses.includes(ev?.status);

  return (
    <Page
      title={data ? `${data.employee.name} — ${data.period.name}` : 'Evaluasi'}
      actions={data && (
        <>
          {reviewer && canAct('Submitted') && <Button variant="outline" disabled={busy} onClick={() => post(`/evaluations/${id}/start-review`)}>Mulai review</Button>}
          {reviewer && canAct('Submitted', 'Under Review') && <Button onClick={() => open({ type: 'approve', note: '' })}>Approve</Button>}
          {reviewer && canAct('Submitted', 'Under Review') && <Button variant="destructive" onClick={() => open({ type: 'return', reason: '', ids: data.assessments.filter((a) => a.active).map((a) => a.id) })}>Kembalikan</Button>}
          {(hr || reviewer) && canAct('Approved') && <Button disabled={busy} onClick={() => post(`/evaluations/${id}/publish`)}>Publikasikan</Button>}
          {hr && canAct('Published') && <Button variant="outline" disabled={busy} onClick={async () => (await confirm({ title: 'Tutup evaluasi?', tone: 'warning', confirmText: 'Tutup evaluasi', description: 'Evaluasi akan berstatus Closed dan tidak dapat diubah lagi.' })) && post(`/evaluations/${id}/close`)}>Tutup</Button>}
          {(hr || reviewer) && canAct('Approved', 'Published') && <Button variant="outline" onClick={() => open({ type: 'revise', reason: '', ids: data.assessments.filter((a) => a.active).map((a) => a.id) })}>Revisi</Button>}
          {hr && canAct('In Progress', 'Assigned', 'Needs Revision') && <Button variant="outline" disabled={busy} onClick={() => post(`/evaluations/${id}/recalculate`)}>Hitung ulang</Button>}
          {(hr || reviewer) && canAct('Approved', 'Published', 'Closed') && <Button variant="outline" disabled={busy} onClick={() => run(() => api.download(`/evaluations/${id}/report.pdf`, `hasil-evaluasi-${id}.pdf`))}><FileDown />Unduh PDF</Button>}
        </>
      )}
    >
      <ErrorBox error={err && !modal ? err : null} />
      <Loading loading={loading} error={error}>
        {data && (
          <>
            <Card>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><span className={LBL}>Status</span><div className="flex flex-wrap items-center gap-2"><Badge>{ev.status}</Badge> <span className={LBL}>v{ev.version}</span></div></div>
                <div className="space-y-1"><span className={LBL}>Karyawan</span><div><Link className="font-medium text-primary hover:underline" to={`/employees/${data.employee.id}`}>{data.employee.code}</Link> · {data.employee.seniority}</div></div>
                <div className="space-y-1"><span className={LBL}>Skor akhir</span><div className="text-xl font-bold">{fmt(ev.final_score)}</div></div>
                <div className="space-y-1"><span className={LBL}>Klasifikasi</span><div>{ev.classification ? <Badge>{ev.classification}</Badge> : '—'}</div>
                  {res?.thresholds && <div className={LBL}>Ambang standar {res.seniority || data.employee.seniority}: Middle ≥ {fmt(res.thresholds.middle)}, Top ≥ {fmt(res.thresholds.top)}</div>}
                </div>
                <div className="space-y-1"><span className={LBL}>Tenggat</span><div>{fmtDate(data.period.deadline)}</div></div>
              </div>
              {ev.calc_error && <Alert className={WARN}><AlertDescription className="text-amber-800 dark:text-amber-300">Skor belum dapat dihitung: {ev.calc_error}</AlertDescription></Alert>}
              {res?.redistributed && <Alert className={WARN}><AlertDescription className="text-amber-800 dark:text-amber-300">Bobot didistribusikan ulang (kebijakan: {res.policy}) karena sumber tidak tersedia: {res.missing_sources.map((s) => SOURCE_LABEL[s]).join(', ')}. Tinjau sebelum menyetujui.</AlertDescription></Alert>}
              <p className="mt-3 text-xs text-muted-foreground">Klasifikasi adalah masukan untuk keputusan manajerial, bukan keputusan otomatis.</p>
            </Card>

            {res && (
              <Card title="Rincian perhitungan">
                <Table>
                  <TableHeader><TableRow><TableHead className={TH}>Indikator</TableHead><TableHead className={TH}>Bobot</TableHead><TableHead className={TH}>Skor (1–5)</TableHead><TableHead className={TH}>Nilai berbobot</TableHead><TableHead className={TH}>Per sumber</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {res.indicators.map((i) => (
                      <Fragment key={i.code}>
                        <TableRow className="hover:bg-muted/50"><TableCell>{i.name}</TableCell><TableCell>{i.weight}%</TableCell><TableCell>{fmt(i.score)}</TableCell><TableCell>{fmt(i.weighted)}</TableCell>
                          <TableCell className="text-xs">{i.sources.map((s) => `${SOURCE_LABEL[s.source]}: ${fmt(s.score)}`).join(' · ')}{i.missing.length > 0 && <span className="text-amber-600 dark:text-amber-300"> · tidak ada: {i.missing.map((m) => SOURCE_LABEL[m]).join(', ')}</span>}</TableCell></TableRow>
                        {(i.subs ?? []).map((s) => (
                          <TableRow key={`${i.code}/${s.code}`} className="text-xs hover:bg-muted/50"><TableCell className="pl-7">↳ {s.name}</TableCell><TableCell></TableCell><TableCell>{fmt(s.score)}</TableCell><TableCell></TableCell><TableCell></TableCell></TableRow>
                        ))}
                      </Fragment>
                    ))}
                    <TableRow className="hover:bg-muted/50"><TableCell className="font-bold">Total</TableCell><TableCell>100%</TableCell><TableCell></TableCell><TableCell className="font-bold">{fmt(res.final_score)}</TableCell><TableCell></TableCell></TableRow>
                  </TableBody>
                </Table>
              </Card>
            )}

            <Card title="Evaluator & penilaian" actions={hr && !['Approved', 'Published', 'Closed'].includes(ev.status) && <Button variant="outline" size="sm" onClick={() => open({ type: 'assign', evaluator_user_id: '', project_id: '' })}>+ Evaluator</Button>}>
              <Table>
                <TableHeader><TableRow><TableHead className={TH}>Sumber</TableHead><TableHead className={TH}>Evaluator</TableHead><TableHead className={TH}>Project</TableHead><TableHead className={TH}>Status</TableHead><TableHead className={TH}>Dikirim</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.assessments.map((a) => (
                    <TableRow key={a.id} className={a.active ? 'hover:bg-muted/50' : 'opacity-55 hover:bg-muted/50'}>
                      <TableCell>{SOURCE_LABEL[a.source]}</TableCell><TableCell>{a.evaluator_name}</TableCell><TableCell>{a.project_name ?? '—'}</TableCell>
                      <TableCell><Badge>{a.status}</Badge>{!a.active && <div className="text-xs text-muted-foreground">diganti: {a.replaced_reason}</div>}</TableCell><TableCell>{fmtDate(a.submitted_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {hr && a.active && a.source !== 'self' && !['Approved', 'Published', 'Closed'].includes(ev.status) && <Button variant="outline" size="sm" onClick={() => open({ type: 'replace', id: a.id, evaluator_user_id: '', reason: '', source: a.source })}>Ganti</Button>}
                          {hr && a.active && a.status === 'submitted' && !['Approved', 'Published', 'Closed'].includes(ev.status) && <Button variant="outline" size="sm" onClick={() => open({ type: 'reopen', id: a.id, reason: '' })}>Buka kembali</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.assessments.filter((a) => a.active && a.scores.length > 0).map((a) => (
                <details key={a.id} className="mt-3 rounded-lg border px-3 py-2">
                  <summary className="cursor-pointer font-medium">{SOURCE_LABEL[a.source]} — {a.evaluator_name}: skor, komentar &amp; evidence</summary>
                  <Table className="mt-2">
                    <TableHeader><TableRow><TableHead className={TH}>Indikator / sub</TableHead><TableHead className={TH}>Skor (1–5)</TableHead><TableHead className={TH}>Komentar</TableHead><TableHead className={TH}>Evidence</TableHead></TableRow></TableHeader>
                    <TableBody>{(() => {
                      // urut & beri nama sesuai snapshot periode — bukan kode mentah
                      const inds = data.period.indicators ?? [];
                      const indOf = (code) => inds.find((i) => i.code === code);
                      const order = new Map();
                      inds.forEach((i, idx) => (i.subs ?? []).forEach((s, si) => order.set(`${i.code}/${s.code}`, idx * 100 + si)));
                      const sorted = [...a.scores].sort((x, y) => (order.get(`${x.indicator_code}/${x.sub_code ?? ''}`) ?? 9999) - (order.get(`${y.indicator_code}/${y.sub_code ?? ''}`) ?? 9999));
                      let prev = null;
                      return sorted.map((s) => {
                        const ind = indOf(s.indicator_code);
                        const sub = ind?.subs?.find((x) => x.code === s.sub_code);
                        const isSub = !!sub;
                        const firstOfGroup = s.indicator_code !== prev;
                        prev = s.indicator_code;
                        const evidence = firstOfGroup ? a.evidence.filter((x) => x.indicator_code === s.indicator_code) : [];
                        return (
                          <TableRow key={`${s.indicator_code}/${s.sub_code ?? ''}`} className="hover:bg-muted/50">
                            <TableCell>
                              {isSub ? (
                                <div className="pl-5 text-[13px]">↳ {sub.name}{firstOfGroup && <div className="text-xs text-muted-foreground">{ind?.name ?? s.indicator_code}</div>}</div>
                              ) : (ind?.name ?? s.indicator_code)}
                            </TableCell>
                            <TableCell className="font-medium">{s.score}/5</TableCell>
                            <TableCell className="whitespace-normal">{s.comment}{!s.shared && <span className="text-xs text-muted-foreground"> (tidak dibagikan)</span>}</TableCell>
                            <TableCell className="whitespace-normal text-xs">{evidence.map((x) => (
                              <div key={x.id}>[{x.category}] {x.url ? <a className="text-primary hover:underline" href={x.url} target="_blank" rel="noopener noreferrer">{x.url}</a> : null} {x.note}</div>
                            ))}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}</TableBody>
                  </Table>
                </details>
              ))}
            </Card>

            <CalibrationCard evaluationId={ev.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Riwayat proses">
                {data.events.map((e) => <div key={e.id} className="mb-1.5 text-[13px]"><b>{e.action}</b> · {e.actor_name ?? 'sistem'} · {fmtDate(e.at)} (v{e.version}){e.note && <div className="text-muted-foreground">“{e.note}”</div>}</div>)}
              </Card>
              <Card title="Versi sebelumnya">
                {data.history.length === 0 && <p className="text-muted-foreground">Belum ada revisi.</p>}
                {data.history.map((h) => <div key={h.id} className="mb-1.5 text-[13px]">v{h.version}: <b>{fmt(h.final_score)}</b> <Badge>{h.classification}</Badge> — {h.reason}</div>)}
              </Card>
            </div>

            <EvaluationDiscussion evaluationId={ev.id} />
            {(hr || reviewer) && ['Approved', 'Published', 'Closed'].includes(ev.status) && <p><Button asChild variant="outline"><Link to={`/dev-plans?employee_id=${data.employee.id}&evaluation_id=${ev.id}`}>Buat development plan / PIP</Link></Button></p>}
          </>
        )}
      </Loading>

      {modal?.type === 'assign' && (() => {
        const u = (evaluators.data ?? []).find((x) => x.id === Number(modal.evaluator_user_id));
        // Evaluator yang ternyata karyawan yang dinilai (mis. Tech Lead yang juga staff) -> self-assessment
        const source = u && u.employee_id && u.employee_id === data.employee.id ? 'self' : u && ROLE_SOURCE[u.role];
        const needProject = source === 'project_manager' || source === 'client';
        return (
          <Modal title="Tambah evaluator" onClose={close}>
            <form onSubmit={(e) => { e.preventDefault(); post(`/evaluations/${id}/assessments`, { evaluator_user_id: u.id, source, project_id: needProject ? Number(modal.project_id) : null }); }}>
              <Field label="Evaluator"><FormSelect value={modal.evaluator_user_id} onChange={(e) => setModal({ ...modal, evaluator_user_id: e.target.value })} required><option value="">Pilih…</option>{(evaluators.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.role})</option>)}</FormSelect></Field>
              {source && <p className="mb-3 text-xs text-muted-foreground">Sebagai: <b>{SOURCE_LABEL[source]}</b>{source === 'self' ? ' (evaluator adalah karyawan yang dinilai)' : ''}</p>}
              {needProject && <Field label="Project"><FormSelect value={modal.project_id} onChange={(e) => setModal({ ...modal, project_id: e.target.value })} required><option value="">Pilih…</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.client_name}</option>)}</FormSelect></Field>}
              <ErrorBox error={err} /><Button disabled={busy || !u}>Tetapkan</Button>
            </form>
          </Modal>
        );
      })()}
      {modal?.type === 'replace' && (
        <Modal title="Ganti evaluator" onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); post(`/assessments/${modal.id}/replace`, { evaluator_user_id: Number(modal.evaluator_user_id), reason: modal.reason }); }}>
            <Field label="Evaluator baru"><FormSelect value={modal.evaluator_user_id} onChange={(e) => setModal({ ...modal, evaluator_user_id: e.target.value })} required><option value="">Pilih…</option>{(evaluators.data ?? []).filter((x) => ROLE_SOURCE[x.role] === modal.source).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></Field>
            <Field label="Alasan"><Input value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} required minLength={3} /></Field>
            <ErrorBox error={err} /><Button disabled={busy}>Ganti</Button>
          </form>
        </Modal>
      )}
      {modal?.type === 'reopen' && (
        <Modal title="Buka kembali penilaian" onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); post(`/assessments/${modal.id}/reopen`, { reason: modal.reason }); }}>
            <Field label="Alasan"><Input value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} required minLength={3} /></Field>
            <ErrorBox error={err} /><Button disabled={busy}>Buka kembali</Button>
          </form>
        </Modal>
      )}
      {modal?.type === 'approve' && (
        <Modal title="Setujui hasil evaluasi" onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); post(`/evaluations/${id}/approve`, { note: modal.note || undefined }); }}>
            <Field label="Catatan review (opsional)"><Textarea value={modal.note} onChange={(e) => setModal({ ...modal, note: e.target.value })} /></Field>
            <ErrorBox error={err} /><Button disabled={busy}>Approve</Button>
          </form>
        </Modal>
      )}
      {(modal?.type === 'return' || modal?.type === 'revise') && (
        <Modal title={modal.type === 'return' ? 'Kembalikan untuk revisi' : 'Revisi setelah approval'} onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); post(`/evaluations/${id}/${modal.type}`, { reason: modal.reason, assessment_ids: modal.ids }); }}>
            <Field label="Alasan (wajib)"><Textarea value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} required minLength={3} /></Field>
            <p className="mb-2 text-[13px]"><b>Penilaian yang dibuka kembali:</b></p>
            {data.assessments.filter((a) => a.active).map((a) => (
              <label key={a.id} className="mb-1.5 flex flex-wrap items-center gap-2 text-[13px]"><Checkbox checked={modal.ids.includes(a.id)} onCheckedChange={() => setModal({ ...modal, ids: modal.ids.includes(a.id) ? modal.ids.filter((x) => x !== a.id) : [...modal.ids, a.id] })} />{SOURCE_LABEL[a.source]} — {a.evaluator_name}</label>
            ))}
            <ErrorBox error={err} /><Button disabled={busy || modal.ids.length === 0}>Kirim</Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
