import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, FileDown, MessageSquareText, TrendingUp } from 'lucide-react';
import { api } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Badge, Bar, Card, ErrorBox, Loading, Page, SOURCE_LABEL, fmt, fmtDate, useAction, useLoad } from '../ui.tsx';
import { Button } from '@/components/ui/button';
import { StatCard, TrendChart } from './Dashboard.tsx';

const TH = 'text-xs uppercase tracking-wide text-muted-foreground';
const LBL = 'text-xs text-muted-foreground';

const CLASS_STYLE = {
  'Top Performer': 'from-emerald-500 to-emerald-700',
  'Middle Performer': 'from-amber-500 to-orange-600',
  'Low Performer': 'from-rose-500 to-red-700',
};

/** Skala 0-100 dengan penanda ambang Middle dan Top serta posisi skor. */
function ThresholdScale({ score, thresholds }: { score?: any; thresholds?: any }) {
  if (!thresholds) return <Bar value={score} />;
  const mark = (v, label) => (
    <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${v}%` }}>
      <div className="mx-auto h-4 w-px bg-foreground/40" />
      <div className="mt-0.5 whitespace-nowrap text-[10px] text-muted-foreground">{label} {fmt(v)}</div>
    </div>
  );
  return (
    <div className="pb-8">
      <div className="relative">
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-rose-300 dark:bg-rose-500/50" style={{ width: `${thresholds.middle}%` }} />
          <div className="bg-amber-300 dark:bg-amber-500/50" style={{ width: `${thresholds.top - thresholds.middle}%` }} />
          <div className="flex-1 bg-emerald-300 dark:bg-emerald-500/50" />
        </div>
        <div className="absolute -top-1 size-5 -translate-x-1/2 rounded-full border-[3px] border-primary bg-card shadow" style={{ left: `${Math.min(100, Math.max(0, score))}%` }} title={`Skor ${fmt(score)}`} />
        <div className="relative mt-1 h-8">{mark(thresholds.middle, 'Middle')}{mark(thresholds.top, 'Top')}</div>
      </div>
    </div>
  );
}

export default function MyResults() {
  const { user } = useAuth();
  const { data, error, loading } = useLoad(() => api.get(`/employees/${user.employee_id}/history`));
  const { busy, error: dlError, run } = useAction();
  const list = [...(data ?? [])].reverse(); // terbaru di atas
  const latest = list[0];
  const prev = list[1];
  const delta = latest && prev ? latest.final_score - prev.final_score : null;
  const avg = list.length ? list.reduce((s, h) => s + h.final_score, 0) / list.length : null;
  const best = list.length ? list.reduce((m, h) => (h.final_score > m.final_score ? h : m), list[0]) : null;
  const trend = (data ?? []).map((h) => ({ period_id: h.id, period: h.period, avg_score: h.final_score }));

  return (
    <Page title="Hasil Evaluasi Saya" eyebrow="Riwayat performa">
      <Loading loading={loading} error={error}>
        <ErrorBox error={dlError} />
        {list.length === 0 ? (
          <Card><p className="py-8 text-center text-sm text-muted-foreground">Belum ada hasil yang dipublikasikan. Hasil akan muncul di sini setelah ditinjau dan dipublikasikan manajemen.</p></Card>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Award} tone="blue" value={fmt(latest.final_score)} label="Skor terakhir" delta={delta} sub={prev ? 'dibanding periode lalu' : latest.period} />
              <StatCard icon={TrendingUp} tone="violet" value={fmt(avg)} label="Rata-rata skor" sub={`dari ${list.length} periode`} />
              <StatCard icon={Award} tone="green" value={fmt(best.final_score)} label="Skor tertinggi" sub={best.period} />
              <StatCard icon={MessageSquareText} tone="cyan" value={list.length} label="Periode terdokumentasi" sub="hasil yang dipublikasikan" />
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
              <Card title="Tren skor" className="lg:col-span-3"><TrendChart data={trend} /></Card>
              <Card title="Hasil terakhir" className="lg:col-span-2">
                <div className={`rounded-xl bg-gradient-to-br p-4 text-white ${CLASS_STYLE[latest.classification] ?? 'from-slate-500 to-slate-700'}`}>
                  <div className="text-xs font-medium opacity-90">{latest.period}</div>
                  <div className="text-4xl font-extrabold leading-tight">{fmt(latest.final_score)}</div>
                  <div className="text-sm font-semibold">{latest.classification}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link to={`/results/${latest.id}`}>Lihat detail</Link></Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => api.download(`/evaluations/${latest.id}/report.pdf`, `hasil-evaluasi-${latest.id}.pdf`))}><FileDown />PDF</Button>
                </div>
              </Card>
            </div>

            <Card title="Semua periode">
              <ul className="divide-y">
                {list.map((h, i) => {
                  const before = list[i + 1];
                  const d = before ? h.final_score - before.final_score : null;
                  return (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
                      <div className="min-w-40 flex-1">
                        <div className="font-semibold">{h.period}</div>
                        <div className={LBL}>Dipublikasikan {fmtDate(h.published_at)}</div>
                      </div>
                      <div className="w-full min-w-32 flex-1 sm:w-auto"><Bar value={h.final_score} /></div>
                      <div className="w-24 text-right">
                        <b className="text-lg">{fmt(h.final_score)}</b>
                        {d != null && <div className={`text-xs font-bold ${d >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{d >= 0 ? '▲' : '▼'} {fmt(Math.abs(d))}</div>}
                      </div>
                      <Badge>{h.classification}</Badge>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm"><Link to={`/results/${h.id}`}>Detail</Link></Button>
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => api.download(`/evaluations/${h.id}/report.pdf`, `hasil-evaluasi-${h.id}.pdf`))} aria-label={`Unduh PDF ${h.period}`}><FileDown />PDF</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        )}
      </Loading>
    </Page>
  );
}

