import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, FlaskConical, Loader2, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/AuthShell';
import { api } from '../api.ts';
import { ErrorBox, useAction } from '../ui.tsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<any>(null); // respons API setelah berhasil
  const [copied, setCopied] = useState(false);
  const { busy, error, run } = useAction();

  const submit = (e) => {
    e.preventDefault();
    run(async () => setSent(await api.post('/auth/forgot-password', { email: email.trim() })));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(sent.dev_link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard tidak tersedia */ }
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="space-y-4">
          <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><MailCheck className="size-6" /></span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Periksa email Anda</h2>
            <p className="mt-1 text-muted-foreground">Jika email terdaftar, tautan reset telah dikirim. Tautan berlaku 60 menit dan hanya bisa dipakai sekali.</p>
          </div>
          {sent.dev_link && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><FlaskConical className="size-3.5" />Mode pengembangan — SMTP belum diatur</div>
              <a href={sent.dev_link} className="block break-all text-xs underline underline-offset-2">{sent.dev_link}</a>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={copy}>
                {copied ? <><Check className="size-3.5" />Tersalin</> : <><Copy className="size-3.5" />Salin tautan</>}
              </Button>
            </div>
          )}
          <Button asChild variant="outline" className="h-11 w-full"><Link to="/"><ArrowLeft />Kembali ke halaman masuk</Link></Button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-extrabold tracking-tight">Lupa password?</h2>
          <p className="mb-6 mt-1 text-muted-foreground">Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru.</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-1.5">
              <span className="text-[13px] font-semibold">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-11 pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus placeholder="nama@demo.id" />
              </div>
            </label>
            <ErrorBox error={error} className="my-0" />
            <Button className="h-11 w-full text-[15px] shadow-md shadow-blue-600/25" disabled={busy}>
              {busy ? <><Loader2 className="animate-spin" />Mengirim…</> : 'Kirim tautan reset'}
            </Button>
            <Button asChild variant="ghost" className="h-10 w-full text-muted-foreground"><Link to="/"><ArrowLeft />Kembali ke halaman masuk</Link></Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
