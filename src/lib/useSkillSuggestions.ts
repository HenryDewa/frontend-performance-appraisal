import { useEffect, useState } from 'react';
import { api } from '../api.ts';

export interface SkillSuggestion { skill: string; count: number }

/** Referensi skill/tech stack yang sudah dipakai karyawan dan project lain (nama + jumlah pemakai, tanpa identitas). */
export function useSkillSuggestions(): SkillSuggestion[] {
  const [list, setList] = useState<SkillSuggestion[]>([]);
  useEffect(() => {
    let off = false;
    api.get<SkillSuggestion[]>('/skills/suggestions?limit=200').then((d) => !off && setList(d)).catch(() => {});
    return () => { off = true; };
  }, []);
  return list;
}