export function ResultView() {
  const { id } = useParams();
  const { data, error, loading } = useLoad(() => api.get(`/evaluations/${id}/result`), [id]);
  const { busy, error: dlError, run } = useAction();
  const indName = (code) => data?.indicators.find((x) => x.code === code)?.name ?? code;
  const sorted = data ? [...data.indicators].sort((a, b) => b.score - a.score) : [];
  const strongest = sorted[0];
  const weakest = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  const bySource = {};
  (data?.feedback ?? []).forEach((f) => { (bySource[f.indicator_code] ??= []).push(f); });

  return (
    <Page title="Detail Hasil" eyebrow={data?.period} actions={<>
      {data && <Button variant="outline" disabled={busy} onClick={() => run(() => api.download(`/evaluations/${id}/report.pdf`, `hasil-evaluasi-${id}.pdf`))}><FileDown />Unduh PDF</Button>}
      <Button asChild variant="outline"><Link to="/results"><ArrowLeft />Kembali</Link></Button>
    </>}>
      <Loading loading={loading} error={error}>
        {data && (
          <div className="space-y-5">
            <ErrorBox error={dlError} />
            <div className={`rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg sm:p-6 ${CLASS_STYLE[data.classification] ?? 'from-blue-600 to-indigo-700'}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide opacity-90">Skor akhir · {data.period}</div>
                  <div className="text-5xl font-extrabold leading-tight">{fmt(data.final_score)}</div>
                  <div className="mt-1 inline-block rounded-full bg-white/20 px-3 py-0.5 text-sm font-semibold">{data.classification}</div>
                </div>
                {(strongest || weakest) && (
                  <div className="grid gap-2 text-sm sm:text-right">
                    {strongest && <div><span className="opacity-80">Terkuat</span><div className="font-semibold">{strongest.name} ({fmt(strongest.score)}/5)</div></div>}
                    {weakest && <div><span className="opacity-80">Perlu ditingkatkan</span><div className="font-semibold">{weakest.name} ({fmt(weakest.score)}/5)</div></div>}
                  </div>
                )}
              </div>
            </div>

            <Card title="Posisi skor terhadap standar">
              <ThresholdScale score={data.final_score} thresholds={data.thresholds} />
              {data.thresholds && <p className={LBL}>Ambang standar {data.seniority || 'seniority Anda'}: Middle ≥ {fmt(data.thresholds.middle)}, Top ≥ {fmt(data.thresholds.top)}.</p>}
              <p className="mt-2 text-xs text-muted-foreground">Hasil ini adalah masukan untuk pengembangan Anda dan ditinjau manajemen dengan mempertimbangkan konteks project; bukan keputusan otomatis.</p>
            </Card>

            <Card title="Skor per indikator">
              <div className="space-y-4">
                {data.indicators.map((i) => (
                  <Fragment key={i.code}>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
                        <span className="font-semibold">{i.name} <span className="font-normal text-muted-foreground">· bobot {i.weight}%</span></span>
                        <span><b>{fmt(i.score)}</b>/5 <span className="text-muted-foreground">· nilai berbobot {fmt(i.weighted)}</span></span>
                      </div>
                      <Bar value={i.score} max={5} />
                      {(i.subs ?? []).length > 0 && (
                        <div className="mt-2 space-y-1.5 border-l-2 pl-3">
                          {i.subs.map((s) => (
                            <div key={s.code} className="flex flex-wrap items-center gap-3 text-xs">
                              <span className="w-full text-muted-foreground sm:w-56">{s.name}</span>
                              <div className="min-w-24 flex-1"><Bar value={s.score} max={5} className="h-1.5" /></div>
                              <span className="w-10 text-right font-medium">{fmt(s.score)}/5</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(bySource[i.code] ?? []).length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {bySource[i.code].map((f, k) => (
                            <div key={k} className="rounded-lg bg-muted/60 px-3 py-2 text-[13px]"><span className={LBL}>{SOURCE_LABEL[f.source]}</span><div>{f.comment}</div></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Fragment>
                ))}
              </div>
            </Card>

            {data.feedback.filter((f) => !data.indicators.some((x) => x.code === f.indicator_code)).length > 0 && (
              <Card title="Feedback lainnya">
                {data.feedback.filter((f) => !data.indicators.some((x) => x.code === f.indicator_code)).map((f, i) => (
                  <div key={i} className="mb-3 last:mb-0"><span className={LBL}>{indName(f.indicator_code)} · {SOURCE_LABEL[f.source]}</span><div>{f.comment}</div></div>
                ))}
              </Card>
            )}
            {data.feedback.length === 0 && <Card title="Feedback yang dibagikan"><p className="text-sm text-muted-foreground">Tidak ada feedback tertulis yang dibagikan.</p></Card>}

            {data.plans.length > 0 && (
              <Card title="Tindak lanjut" actions={<Button asChild variant="outline" size="sm"><Link to="/dev-plans">Lihat rencana</Link></Button>}>
                {data.plans.map((p) => <div key={p.id} className="mb-1.5 flex flex-wrap items-center gap-2"><Badge>{p.type}</Badge> {p.goal} <Badge>{p.status}</Badge></div>)}
              </Card>
            )}
          </div>
        )}
      </Loading>
    </Page>
  );
}
