import { FolderX, UserX, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const GRADIENTS = [
  'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600', 'from-violet-500 to-purple-600', 'from-cyan-500 to-sky-600',
];
const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const initialsOf = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Avatar inisial dengan warna gradasi yang stabil per nama. */
export function PersonAvatar({ name, className, textClass = 'text-xs' }: { name?: any; className?: any; textClass?: string }) {
  return (
    <Avatar className={cn('size-9', className)}>
      <AvatarFallback className={cn('bg-gradient-to-br font-bold text-white', GRADIENTS[hash(name) % GRADIENTS.length], textClass)}>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}

/** Ubin persegi dengan inisial dan gradasi stabil — untuk client/project (padanan PersonAvatar yang bulat). */
export function GradientTile({ name, className, textClass = 'text-sm' }: { name?: any; className?: any; textClass?: string }) {
  return (
    <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-extrabold text-white shadow-sm', GRADIENTS[hash(name) % GRADIENTS.length], textClass, className)} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}

const SENIORITY = {
  junior: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  middle: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300',
  senior: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
};
export const SENIORITY_BAR = { junior: 'bg-sky-500', middle: 'bg-indigo-500', senior: 'bg-violet-500' };

export function SeniorityBadge({ value }: { value?: any }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', SENIORITY[value] ?? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300')}>{value}</span>;
}

/** Chip kecil (tech stack / project) — menampilkan maksimal `max`, sisanya "+n". */
export function Chips({ items, max = 3, tone = 'muted' }: { items?: any; max?: number; tone?: string }) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length) return <span className="text-muted-foreground">—</span>;
  const cls = tone === 'blue'
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
    : 'bg-muted text-muted-foreground';
  return (
    <div className="flex flex-wrap gap-1">
      {list.slice(0, max).map((t) => <span key={t} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium', cls)}>{t}</span>)}
      {list.length > max && <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground" title={list.slice(max).join(', ')}>+{list.length - max}</span>}
    </div>
  );
}

export const splitStack = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : []);

/** Penanda kelengkapan data (akun login / project aktif) — sumber peringatan di wizard periode. */
export function DataFlags({ emp }: { emp?: any }) {
  if (emp.status !== 'active') return null;
  const missing: any[] = [];
  if (!emp.has_account) missing.push(['Tidak punya akun login — tanpa self-assessment', UserX]);
  if (!emp.projects?.length) missing.push(['Tidak ada penugasan project aktif — tanpa penilaian PM/klien', FolderX]);
  if (!missing.length) return <span title="Data lengkap" className="inline-flex"><CheckCircle2 className="size-4 text-emerald-500" aria-label="Data lengkap" /></span>;
  return (
    <span className="inline-flex items-center gap-1">
      {missing.map(([text, Icon]) => <Icon key={text} className="size-4 text-amber-600 dark:text-amber-300" aria-label={text} title={text} />)}
    </span>
  );
}
