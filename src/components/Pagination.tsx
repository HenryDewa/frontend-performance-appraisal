import { Button } from "@/components/ui/button"

interface PaginationProps {
  page: number
  size: number
  total: number
  onPage: (page: number) => void
}

/** Pagination angka: menampilkan semua halaman bila sedikit, atau jendela + elipsis bila banyak. */
export function Pagination({ page, size, total, onPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  if (totalPages <= 1) return null
  const nums: (number | string)[] = []
  if (totalPages <= 8) {
    for (let p = 1; p <= totalPages; p += 1) nums.push(p)
  } else {
    nums.push(1)
    if (page > 3) nums.push("el")
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p += 1) nums.push(p)
    if (page < totalPages - 2) nums.push("er")
    nums.push(totalPages)
  }
  return (
    <nav aria-label="Halaman" className="flex flex-wrap items-center gap-1">
      {nums.map((p, i) => (typeof p === "number"
        ? <Button key={`p${p}`} size="sm" variant={p === page ? "default" : "outline"} aria-current={p === page ? "page" : undefined} className="min-w-8 px-2" onClick={() => onPage(p)}>{p}</Button>
        : <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>))}
    </nav>
  )
}

/** Baris bawah daftar: "Menampilkan x–y dari n <satuan>" di kiri, nomor halaman di kanan. */
export function PaginationBar({ page, size, total, onPage, unit }: PaginationProps & { unit: string }) {
  const from = total ? (page - 1) * size + 1 : 0
  const to = Math.min(page * size, total)
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">Menampilkan {from}–{to} dari {total} {unit}</span>
      <Pagination page={page} size={size} total={total} onPage={onPage} />
    </div>
  )
}
