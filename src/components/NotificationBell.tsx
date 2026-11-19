import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, ClipboardCheck, ClipboardList, Clock, Megaphone, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';

const TYPES = {
  assignment: [ClipboardList, 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'],
  revision: [RotateCcw, 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'],
  review: [ClipboardCheck, 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'],
  approval: [ShieldCheck, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'],
  published: [Megaphone, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'],
  reminder: [Clock, 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'],
};

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ unread: number; items: any[] }>({ unread: 0, items: [] });
  const [emailOn, setEmailOn] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.get('/notifications?limit=30')); } catch { /* abaikan; coba lagi pada polling berikutnya */ }
  }, []);

  useEffect(() => {
    load();
    api.get('/notifications/preferences').then((p) => setEmailOn(p.notify_email)).catch(() => {});
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const go = async (n) => {
    setOpen(false);
    if (!n.read_at) {
      setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) }));
      api.post(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) nav(n.link);
  };

  const readAll = async () => {
    setData((d) => ({ unread: 0, items: d.items.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })) }));
    try { await api.post('/notifications/read-all'); } catch { load(); }
  };

  const toggleEmail = async (v) => {
    setEmailOn(v);
    try { await api.put('/notifications/preferences', { notify_email: v }); } catch { setEmailOn(!v); }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={data.unread ? `Notifikasi, ${data.unread} belum dibaca` : 'Notifikasi'} title="Notifikasi">
          <Bell />
          {data.unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-background">
              {data.unread > 9 ? '9+' : data.unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(380px,calc(100vw-1.5rem))] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <b className="text-sm font-bold">Notifikasi</b>
            {data.unread > 0 && <span className="ml-2 text-xs text-muted-foreground">{data.unread} belum dibaca</span>}
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={!data.unread} onClick={readAll}>
            <CheckCheck className="size-3.5" />Tandai semua dibaca
          </Button>
        </div>

        <div className="no-scrollbar max-h-[min(420px,60vh)] overflow-y-auto">
          {data.items.length === 0 ? (
            <div className="grid place-items-center gap-2 px-6 py-12 text-center text-muted-foreground">
              <span className="grid size-11 place-items-center rounded-full bg-muted"><BellOff className="size-5" /></span>
              <b className="text-sm text-foreground">Belum ada notifikasi</b>
              <span className="text-xs">Penugasan, pengingat tenggat, dan hasil evaluasi akan muncul di sini.</span>
            </div>
          ) : (
            data.items.map((n) => {
              const [Icon, tone] = TYPES[n.type] ?? [Bell, 'bg-muted text-muted-foreground'];
              return (
                <button key={n.id} type="button" onClick={() => go(n)} className={cn('flex w-full gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', !n.read_at && 'bg-primary/5')}>
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', tone)}><Icon className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <b className={cn('text-[13px] leading-snug', n.read_at ? 'font-semibold text-foreground/80' : 'font-bold')}>{n.title}</b>
                      {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" />}
                    </span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">{ago(n.created_at)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <Checkbox checked={emailOn} onCheckedChange={(v) => toggleEmail(v === true)} />
          Kirim juga lewat email
        </label>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
