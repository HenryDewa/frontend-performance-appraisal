import { useState } from 'react';
import { ArrowRight, BarChart3, Eye, EyeOff, FileCheck2, Loader2, Lock, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../auth.tsx';
import { ErrorBox, useAction } from '../ui.tsx';

const FEATURES: [any, string, string][] = [
  [Users, 'Evaluasi multi-sumber', 'Tech Lead, PM, klien, self-assessment, dan metrik objektif.'],
  [BarChart3, 'Skor terbobot & adil', 'Rubrik per seniority dengan ambang klasifikasi terukur.'],
  [FileCheck2, 'Approval & tindak lanjut', 'Review berlapis, development plan, dan PIP terdokumentasi.'],
  [ShieldCheck, 'Audit trail lengkap', 'Setiap perubahan penting tercatat dan tidak dapat diubah.']
];

const PREVIEW = [
  ['Technical', 92],
  ['Delivery', 84],
  ['Code Quality', 88]
];

import { AppLogo } from '../components/AppLogo.tsx';

function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AppLogo className='size-10 shadow-blue-900/40' />
      <span className='leading-tight'>
        <b className='block text-[15px] font-bold'>FDP-CMS</b>
        <small className='text-xs opacity-70'>Performance &amp; Career</small>
      </span>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const { busy, error, run } = useAction();

  return (
    <div className='grid min-h-screen lg:grid-cols-[1.15fr_1fr]'>
      {/* ===== Hero ===== */}
      <section className='relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col'>
        <div className='pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-blue-500/30 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-32 right-0 size-[28rem] rounded-full bg-indigo-500/25 blur-3xl' />
        <div className='pointer-events-none absolute inset-0 opacity-[0.07]' style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

        <Logo className='relative' />

        <div className='relative my-auto max-w-xl py-10'>
          <span className='mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-200 backdrop-blur'>
            <Sparkles className='size-3.5' /> Performance &amp; Career Management
          </span>
          <h1 className='mb-4 text-[2.6rem] font-extrabold leading-[1.15] tracking-tight'>
            Analisa <span className='bg-gradient-to-r from-emerald-300 via-sky-300 to-blue-300 bg-clip-text text-transparent'>Performer</span> di tim Frontend Anda
          </h1>
          <p className='mb-8 max-w-md leading-relaxed text-sidebar-foreground'>Satu sumber data yang konsisten, transparan, dan dapat diaudit untuk menilai performa serta mengembangkan karier developer.</p>

          <div className='grid gap-4 sm:grid-cols-2'>
            {FEATURES.map(([Icon, title, desc]) => (
              <div key={title} className='flex gap-3'>
                <span className='grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-blue-200 ring-1 ring-white/10'>
                  <Icon className='size-[18px]' />
                </span>
                <div>
                  <b className='block text-sm font-semibold'>{title}</b>
                  <span className='text-[13px] leading-snug text-sidebar-foreground/80'>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* kartu pratinjau mengambang */}
        <div className='relative ml-auto w-72 -rotate-2 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md transition-transform duration-500 hover:rotate-0'>
          <div className='mb-3 flex items-center justify-between'>
            <div>
              <div className='text-xs text-sidebar-foreground/80'>Skor akhir</div>
              <div className='text-3xl font-extrabold'>86,5</div>
            </div>
            <span className='rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-300/30'>Top Performer</span>
          </div>
          <div className='space-y-2.5'>
            {PREVIEW.map(([label, v]) => (
              <div key={label}>
                <div className='mb-1 flex justify-between text-[11px] text-sidebar-foreground/80'>
                  <span>{label}</span>
                  <span>{v}</span>
                </div>
                <div className='h-1.5 overflow-hidden rounded-full bg-white/10'>
                  <div className='h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-300' style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Form ===== */}
      <section className='relative grid place-items-center bg-gradient-to-b from-background to-secondary p-6'>
        <div className='w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500'>
          <Logo className='mb-8 text-foreground lg:hidden' />

          <div className='rounded-2xl border bg-card p-7 shadow-xl shadow-slate-900/5 sm:p-8'>
            <h2 className='text-2xl font-extrabold tracking-tight'>Selamat datang 👋</h2>
            <p className='mb-6 mt-1 text-muted-foreground'>Masuk untuk mengelola dan melihat penilaian performa.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => login(email, password));
              }}
              className='space-y-4'
            >
              <label className='grid gap-1.5'>
                <span className='text-[13px] font-semibold'>Email</span>
                <div className='relative'>
                  <Mail className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input className='h-11 pl-9' type='email' value={email} onChange={(e) => setEmail(e.target.value)} autoComplete='username' required autoFocus placeholder='nama@perusahaan.com' />
                </div>
              </label>

              <label className='grid gap-1.5'>
                <span className='text-[13px] font-semibold'>Password</span>
                <div className='relative'>
                  <Lock className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input className='h-11 px-9' type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete='current-password' required placeholder='••••••••' />
                  <button type='button' onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} className='absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'>
                    {show ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                  </button>
                </div>
                <Link to='/forgot-password' className='justify-self-end text-xs font-semibold text-primary hover:underline'>
                  Lupa password?
                </Link>
              </label>

              <ErrorBox error={error} className='my-0' />

              <Button className='h-11 w-full text-[15px] shadow-md shadow-blue-600/25' disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className='animate-spin' />
                    Masuk…
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className='mt-6 text-center text-xs text-muted-foreground'>Klasifikasi performa adalah masukan untuk keputusan manajerial, bukan keputusan otomatis.</p>
        </div>
      </section>
    </div>
  );
}
