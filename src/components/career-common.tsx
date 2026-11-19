import { useState } from 'react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../api.ts';
import { Badge, ErrorBox, Field, Modal, useAction, useLoad } from '../ui.tsx';

export const KIND_LABEL = { training: 'Training', course: 'Kursus', workshop: 'Workshop', mentoring: 'Mentoring', reading: 'Bacaan', project: 'Proyek' };
export const KIND_TONE = { training: 'blue', course: 'green', workshop: 'amber', mentoring: 'blue', reading: 'gray', project: 'amber' };
export const SENIORITY_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };
export const TRAIN_STATUS = { planned: ['Direncanakan', 'gray'], in_progress: ['Berjalan', 'blue'], completed: ['Selesai', 'green'], cancelled: ['Dibatalkan', 'gray'] };
export const MENTOR_STATUS = { active: ['Aktif', 'green'], completed: ['Selesai', 'gray'], cancelled: ['Dibatalkan', 'gray'] };

export const KindBadge = ({ kind }: { kind?: any }) => <Badge tone={KIND_TONE[kind] ?? 'gray'}>{KIND_LABEL[kind] ?? kind}</Badge>;

/** Skor (0-5) dengan penanda target; hijau bila mencapai target, kuning/merah bila di bawah. */
export function ScoreBar({ score, target, className = '' }: { score?: any; target?: any; className?: string }) {
  const gap = target != null ? target - score : 0;
  const color = gap <= 0 ? 'bg-emerald-500' : gap >= 1 ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div className={`relative h-2.5 w-full rounded-full bg-muted ${className}`} role="img" aria-label={`Skor ${score} dari 5${target != null ? `, target ${target}` : ''}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, (score / 5) * 100))}%` }} />
      {target != null && <span className="absolute -top-1 h-[18px] w-0.5 rounded bg-foreground" style={{ left: `calc(${Math.min(100, (target / 5) * 100)}% - 1px)` }} title={`Target ${target}`} />}
    </div>
  );
}

export const GapBadge = ({ gap }: { gap?: any }) => (gap > 0 ? <Badge tone={gap >= 1 ? 'red' : 'amber'}>Gap {gap.toLocaleString('id-ID')}</Badge> : <Badge tone="green">Tercapai</Badge>);

/** Dialog tugaskan training. Bila employeeId kosong, tampilkan pemilih karyawan. */
export function AssignTrainingModal({ training, employeeId, onClose, onDone }: { training?: any; employeeId?: any; onClose?: any; onDone?: any }) {
  const [emp, setEmp] = useState(employeeId ? String(employeeId) : '');
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const { busy, error, run } = useAction();
  const emps = useLoad(() => (employeeId ? Promise.resolve(null) : api.get('/employees?status=active&size=100')), [employeeId]);
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post(`/employees/${emp}/trainings`, { training_id: training.id, due_date: due || null, notes: notes || null });
      toast.success('Training ditugaskan');
      onDone?.();
      onClose();
    });
  };
  return (
    <Modal title={`Tugaskan: ${training.title}`} onClose={onClose}>
      <form onSubmit={submit}>
        {!employeeId && (
          <Field label="Karyawan">
            <FormSelect value={emp} onChange={(e) => setEmp(e.target.value)} required>
              <option value="">Pilih karyawan…</option>
              {(emps.data?.rows ?? []).map((x) => <option key={x.id} value={x.id}>{x.name} — {x.seniority}</option>)}
            </FormSelect>
          </Field>
        )}
        <Field label="Tenggat (opsional)"><DatePicker value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <Field label="Catatan (opsional)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} /></Field>
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <Button disabled={busy || !emp}>Tugaskan</Button>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </form>
    </Modal>
  );
}
