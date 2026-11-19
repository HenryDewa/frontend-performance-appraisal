import { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { api, setToken } from '@/api';
import { ROLE_LABEL } from '@/auth';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function AccountSheet({ user, open, onOpenChange }: { user?: any; open?: any; onOpenChange?: any }) {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<any>(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (f.next !== f.confirm) { setErr(new Error('Konfirmasi password baru tidak sama')); return; }
    if (f.next === f.current) { setErr(new Error('Password baru harus berbeda dari password saat ini')); return; }
    setBusy(true);
    try {
      // server memvalidasi password lama, menaikkan token_version, dan mengembalikan token baru
      const r = await api.post('/auth/change-password', { current_password: f.current, new_password: f.next });
      setToken(r.token);
      setF({ current: '', next: '', confirm: '' });
      toast.success('Password berhasil diganti.');
      onOpenChange(false);
    } catch (e2) {
      setErr(e2);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><KeyRound className="size-4" /> Akun saya</SheetTitle>
          <SheetDescription>Kelola kredensial akun Anda.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
          <div className="rounded-xl border bg-muted/40 p-3 text-sm">
            <div><span className="text-muted-foreground">Nama: </span><b>{user.name}</b></div>
            <div><span className="text-muted-foreground">Email: </span>{user.email}</div>
            <div><span className="text-muted-foreground">Role: </span>{ROLE_LABEL[user.role]}</div>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="font-semibold">Ganti password</div>
            <div className="grid gap-2">
              <Label htmlFor="cur-pass">Password saat ini</Label>
              <PasswordInput id="cur-pass" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required autoComplete="current-password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-pass">Password baru</Label>
              <PasswordInput id="new-pass" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required minLength={10} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">Minimal 10 karakter, memuat huruf dan angka.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="conf-pass">Konfirmasi password baru</Label>
              <PasswordInput id="conf-pass" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required autoComplete="new-password" />
            </div>
            {err && <p className="text-sm text-destructive">{err.message}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Ganti password'}</Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
