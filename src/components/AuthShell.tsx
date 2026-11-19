/** Kerangka halaman autentikasi (lupa/reset password): kartu di tengah dengan latar & merek seperti Login. */
export function AuthShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-b from-background to-secondary p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 size-[28rem] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex items-center gap-3 text-foreground">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 font-extrabold text-white shadow-lg shadow-blue-900/40">FD</span>
          <span className="leading-tight">
            <b className="block text-[15px] font-bold">FDP-CMS</b>
            <small className="text-xs opacity-70">Performance &amp; Career</small>
          </span>
        </div>
        <div className="rounded-2xl border bg-card p-7 shadow-xl shadow-slate-900/5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
