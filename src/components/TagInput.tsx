import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillCombobox } from './SkillCombobox.tsx';
import type { SkillSuggestion } from '@/lib/useSkillSuggestions.ts';
import { splitStack } from './employee-ui.tsx';

interface TagInputProps {
  /** Daftar yang disimpan sebagai teks dipisah koma (format kolom tech_stack di database). */
  value: string;
  onChange: (value: string) => void;
  /** Referensi nama yang sudah dipakai orang lain; tampil sebagai saran saat mengetik dan sebagai tombol cepat. */
  suggestions?: SkillSuggestion[];
  placeholder?: string;
  maxLength?: number;
  'aria-label'?: string;
}

export const hasSeparator = (s: string) => /[,;]/.test(s);

/**
 * Isian satu per satu: ketik satu nama lalu Enter atau "Tambah". Koma tidak diterima — tiap isian menjadi chip sendiri.
 * Dipakai untuk tech stack karyawan dan project agar formatnya seragam dengan skill karyawan.
 */
export function TagInput({ value, onChange, suggestions = [], placeholder, maxLength = 60, 'aria-label': ariaLabel }: TagInputProps) {
  const [text, setText] = useState('');
  const items = splitStack(value);
  const bad = hasSeparator(text);
  const clean = text.trim();
  const exists = items.some((x) => x.toLowerCase() === clean.toLowerCase());

  const add = (name = clean) => {
    const n = name.trim();
    if (!n || hasSeparator(n) || items.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    onChange([...items, n].join(', '));
    setText('');
  };
  const remove = (name: string) => onChange(items.filter((x) => x !== name).join(', '));
  const available = suggestions.filter((s) => !items.some((x) => x.toLowerCase() === s.skill.toLowerCase()));
  const options = available.map((s) => ({ value: s.skill, count: s.count }));
  const quick = available.slice(0, 8);

  return (
    <div className="grid gap-2">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pl-2.5 pr-1 text-xs font-medium">
              {t}
              <button type="button" className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Hapus ${t}`} onClick={() => remove(t)}><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-start gap-2">
        <SkillCombobox value={text} onChange={setText} onPick={(v) => add(v)} onSubmit={() => add()} options={options} maxLength={maxLength + 20} placeholder={placeholder} aria-label={ariaLabel} invalid={bad} />
        <Button type="button" variant="outline" disabled={!clean || bad || exists || clean.length > maxLength} onClick={() => add()}><Plus className="size-4" />Tambah</Button>
      </div>
      {bad && <p role="alert" className="text-xs text-destructive">Tulis satu per isian, tanpa koma. Tekan Enter untuk menambahkan, lalu ketik yang berikutnya.</p>}
      {!bad && exists && <p className="text-xs text-muted-foreground">“{clean}” sudah ada.</p>}
      {quick.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Umum dipakai:</span>
          {quick.map((s) => <button key={s.skill} type="button" onClick={() => add(s.skill)} className="rounded-full border px-2 py-0.5 hover:bg-muted hover:text-foreground">+ {s.skill}</button>)}
        </div>
      )}
    </div>
  );
}
