import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, Send } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../api.ts';
import { ROLE_LABEL } from '../auth.tsx';
import { Card, ErrorBox, Loading, useAction, useLoad } from '../ui.tsx';

const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const when = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '');

/** Diskusi internal manajemen per evaluasi (HR, Engineering Manager, Super Admin). */
export function EvaluationDiscussion({ evaluationId }: { evaluationId?: any }) {
  const { data, error, loading, reload } = useLoad(() => api.get(`/evaluations/${evaluationId}/comments`), [evaluationId]);
  const [body, setBody] = useState('');
  const { busy, error: err, run } = useAction();

  const send = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    run(async () => { await api.post(`/evaluations/${evaluationId}/comments`, { body: body.trim() }); toast.success('Komentar terkirim'); setBody(''); reload(); });
  };

  return (
    <Card title={`Diskusi (${data?.length ?? 0})`} actions={<span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" />Internal manajemen</span>}>
      <Loading loading={loading && !data} error={error}>
        {(data ?? []).length === 0 && <p className="mb-3 text-sm text-muted-foreground">Belum ada diskusi. Gunakan untuk klarifikasi konteks penilaian sebelum approval — tidak terlihat oleh evaluator maupun karyawan.</p>}
        <ul className="mb-4 space-y-3">
          {(data ?? []).map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar className="size-8 shrink-0"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">{initials(c.user_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1 rounded-xl bg-muted/60 px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-x-2 text-xs"><b className="text-[13px]">{c.user_name}</b><span className="text-muted-foreground">{ROLE_LABEL[c.user_role]} · {when(c.created_at)}</span></div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px]">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Loading>
      <form onSubmit={send} className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tulis komentar…" maxLength={2000} aria-label="Komentar baru" />
        <ErrorBox error={err} className="my-0" />
        <div className="flex justify-end"><Button disabled={busy || !body.trim()}><Send />Kirim</Button></div>
      </form>
    </Card>
  );
}
