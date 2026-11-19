import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '../api.ts';
import { Badge, Card, Loading, SOURCE_LABEL, fmt, useLoad } from '../ui.tsx';

const cell = (v) => (v >= 4 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : v >= 3 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300');
const TH = 'text-xs uppercase tracking-wide text-muted-foreground';

/** Perbandingan skor tiap indikator antar-evaluator pada satu evaluasi; selisih besar ditandai untuk dikalibrasi. */
export function CalibrationCard({ evaluationId }: { evaluationId?: any }) {
  const { data, error, loading } = useLoad(() => api.get(`/evaluations/${evaluationId}/calibration`), [evaluationId]);
  const asm = data?.assessments ?? [];

  return (
    <Card
      title={<span className="flex items-center gap-2"><Scale className="size-4 text-primary" />Kalibrasi antar-evaluator</span>}
      actions={data && asm.length > 1 && (data.flagged > 0 ? <Badge tone="amber">{data.flagged} indikator selisih besar</Badge> : <Badge tone="green">Selaras</Badge>)}
    >
      <Loading loading={loading} error={error}>
        {asm.length < 2 ? (
          <p className="text-sm text-muted-foreground">Perbandingan tersedia setelah minimal dua evaluator mengirim penilaian.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Skor per indikator (1–5, sub-indikator dirata-rata berbobot). Baris ditandai bila selisih tertinggi–terendah ≥ {fmt(data.threshold)} — bahan diskusi kalibrasi, bukan indikasi kesalahan.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TH}>Indikator</TableHead>
                  {asm.map((a) => (
                    <TableHead key={a.id} className={cn(TH, 'text-center')}>
                      <div>{SOURCE_LABEL[a.source]}</div>
                      <div className="font-normal normal-case tracking-normal">{a.evaluator_name}</div>
                    </TableHead>
                  ))}
                  <TableHead className={cn(TH, 'text-center')}>Selisih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.code} className={cn('hover:bg-muted/50', r.flagged && 'bg-amber-50/70 dark:bg-amber-500/10')}>
                    <TableCell className="font-medium">{r.name}<span className="ml-1.5 text-xs font-normal text-muted-foreground">{r.weight}%</span></TableCell>
                    {asm.map((a) => (
                      <TableCell key={a.id} className="text-center">
                        {r.scores[a.id] == null ? <span className="text-muted-foreground">—</span> : <span className={cn('inline-block min-w-10 rounded-md px-2 py-0.5 text-[13px] font-bold', cell(r.scores[a.id]))}>{fmt(r.scores[a.id])}</span>}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">{r.flagged ? <Badge tone="amber">{fmt(r.spread)}</Badge> : <span className="text-xs text-muted-foreground">{fmt(r.spread)}</span>}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-bold hover:bg-muted/40">
                  <TableCell>Rata-rata evaluator</TableCell>
                  {asm.map((a) => <TableCell key={a.id} className="text-center">{fmt(a.mean)}</TableCell>)}
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </>
        )}
      </Loading>
    </Card>
  );
}
