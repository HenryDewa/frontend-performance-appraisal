import { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { PersonAvatar } from '@/components/employee-ui.tsx';
import { api } from '../api.ts';
import { Badge, Card, ErrorBox, Field, Loading, Modal, fmtDate, useAction, useLoad } from '../ui.tsx';
import { todayWib } from '../lib/time.ts';
import { MENTOR_STATUS, SENIORITY_LABEL } from './career-common.tsx';

const RANK = { junior: 1, middle: 2, senior: 3 };

function AddMentorModal({ employee, onClose, onDone }: { employee?: any; onClose?: any; onDone?: any }) {
  const emps = useLoad(() => api.get('/employees?status=active&size=100'));
  const [mentor, setMentor] = useState('');
  const [focus, setFocus] = useState('');
  const [start, setStart] = useState(todayWib());
  const [end, setEnd] = useState('');
  const { busy, error, run } = useAction();
  const options = (emps.data?.rows ?? []).filter((x) => x.id !== employee.id && RANK[x.seniority] > RANK[employee.seniority]);
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post('/mentorships', { mentor_employee_id: Number(mentor), mentee_employee_id: employee.id, focus: focus || null, start_date: start, end_date: end || null });
      toast.success('Mentoring ditambahkan');
      onDone();
      onClose();
    });
  };
  return (
    <Modal title={`Tambah mentor untuk ${employee.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Mentor" hint="Hanya karyawan yang lebih senior dari mentee.">
          <FormSelect value={mentor} onChange={(e) => setMentor(e.target.value)} required>
            <option value="">Pilih mentor…</option>
            {options.map((x) => <option key={x.id} value={x.id}>{x.name} — {SENIORITY_LABEL[x.seniority]}</option>)}
          </FormSelect>
        </Field>
        <Field label="Fokus"><Input value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={300} placeholder="mis. code review, arsitektur" /></Field>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Mulai"><DatePicker value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
          <Field label="Selesai (opsional)"><DatePicker value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <Button disabled={busy || !mentor}>Simpan</Button>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Mentoring seorang karyawan (sebagai mentor maupun mentee). */
export default function MentoringCard({ employee, canManage, rev = 0, onChange }: { employee?: any; canManage?: any; rev?: number; onChange?: any }) {
  const list = useLoad(() => api.get(`/mentorships?employee_id=${employee.id}`), [employee.id, rev]);
  const [adding, setAdding] = useState(false);
  const { busy, run } = useAction();
  const setStatus = (m, status) => run(async () => {
    try {
      await api.patch(`/mentorships/${m.id}`, { status, ...(status === 'completed' ? { end_date: todayWib() } : {}) });
      toast.success('Mentoring diperbarui');
      list.reload();
      onChange?.();
    } catch (e) { toast.error(e.message); }
  });
  const rows = list.data ?? [];
  return (
    <Card title="Mentoring" className="rounded-2xl" actions={canManage && employee.seniority !== 'senior' && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><UserPlus className="size-3.5" /> Tambah mentor</Button>}>
      <Loading loading={list.loading} error={list.error}>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada program mentoring.</p> : (
          <ul className="space-y-3">
            {rows.map((m) => {
              const asMentor = m.mentor_employee_id === employee.id;
              const [label, tone] = MENTOR_STATUS[m.status] ?? [m.status, 'gray'];
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <PersonAvatar name={asMentor ? m.mentee_name : m.mentor_name} className="size-10" />
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={asMentor ? 'blue' : 'amber'}>{asMentor ? 'Sebagai mentor' : 'Sebagai mentee'}</Badge>
                      <span className="font-semibold">{asMentor ? m.mentee_name : m.mentor_name}</span>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{[m.focus, `${fmtDate(m.start_date)} – ${m.end_date ? fmtDate(m.end_date) : 'berjalan'}`].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  {canManage && m.status === 'active' && (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => setStatus(m, 'completed')}>Selesaikan</Button>
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => setStatus(m, 'cancelled')}>Batalkan</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Loading>
      {adding && <AddMentorModal employee={employee} onClose={() => setAdding(false)} onDone={() => { list.reload(); onChange?.(); }} />}
    </Card>
  );
}
