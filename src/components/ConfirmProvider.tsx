import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Pengganti window.confirm berbasis shadcn AlertDialog.
 *   const confirm = useConfirm();
 *   if (await confirm({ title, description, confirmText, cancelText, tone })) { ... }
 * tone: 'danger' (hapus/batalkan, tombol merah) | 'warning' (tindakan berdampak) | 'info' (konfirmasi biasa, bawaan).
 * `confirm('teks')` juga diterima dan dianggap sebagai description.
 */
const TONES = {
  danger: { Icon: Trash2, ring: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300', variant: 'destructive', confirmText: 'Ya, lanjutkan' },
  warning: { Icon: AlertTriangle, ring: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300', variant: 'default', confirmText: 'Ya, lanjutkan' },
  info: { Icon: HelpCircle, ring: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300', variant: 'default', confirmText: 'Ya, lanjutkan' },
};

const Ctx = createContext<any>(null);

export function useConfirm() {
  const confirm = useContext(Ctx);
  if (!confirm) throw new Error('useConfirm harus dipakai di dalam <ConfirmProvider>');
  return confirm;
}

export function ConfirmProvider({ children }: { children?: React.ReactNode }) {
  const [req, setReq] = useState<any>(null);
  const pending = useRef<any>(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    pending.current?.(false); // permintaan sebelumnya yang belum dijawab dianggap batal
    pending.current = resolve;
    setReq(typeof opts === 'string' ? { description: opts } : opts);
  }), []);

  const settle = (value) => {
    pending.current?.(value);
    pending.current = null;
    setReq(null);
  };

  const tone = TONES[req?.tone] ?? TONES.info;
  const { Icon } = tone;

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AlertDialog open={!!req} onOpenChange={(open) => { if (!open) settle(false); }}>
        <AlertDialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
          <AlertDialogHeader className="items-center gap-3 p-6 pb-5 text-center sm:items-start sm:text-left">
            <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-full ring-8 ring-card', tone.ring)}><Icon className="size-6" aria-hidden="true" /></span>
              <div className="min-w-0 space-y-1.5">
                <AlertDialogTitle className="text-lg font-extrabold tracking-tight">{req?.title ?? 'Konfirmasi'}</AlertDialogTitle>
                {req?.description && <AlertDialogDescription className="whitespace-pre-line text-[13.5px] leading-relaxed">{req.description}</AlertDialogDescription>}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t bg-muted/40 px-6 py-4 sm:justify-end">
            <AlertDialogCancel onClick={() => settle(false)}>{req?.cancelText ?? 'Batal'}</AlertDialogCancel>
            <AlertDialogAction variant={tone.variant} onClick={() => settle(true)}>{req?.confirmText ?? tone.confirmText}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}
