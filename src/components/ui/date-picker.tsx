import { useState } from "react"
import { CalendarIcon, X } from "lucide-react"
import { id as idLocale } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// nilai selalu string 'YYYY-MM-DD' (tanggal lokal, tanpa konversi zona waktu)
const toDate = (v) => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  const [y, m, d] = v.split("-").map(Number)
  return new Date(y, m - 1, d)
}
const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const pretty = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })

/**
 * Date picker shadcn (Popover + Calendar). API sengaja menyerupai <input type="date">:
 *   <DatePicker value="2026-11-13" onChange={(e) => e.target.value} required />
 * `onChange` menerima { target: { value } } ('' bila dikosongkan). Opsional: min, max ('YYYY-MM-DD'), placeholder, clearable.
 */
function DatePicker({
  value, onChange, required, disabled, min, max, placeholder = "Pilih tanggal", clearable, className, id,
  "aria-label": ariaLabel, "aria-invalid": ariaInvalid,
}: any) {
  const [open, setOpen] = useState(false)
  const date = toDate(value)
  const lo = toDate(min)
  const hi = toDate(max)
  const emit = (v) => onChange?.({ target: { value: v } })
  const canClear = (clearable ?? !required) && !!date && !disabled
  const now = new Date()

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button" id={id} disabled={disabled} aria-label={ariaLabel} aria-invalid={ariaInvalid} data-empty={!date}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-left text-sm shadow-xs outline-none transition-[color,box-shadow]",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
              "aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[empty=true]:text-muted-foreground",
              canClear && "pr-9",
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{date ? pretty(date) : placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={idLocale}
            selected={date}
            defaultMonth={date ?? hi ?? lo ?? now}
            onSelect={(d) => { if (d) { emit(toStr(d)); setOpen(false) } }}
            captionLayout="dropdown"
            startMonth={new Date(Math.min(now.getFullYear() - 10, lo?.getFullYear() ?? 9999), 0)}
            endMonth={new Date(Math.max(now.getFullYear() + 10, hi?.getFullYear() ?? 0), 11)}
            disabled={[...(lo ? [{ before: lo }] : []), ...(hi ? [{ after: hi }] : [])]}
          />
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { emit(toStr(now)); setOpen(false) }} disabled={(lo && now < lo) || (hi && now > hi)}>Hari ini</Button>
            {canClear && <Button type="button" variant="ghost" size="sm" onClick={() => { emit(""); setOpen(false) }}>Hapus</Button>}
          </div>
        </PopoverContent>
      </Popover>
      {canClear && (
        <button type="button" aria-label="Hapus tanggal" onClick={() => emit("")} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-3.5" />
        </button>
      )}
      {/* validasi bawaan form: pembuat form tetap dapat memakai `required` */}
      {required && <input tabIndex={-1} aria-hidden="true" required value={value ?? ""} onChange={() => {}} className="pointer-events-none absolute inset-0 h-full w-full opacity-0" />}
    </div>
  )
}

export { DatePicker }
