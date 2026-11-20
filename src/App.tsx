import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  BarChart3, Briefcase, CalendarDays, ChevronDown, CircleHelp, GraduationCap, ClipboardList, LayoutDashboard, LogOut, Menu, Radar, Search, UserRound,
  Building2, ScanSearch, ShieldCheck, SlidersHorizontal, Star, Target, TrendingUp, UserCog, Users as UsersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { AccountSheet } from '@/components/AccountSheet';
import { CommandPalette } from '@/components/CommandPalette';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Tour } from '@/components/Tour';
import { useAuth, ROLE_LABEL } from './auth.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Employees, { EmployeeProfile } from './pages/Employees.tsx';
import Projects from './pages/Projects.tsx';
import Periods, { PeriodDetail } from './pages/Periods.tsx';
import EvaluationDetail from './pages/EvaluationDetail.tsx';
import Evaluations from './pages/Evaluations.tsx';
import { MyEvaluations, EvaluationForm } from './pages/MyEvaluations.tsx';
import DevPlans from './pages/DevPlans.tsx';
import Reports from './pages/Reports.tsx';
import { AppLogo } from './components/AppLogo.tsx';
import Config from './pages/Config.tsx';
import Users from './pages/Users.tsx';
import Departments from './pages/Departments.tsx';
import TalentMap from './pages/TalentMap.tsx';
import TeamProgress from './pages/TeamProgress.tsx';
import AuditLog from './pages/AuditLog.tsx';
import MyResults, { ResultView } from './pages/MyResults.tsx';
import Training from './pages/Training.tsx';
import PeriodWizard from './pages/PeriodWizard.tsx';
import CalibrationSession from './pages/CalibrationSession.tsx';
import Gaps from './pages/Gaps.tsx';
import CareerLevels from './pages/CareerLevels.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';

// [path, label, icon, roles, group]
const NAV = [
  ['/', 'Ringkasan Dashboard', LayoutDashboard, ['super_admin', 'hr', 'engineering_manager', 'employee', 'tech_lead', 'project_manager', 'client_evaluator'], 'Utama'],
  ['/evaluations', 'Penilaian Karyawan', ClipboardList, ['super_admin', 'hr', 'engineering_manager'], 'Evaluasi'],
  ['/periods', 'Periode Evaluasi', CalendarDays, ['super_admin', 'hr', 'engineering_manager'], 'Evaluasi'],
  ['/my-evaluations', 'My Evaluations', ClipboardList, ['super_admin', 'hr', 'engineering_manager', 'tech_lead', 'project_manager', 'client_evaluator', 'employee'], 'Evaluasi'],
  ['/team', 'Tim Saya', UsersIcon, ['tech_lead'], 'Evaluasi'],
  ['/results', 'Hasil Saya', Star, ['employee', 'staff'], 'Evaluasi'],
  ['/employees', 'Daftar Karyawan', UsersIcon, ['super_admin', 'hr', 'engineering_manager'], 'Organisasi'],
  ['/departments', 'Departemen', Building2, ['super_admin', 'hr'], 'Organisasi'],
  ['/talent', 'Pemetaan Skill', ScanSearch, ['super_admin', 'hr'], 'Organisasi'],
  ['/projects', 'Client & Project', Briefcase, ['super_admin', 'hr', 'engineering_manager'], 'Organisasi'],
  ['/my-profile', 'Profil & Karier Saya', UserRound, ['employee', 'staff'], 'Pengembangan'],
  ['/training', 'Katalog Training', GraduationCap, ['super_admin', 'hr', 'engineering_manager', 'employee', 'staff'], 'Pengembangan'],
  ['/gaps', 'Analisis Gap', Radar, ['super_admin', 'hr', 'engineering_manager'], 'Pengembangan'],
  ['/dev-plans', 'Rencana Pengembangan', Target, ['super_admin', 'hr', 'engineering_manager', 'employee', 'staff', 'tech_lead'], 'Pengembangan'],
  ['/reports', 'Laporan', BarChart3, ['super_admin', 'hr', 'engineering_manager'], 'Pengembangan'],
  ['/users', 'Pengguna', UserCog, ['super_admin'], 'Administrasi'],
  ['/config', 'Konfigurasi', SlidersHorizontal, ['super_admin'], 'Administrasi'],
  ['/career-levels', 'Jalur Karier', TrendingUp, ['super_admin', 'hr'], 'Administrasi'],
  ['/audit', 'Audit Log', ShieldCheck, ['super_admin'], 'Administrasi'],
];

// 'staff' = pengguna dengan profil karyawan (mis. Tech Lead yang juga dievaluasi): mendapat menu pribadi apa pun perannya
const canAccess = (user, roles) => roles.includes(user.role) || (roles.includes('staff') && !!user.employee_id);

