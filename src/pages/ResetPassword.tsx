import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/AuthShell';
import { api } from '../api.ts';
import { ErrorBox, useAction } from '../ui.tsx';

function validate(pw, confirm) {
  if (pw.length < 10) return 'Password minimal 10 karakter';
  if (!/[a-zA-Z]/.test(pw)) return 'Password harus memuat huruf';
  if (!/\d/.test(pw)) return 'Password harus memuat angka';
  if (pw !== confirm) return 'Konfirmasi password tidak sama';
  return null;
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [localError, setLocalError] = useState<any>(null);
  const { busy, error, run } = useAction();

  const submit = (e) => {
    e.preventDefault();
    const msg = validate(password, confirm);
    setLocalError(msg ? new Error(msg) : null);
    if (msg) return;
    run(async () => { await api.post('/auth/reset-password', { token, password }); setDone(true); });
  };

  if (!token) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <span className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"><TriangleAlert className="size-6" /></span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Tautan tidak valid</h2>
            <p className="mt-1 text-muted-foreground">Tautan tidak valid atau sudah kedaluwarsa. Minta tautan reset yang baru.</p>
          </div>
          <Button asChild className="h-11 w-full"><Link to="/forgot-password">Minta tautan baru</Link></Button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="size-6" /></span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Password berhasil diubah</h2>
            <p className="mt-1 text-muted-foreground">Semua sesi lama telah keluar. Silakan masuk dengan password baru Anda.</p>
          </div>
          <Button asChild className="h-11 w-full shadow-md shadow-blue-600/25"><a href="/">Masuk<ArrowRight /></a></Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-extrabold tracking-tight">Buat password baru</h2>
      <p className="mb-6 mt-1 text-muted-foreground">Minimal 10 karakter dan memuat huruf serta angka.</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Password baru</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-11 px-9" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required autoFocus placeholder="••••••••••" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Konfirmasi password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-11 pl-9" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required placeholder="••••••••••" />
          </div>
        </label>
        <ErrorBox error={localError || error} className="my-0" />
        <Button className="h-11 w-full text-[15px] shadow-md shadow-blue-600/25" disabled={busy}>
          {busy ? <><Loader2 className="animate-spin" />Menyimpan…</> : 'Simpan password baru'}
        </Button>
        <Button asChild variant="ghost" className="h-10 w-full text-muted-foreground"><Link to="/">Kembali ke halaman masuk</Link></Button>
      </form>
    </AuthShell>
  );
}
