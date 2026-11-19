import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

const PAD = 8;
const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const find = (sel) => { const el = sel && document.querySelector(sel); return el && visible(el) ? el : null; };

/**
 * Tur panduan ringan: spotlight pada elemen [data-tour] + kartu penjelasan.
 * steps: [{ target?: '[data-tour="x"]', title, body }] — langkah tanpa target tampil di tengah;
 * langkah yang targetnya tidak ada/tersembunyi (mis. sidebar di layar kecil) dilewati otomatis.
 */
export function Tour({ steps, open, onClose }: { steps?: any; open?: any; onClose?: any }) {
  const [list, setList] = useState<any[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setList(steps.filter((s) => !s.target || find(s.target)));
    setI(0);
  }, [open, steps]);

  const step = list[i];
  const measure = useCallback(() => {
    const el = step?.target && find(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return undefined;
    const el = step.target && find(step.target);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => Math.min(list.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, list.length, onClose]);

  if (!open || !step) return null;

  const last = i === list.length - 1;
  const W = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let style;
  if (rect) {
    const below = rect.bottom + 16 + 190 < vh;
    const right = rect.right + 16 + W < vw && rect.width < vw * 0.5; // target sempit (sidebar) → kartu di samping
    if (right) style = { left: rect.right + 16, top: Math.min(Math.max(12, rect.top), vh - 230) };
    else style = { left: Math.min(Math.max(12, rect.left + rect.width / 2 - W / 2), vw - W - 12), top: below ? rect.bottom + 16 : Math.max(12, rect.top - 16 - 190) };
  } else {
    style = { left: Math.max(12, vw / 2 - W / 2), top: Math.max(12, vh / 2 - 110) };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Panduan penggunaan">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-blue-400 transition-all duration-300"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: '0 0 0 9999px rgba(8, 15, 30, 0.62)' }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(8,15,30,0.62)]" />
      )}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="fixed w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border bg-card p-4 text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={style}>
        <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-primary">
          <span>Panduan · {i + 1}/{list.length}</span>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onClose}>Lewati</button>
        </div>
        <h3 className="mb-1 text-base font-extrabold">{step.title}</h3>
        <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1" aria-hidden="true">
            {list.map((_, n) => <i key={n} className={`size-1.5 rounded-full ${n === i ? 'bg-primary' : 'bg-border'}`} />)}
          </div>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" size="sm" onClick={() => setI(i - 1)}>Sebelumnya</Button>}
            <Button size="sm" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Selesai' : 'Berikutnya'}</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