// halaman hanya dapat dibuka oleh peran yang tercantum di NAV (backend tetap penjaga utama)
function Guard({ user, path, children }: { user?: any; path?: any; children?: React.ReactNode }) {
  const roles = NAV.find(([p]) => p === path)?.[3] ?? [];
  return canAccess(user, roles) ? children : <Navigate to="/" replace />;
}

const TOUR_STEPS = [
  { title: 'Selamat datang di FDP-CMS 👋', body: 'Tur singkat ini memperkenalkan bagian utama aplikasi. Gunakan tombol panah atau klik “Berikutnya”.' },
  { target: '[data-tour="sidebar"]', title: 'Menu utama', body: 'Menu dikelompokkan dan hanya menampilkan fitur sesuai peran Anda: evaluasi, organisasi, pengembangan, dan administrasi.' },
  { target: '[data-tour="tasks"]', title: 'Tugas saya hari ini', body: 'Antrean pekerjaan Anda — penilaian yang harus diisi, review, atau publikasi. Yang terlambat dan tenggat terdekat selalu di atas.' },
  { target: '[data-tour="search"]', title: 'Pencarian global', body: 'Tekan Ctrl+K (⌘K di Mac) dari halaman mana pun untuk berpindah menu atau mencari karyawan, evaluasi, dan periode.' },
  { target: '[data-tour="theme"]', title: 'Mode terang / gelap', body: 'Ganti tampilan sesuai kenyamanan mata. Pilihan Anda diingat di perangkat ini.' },
  { target: '[data-tour="user-menu"]', title: 'Akun & panduan', body: 'Ubah password, keluar, atau jalankan ulang panduan ini kapan saja dari menu akun.' },
];
const tourKey = (u) => `fdp_tour_done_${u.id}`;
const tourDone = (u) => { try { return localStorage.getItem(tourKey(u)) === '1'; } catch { return true; } };

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const todayLabel = () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 pb-6 pt-1">
      <AppLogo className="size-10 shadow-blue-500/30" />
      <span className="leading-tight">
        <b className="block text-[15px] font-extrabold tracking-tight text-white">FDP-CMS</b>
        <small className="text-xs text-sidebar-foreground/70">Performance &amp; Career</small>
      </span>
    </div>
  );
}

