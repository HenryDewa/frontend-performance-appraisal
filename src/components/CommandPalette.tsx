import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { api } from '../api.ts';

/** Palet perintah (Ctrl/⌘+K): lompat ke menu + cari karyawan/evaluasi/periode/dll sesuai hak akses. */
export function CommandPalette({ links, open, onOpenChange }: { links?: any; open?: any; onOpenChange?: any }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) { setQ(''); setGroups([]); return undefined; }
    const term = q.trim();
    if (term.length < 2) { setGroups([]); setBusy(false); return undefined; }
    const n = ++seq.current;
    setBusy(true);
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(term)}`)
        .then((r) => n === seq.current && setGroups(r.groups))
        .catch(() => n === seq.current && setGroups([]))
        .finally(() => n === seq.current && setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (to) => { onOpenChange(false); nav(to); };
  const term = q.trim().toLowerCase();
  const menu = links.filter(([, label]) => !term || label.toLowerCase().includes(term));
  const empty = !busy && menu.length === 0 && groups.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Pencarian global</DialogTitle>
        <DialogDescription className="sr-only">Cari menu, karyawan, evaluasi, dan periode</DialogDescription>
        <Command shouldFilter={false} className="rounded-xl">
          <CommandInput value={q} onValueChange={setQ} placeholder="Cari menu, karyawan, evaluasi, periode…" />
          <CommandList className="max-h-[360px]">
            {busy && <div className="px-4 py-3 text-xs text-muted-foreground">Mencari…</div>}
            {empty && <CommandEmpty>Tidak ada hasil untuk “{q}”.</CommandEmpty>}
            {menu.length > 0 && (
              <CommandGroup heading="Navigasi">
                {menu.map(([to, label, Icon]) => (
                  <CommandItem key={to} value={`nav-${to}`} onSelect={() => go(to)}><Icon className="text-muted-foreground" />{label}</CommandItem>
                ))}
              </CommandGroup>
            )}
            {groups.map((g) => (
              <CommandGroup key={g.group} heading={g.group}>
                {g.items.map((it) => (
                  <CommandItem key={`${g.group}-${it.id}`} value={`${g.group}-${it.id}`} onSelect={() => go(it.to)}>
                    <Search className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate font-medium">{it.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{it.subtitle}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
          <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span>Ketik minimal 2 huruf untuk mencari data</span>
            <span className="flex items-center gap-1"><CornerDownLeft className="size-3" /> buka · Esc tutup</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
