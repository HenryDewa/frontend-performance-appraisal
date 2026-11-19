import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '../api.ts';
import { Badge, Card, Loading, SOURCE_LABEL, fmt, useLoad } from '../ui.tsx';

const TH = 'text-xs uppercase tracking-wide text-muted-foreground';
const BIAS = { longgar: ['Cenderung longgar', 'amber'], ketat: ['Cenderung ketat', 'blue'], netral: ['Netral', 'green'], data_kurang: ['Data belum cukup', 'gray'] };

/** Deviasi dari rata-rata rekan: batang ke kanan (lebih tinggi) / kiri (lebih rendah), skala ±1,0. */
function Deviation({ value }: { value?: any }) {
  const pct = Math.min(100, (Math.abs(value) / 1) * 50);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-28 rounded-full bg-muted" role="img" aria-label={`Deviasi ${fmt(value)}`}>
        <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
        <span className={`absolute inset-y-0 rounded-full ${value >= 0 ? 'bg-amber-500' : 'bg-blue-500'}`} style={value >= 0 ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }} />
      </div>
      <b className="w-12 text-right text-[13px]">{value > 0 ? '+' : ''}{fmt(value)}</b>
    </div>
  );
}

/** Panel kalibrasi evaluator untuk satu periode (dipakai sebagai tab di halaman Penilaian Karyawan). */
export function CalibrationPanel({ periodId }: { periodId?: any }) {
  const { data, error, loading } = useLoad(() => (periodId ? api.get(`/calibration?period_id=${periodId}`) : Promise.resolve(null)), [periodId]);
  const periodsLoading = false;

  return (
    <div className="space-y-4">
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10">
      <Info className="text-blue-700 dark:text-blue-300" />
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        Membandingkan rata-rata skor yang diberikan tiap evaluator dengan rekan pada sumber yang sama. <b>Longgar</b> = cenderung memberi skor lebih tinggi, <b>ketat</b> = lebih rendah (ambang ±0,4).
        Ini bahan diskusi untuk meratakan bias — bukan penilaian kinerja evaluator. Self-assessment tidak ikut dihitung.
      </AlertDescription>
    </Alert>

    <Loading loading={(loading && !data) || periodsLoading} error={error}>
      {data && (
        <div className="space-y-4">
          <Card title="Kecenderungan tiap evaluator">
            {data.evaluators.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada penilaian terkirim pada periode ini.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={TH}>Evaluator</TableHead>
                      <TableHead className={TH}>Sumber</TableHead>
                      <TableHead className={`${TH} text-right`}>Dinilai</TableHead>
                      <TableHead className={`${TH} text-right`}>Rata-rata</TableHead>
                      <TableHead className={`${TH} text-right`}>Rata-rata rekan</TableHead>
                      <TableHead className={TH}>Deviasi</TableHead>
                      <TableHead className={TH}>Kecenderungan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.evaluators.map((e) => {
                      const [label, tone] = BIAS[e.bias];
                      return (
                        <TableRow key={`${e.evaluator_user_id}-${e.source}`} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{e.evaluator_name}</TableCell>
                          <TableCell>{SOURCE_LABEL[e.source]}</TableCell>
                          <TableCell className="text-right">{e.count}</TableCell>
                          <TableCell className="text-right font-bold">{fmt(e.avg)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(e.peer_avg)}</TableCell>
                          <TableCell><Deviation value={e.deviation} /></TableCell>
                          <TableCell><Badge tone={tone}>{label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </Card>

          <Card title="Evaluasi dengan selisih antar-evaluator besar" actions={<Badge tone={data.divergent.length ? 'amber' : 'green'}>{data.divergent.length}</Badge>}>
            {data.divergent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada evaluasi dengan selisih ≥ {fmt(data.threshold ?? 1.5)} pada indikator mana pun.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={TH}>Developer</TableHead>
                    <TableHead className={`${TH} text-right`}>Indikator bermasalah</TableHead>
                    <TableHead className={`${TH} text-right`}>Selisih terbesar</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.divergent.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/50">
                      <TableCell><b>{d.name}</b><div className="text-xs text-muted-foreground">{d.code} · {d.seniority}</div></TableCell>
                      <TableCell className="text-right">{d.flagged_indicators}</TableCell>
                      <TableCell className="text-right"><Badge tone="amber">{fmt(d.max_spread)}</Badge></TableCell>
                      <TableCell className="text-right"><Link className="text-primary hover:underline" to={`/evaluations/${d.id}`}>Buka perbandingan</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </Loading>
    </div>
  );
}