function NavList({ links, onNavigate }: { links?: any; onNavigate?: any }) {
  const groups: string[] = [...new Set<string>(links.map((l: any) => l[4]))];
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g} className="flex flex-col gap-1">
          <div className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/50">{g}</div>
          {links.filter((l) => l[4] === g).map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-semibold text-sidebar-foreground transition-all hover:bg-white/[0.07] hover:text-white',
                  isActive && 'bg-white/10 text-white shadow-sm ring-1 ring-white/10 hover:bg-white/10',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg transition-colors', isActive ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-white/5 text-sidebar-foreground group-hover:bg-white/10')}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="truncate">{label}</span>
                  {isActive && <span className="ml-auto size-1.5 rounded-full bg-blue-300" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarUser({ user, onOpen }: { user?: any; onOpen?: any }) {
  return (
    <button type="button" onClick={onOpen} className="mt-6 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10">
      <Avatar className="size-9"><AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-600 text-xs font-bold text-white">{initials(user.name)}</AvatarFallback></Avatar>
      <span className="min-w-0 leading-tight">
        <b className="block truncate text-[13px] text-white">{user.name}</b>
        <small className="block truncate text-[11px] text-sidebar-foreground/70">{ROLE_LABEL[user.role]}</small>
      </span>
    </button>
  );
}

export default function App() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  // Setelah keluar (atau sesi berakhir) alamat halaman sebelumnya tidak dipertahankan: kembali ke /login,
  // dan login berikutnya (mungkin akun lain) selalu mendarat di beranda.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (user) wasSignedIn.current = true;
    else if (wasSignedIn.current) { wasSignedIn.current = false; navigate('/login', { replace: true }); }
  }, [user, navigate]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // tur otomatis untuk pengguna yang belum pernah melihatnya
  useEffect(() => {
    if (!user || tourDone(user)) return undefined;
    const t = setTimeout(() => setTourOpen(true), 900);
    return () => clearTimeout(t);
  }, [user]);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    try { if (user) localStorage.setItem(tourKey(user), '1'); } catch { /* abaikan */ }
  }, [user]);

  if (!ready) return <p className="p-6 text-muted-foreground">Memuat…</p>;
  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
        <Toaster />
      </>
    );
  }
  // '/my-profile' menunjuk ke profil karyawan milik pengguna (jalur karier, gap, training, mentoring)
  const links = NAV.filter(([, , , roles]) => canAccess(user, roles))
    .filter(([to]) => to !== '/my-profile' || user.employee_id)
    .map((l) => (l[0] === '/my-profile' ? [`/employees/${user.employee_id}`, ...l.slice(1)] : l));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside data-tour="sidebar" className="no-scrollbar sticky top-0 hidden h-screen flex-col overflow-y-auto bg-gradient-to-b from-sidebar to-[#0a1322] px-3.5 py-5 lg:flex">
        <Brand />
        <NavList links={links} />
        <div className="mt-auto"><SidebarUser user={user} onOpen={() => setAcctOpen(true)} /></div>
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="no-scrollbar w-72 overflow-y-auto border-0 bg-gradient-to-b from-sidebar to-[#0a1322] px-3.5 py-5 [&>button]:text-white">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigasi utama</SheetDescription>
          <Brand />
          <NavList links={links} onNavigate={() => setMenuOpen(false)} />
          <SidebarUser user={user} onOpen={() => { setMenuOpen(false); setAcctOpen(true); }} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/80 px-4 backdrop-blur-md lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Buka menu">
              <Menu />
            </Button>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[15px] font-extrabold tracking-tight">Halo, {user.name.split(' ')[0]} 👋</div>
              <div className="hidden text-xs text-muted-foreground sm:block">{todayLabel()}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button" data-tour="search" onClick={() => setSearchOpen(true)} aria-label="Cari (Ctrl+K)"
              className="flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted sm:w-56 sm:justify-between"
            >
              <span className="flex items-center gap-2"><Search className="size-4" /><span className="hidden sm:inline">Cari…</span></span>
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold sm:inline">Ctrl K</kbd>
            </button>
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" data-tour="user-menu" className="flex items-center gap-2.5 rounded-full border bg-card py-1 pl-1 pr-3 shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40" aria-label="Menu akun">
                  <Avatar className="size-8"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">{initials(user.name)}</AvatarFallback></Avatar>
                  <span className="hidden text-left leading-tight sm:block">
                    <b className="block text-[13px]">{user.name}</b>
                    <small className="text-[11px] font-semibold text-primary">{ROLE_LABEL[user.role]}</small>
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <b className="block text-sm">{user.name}</b>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setAcctOpen(true)}><UserCog />Akun saya &amp; ganti password</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTourOpen(true)}><CircleHelp />Panduan penggunaan</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={logout}><LogOut />Keluar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] p-4 sm:p-7">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {/* halaman lama digabung ke Penilaian Karyawan; tautan lama tetap berfungsi */}
            <Route path="/review" element={<Navigate to="/evaluations?filter=review" replace />} />
            <Route path="/calibration" element={<Navigate to="/evaluations?tab=kalibrasi" replace />} />
            <Route path="/training" element={<Guard user={user} path="/training"><Training /></Guard>} />
            <Route path="/gaps" element={<Gaps />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />
            <Route path="/departments" element={<Guard user={user} path="/departments"><Departments /></Guard>} />
            <Route path="/team" element={<Guard user={user} path="/team"><TeamProgress /></Guard>} />
            <Route path="/talent" element={<Guard user={user} path="/talent"><TalentMap /></Guard>} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/periods" element={<Periods />} />
            <Route path="/periods/new" element={<PeriodWizard />} />
            <Route path="/periods/:id" element={<PeriodDetail />} />
            <Route path="/calibration/sessions/:id" element={<CalibrationSession />} />
            <Route path="/evaluations" element={<Evaluations />} />
            <Route path="/evaluations/:id" element={<EvaluationDetail />} />
            <Route path="/my-evaluations" element={<MyEvaluations />} />
            <Route path="/assessments/:id" element={<EvaluationForm />} />
            <Route path="/results" element={<Guard user={user} path="/results"><MyResults /></Guard>} />
            <Route path="/results/:id" element={<ResultView />} />
            <Route path="/dev-plans" element={<Guard user={user} path="/dev-plans"><DevPlans /></Guard>} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Guard user={user} path="/users"><Users /></Guard>} />
            <Route path="/config" element={<Guard user={user} path="/config"><Config /></Guard>} />
            <Route path="/career-levels" element={<Guard user={user} path="/career-levels"><CareerLevels /></Guard>} />
            <Route path="/audit" element={<Guard user={user} path="/audit"><AuditLog /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <AccountSheet user={user} open={acctOpen} onOpenChange={setAcctOpen} />
      <CommandPalette links={links} open={searchOpen} onOpenChange={setSearchOpen} />
      <Tour steps={TOUR_STEPS} open={tourOpen} onClose={closeTour} />
      <Toaster />
    </div>
  );
}
