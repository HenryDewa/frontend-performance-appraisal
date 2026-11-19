import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ComboOption { value: string; count?: number }

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Dipanggil saat pilihan dikonfirmasi (klik atau Enter pada saran). Tanpa ini, memilih hanya mengisi kolom. */
  onPick?: (value: string) => void;
  /** Dipanggil saat Enter ditekan tanpa saran terpilih (menambahkan teks bebas). */
  onSubmit?: () => void;
  options: ComboOption[];
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  'aria-label'?: string;
}

const MAX_SHOWN = 50;

/** Kotak isian dengan daftar saran yang bisa dicari, digulir, dan dipakai dengan keyboard. Pengganti <datalist> bawaan browser. */
export function SkillCombobox({ value, onChange, onPick, onSubmit, options, placeholder, maxLength = 80, invalid, 'aria-label': ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  const q = value.trim().toLowerCase();
  const matches = useMemo(() => {
    const m = q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options;
    // Yang diawali ketikan tampil lebih dulu, lalu yang paling banyak dipakai.
    return [...m].sort((a, b) => Number(b.value.toLowerCase().startsWith(q)) - Number(a.value.toLowerCase().startsWith(q)) || (b.count ?? 0) - (a.count ?? 0) || a.value.localeCompare(b.value));
  }, [options, q]);
  const shown = matches.slice(0, MAX_SHOWN);
  const exact = options.some((o) => o.value.toLowerCase() === q);
  const canCreate = !!q && !exact && !/[,;]/.test(q);

  const place = () => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 180 && above > below;
    setPos({ left: r.left, width: r.width, maxH: Math.max(120, Math.min(288, up ? above : below)), ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  };
  useLayoutEffect(() => { if (open) place(); }, [open, value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false); };
    const move = () => place();
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', move);
    window.addEventListener('scroll', move, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true); };
  }, [open]);
  useEffect(() => { setActive(-1); }, [q]);
  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const pick = (v: string) => { setOpen(false); setActive(-1); if (onPick) onPick(v); else onChange(v); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'Enter') {
      if (open && active >= 0 && shown[active]) { e.preventDefault(); pick(shown[active].value); }
      else if (onSubmit) { e.preventDefault(); setOpen(false); onSubmit(); }
    }
  };

  return (
    <div ref={wrap} className="min-w-0 flex-1">
      <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value} maxLength={maxLength} placeholder={placeholder} aria-label={ariaLabel} aria-invalid={invalid || undefined}
        role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list" autoComplete="off" className="pl-8"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={key}
      />
      </div>
      {open && pos && (shown.length > 0 || canCreate) && createPortal(
        <ul
          ref={list} id={id} role="listbox"
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH, zIndex: 1000, pointerEvents: 'auto' }}
          // Daftar dirender di body (di luar dialog), jadi hentikan event agar dialog Radix tidak menganggapnya klik luar atau memblokir gulir.
          onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}
          className="overflow-y-auto rounded-xl border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
        >
          {shown.map((o, i) => (
            <li
              key={o.value} role="option" aria-selected={i === active} data-active={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(o.value); }} onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5', i === active && 'bg-muted')}
            >
              <span className="min-w-0 truncate font-medium">{highlight(o.value, q)}</span>
              {o.count != null && <span className="shrink-0 text-xs text-muted-foreground">{o.count} dipakai</span>}
            </li>
          ))}
          {matches.length > MAX_SHOWN && <li className="px-2.5 py-1.5 text-xs text-muted-foreground">+{matches.length - MAX_SHOWN} lainnya — ketik lebih spesifik untuk mempersempit.</li>}
          {canCreate && (
            <li role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); pick(value.trim()); }} className="flex cursor-pointer items-center gap-2 rounded-lg border-t px-2.5 py-1.5 text-primary hover:bg-muted">
              <Plus className="size-4" />Tambah “{value.trim()}” sebagai baru
            </li>
          )}
        </ul>,
        document.body,
      )}
    </div>
  );
}

function highlight(text: string, q: string) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-primary/15 text-inherit">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}
