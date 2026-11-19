import { Children, isValidElement } from "react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Radix Select tidak menerima value "" — dipetakan ke sentinel.
const EMPTY = "__empty__"
const toRadix = (v) => (v === "" || v == null ? EMPTY : String(v))
const fromRadix = (v) => (v === EMPTY ? "" : v)

function textOf(node: any): string {
  return Children.toArray(node).map((c) => (typeof c === "object" ? textOf((c as any).props?.children) : String(c))).join("")
}

/**
 * Select shadcn (Radix) dengan API <select> biasa: value, onChange(e) -> e.target.value, anak <option>.
 * Sehingga halaman cukup memakai <FormSelect><option .../></FormSelect>.
 */
function FormSelect({ value, onChange, children, className, disabled, required, name, id, "aria-label": ariaLabel }: any) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((o: any) => {
      const label = textOf(o.props.children)
      return { value: toRadix(o.props.value ?? label), label, disabled: o.props.disabled }
    })

  return (
    <Select
      value={toRadix(value)}
      onValueChange={(v) => onChange?.({ target: { value: fromRadix(v), name } })}
      disabled={disabled}
      required={required}
      name={name}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-full min-w-0 bg-card", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { FormSelect }
