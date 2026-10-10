/* ============================================================
 *  FQuest · modules/ui/components/stats-dashboard.js
 * ============================================================ */

module.exports = {
    /**
     * @param {object} ctx
     * @param {object} rt   
     * @returns {function}  
     */
    createStatsDashboard(ctx, rt) {
        const { esc } = ctx;
        const React = rt.getReact();
        const { useState, useEffect, useRef, useMemo } = rt.hooks;

        const TYPE_LABELS = {
            VIDEO: 'Видео', GAME: 'Игры', STREAM: 'Стримы',
            ACHIEVEMENT: 'Достижения', ACTIVITY: 'Активность',
        };

        function AnimatedNumber({ value, duration = 800 }) {
            const [display, setDisplay] = useState(value);
            const prevRef = useRef(value);

            useEffect(() => {
                const start = prevRef.current;
                const end = value;
                if (start === end) return;
                const t0 = performance.now();
                let raf;

                const tick = (t) => {
                    const p = Math.min(1, (t - t0) / duration);
                    const ease = 1 - Math.pow(1 - p, 3);
                    setDisplay(Math.round(start + (end - start) * ease));
                    if (p < 1) raf = requestAnimationFrame(tick);
                    else prevRef.current = end;
                };
                raf = requestAnimationFrame(tick);
                return () => cancelAnimationFrame(raf);
            }, [value, duration]);

            return React.createElement('span', null, display);
        }

        function KpiCard({ icon, value, label, accent }) {
            const h = rt.h;
            return h('div', {
                className: `fq-kpi-card ${accent ? 'fq-kpi-orbs' : ''}`,
            },
                h('div', { className: 'fq-kpi-icon' }, icon),
                h('div', { className: 'fq-kpi-value' },
                    React.createElement(AnimatedNumber, { value })
                ),
                h('div', { className: 'fq-kpi-label' }, label)
            );
        }

        function OrbsChart({ dailyAll }) {
            const h = rt.h;
            const [period, setPeriod] = useState('month');
            const [hover, setHover] = useState(null);
            const [animKey, setAnimKey] = useState(0);

            const daily = useMemo(() => {
                if (!dailyAll) return [];
                return dailyAll[period] || dailyAll.month || [];
            }, [dailyAll, period]);

            useEffect(() => {
                setAnimKey(k => k + 1);
                setHover(null);
            }, [period]);

            const w = 640, hh = 120;
            const max = Math.max(1, ...daily.map(d => d.orbs));
            const n = daily.length;
            const stepX = n > 1 ? w / (n - 1) : w;

            const points = daily.map((d, i) => ({
                x: i * stepX,
                y: hh - (d.orbs / max) * (hh - 15) - 5,
                v: d.orbs,
                date: d.date,
                i,
            }));

            const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const area = `${line} L${w},${hh} L0,${hh} Z`;

            const labelStep = Math.max(1, Math.ceil(n / 8));
            const xLabels = daily.map((d, i) => (i % labelStep === 0 || i === n - 1)
                ? h('text', {
                    key: `x${i}`,
                    x: i * stepX, y: hh + 15,
                    fill: 'var(--fq-muted)', fontSize: 9,
                    textAnchor: 'middle',
                }, d.date)
                : null
            );

            const PERIODS = [
                { id: 'week',  label: 'Неделя' },
                { id: 'month', label: 'Месяц' },
                { id: 'all',   label: 'Всё время' },
            ];

            const totalOrbs = daily.reduce((s, d) => s + d.orbs, 0);
            const totalCount = daily.reduce((s, d) => s + d.count, 0);

            return h('div', { className: 'fq-chart-card' },
                h('div', { className: 'fq-chart-header' },
                    h('div', { className: 'fq-chart-title' }, 'Динамика Orbs'),
                    h('div', { className: 'fq-period-switch' },
                        ...PERIODS.map(p =>
                            h('button', {
                                key: p.id,
                                className: `fq-period-btn ${period === p.id ? 'active' : ''}`,
                                onClick: () => setPeriod(p.id),
                            }, p.label)
                        )
                    )
                ),

                h('div', { className: 'fq-chart-period-meta' },
                    h('span', null, 'Итого: ', h('b', null, `${totalOrbs} Orbs`)),
                    h('span', null, ' · '),
                    h('span', null, h('b', null, `${totalCount}`), ' квестов')
                ),

                h('svg', {
                    key: animKey,
                    viewBox: `0 0 ${w} ${hh + 20}`,
                    className: 'fq-line-chart fq-line-chart-anim',
                    preserveAspectRatio: 'none',
                    style: { overflow: 'visible' },
                },
                    h('defs', null,
                        h('linearGradient', { id: 'fq-orbs-grad', x1: 0, y1: 0, x2: 0, y2: 1 },
                            h('stop', { offset: '0%', stopColor: '#8B5CF6', stopOpacity: 0.4 }),
                            h('stop', { offset: '100%', stopColor: '#8B5CF6', stopOpacity: 0 })
                        )
                    ),
                    area && h('path', {
                        d: area,
                        fill: 'url(#fq-orbs-grad)',
                        className: 'fq-chart-area',
                    }),
                    line && h('path', {
                        d: line,
                        fill: 'none',
                        stroke: '#A78BFA',
                        strokeWidth: 2,
                        strokeLinejoin: 'round',
                        strokeLinecap: 'round',
                        className: 'fq-chart-line',
                    }),
                    ...points.map((p, i) => p.v > 0
                        ? h('circle', {
                            key: i,
                            cx: p.x, cy: p.y,
                            r: hover?.i === i ? 5 : 2.5,
                            fill: '#A78BFA',
                            stroke: '#0F0F16',
                            strokeWidth: 1,
                            style: { cursor: 'pointer', transition: 'r .15s' },
                            onMouseEnter: () => setHover(p),
                            onMouseLeave: () => setHover(null),
                        })
                        : null
                    ),
                    ...xLabels
                ),

                hover
                    ? h('div', { className: 'fq-chart-hover' },
                        `${hover.date}: ${hover.v} Orbs`)
                    : h('div', { className: 'fq-chart-meta' },
                        'Максимум за период: ', h('b', null, max), ' Orbs')
            );
        }

        function TypeBars({ byType, total }) {
            const h = rt.h;
            const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
            return h('div', { className: 'fq-chart-card' },
                h('div', { className: 'fq-chart-title' }, 'Квесты по типам'),
                h('div', { className: 'fq-type-list' },
                    entries.length
                        ? entries.map(([type, count]) =>
                            h('div', { key: type, className: 'fq-type-row' },
                                h('span', { className: 'fq-type-label' }, TYPE_LABELS[type] || type),
                                h('div', { className: 'fq-type-bar' },
                                    h('div', {
                                        className: 'fq-type-fill',
                                        style: {
                                            width: `${(count / total) * 100}%`,
                                            transition: 'width .6s cubic-bezier(.16,1,.3,1)',
                                        },
                                    })
                                ),
                                h('span', { className: 'fq-type-count' }, String(count))
                            )
                        )
                        : h('div', { className: 'fq-empty', style: { padding: '10px' } }, 'Пока пусто')
                )
            );
        }

        function TopDays({ topDays }) {
            const h = rt.h;
            return h('div', { className: 'fq-chart-card' },
                h('div', { className: 'fq-chart-title' }, 'Топ дней по Orbs'),
                h('div', { className: 'fq-topday-list' },
                    topDays.length
                        ? topDays.map((d, i) =>
                            h('div', { key: `${d.date}-${i}`, className: 'fq-topday-row' },
                                h('span', { className: 'fq-topday-rank' }, `#${i + 1}`),
                                h('span', { className: 'fq-topday-date' }, d.date),
                                h('span', { className: 'fq-topday-orbs' }, `${d.orbs} 🟣`),
                                h('span', { className: 'fq-topday-count' }, `${d.count} кв.`)
                            )
                        )
                        : h('div', { className: 'fq-empty', style: { padding: '10px' } }, 'Нет данных')
                )
            );
        }

        function RecentList({ recent }) {
            const h = rt.h;
            return h('div', { className: 'fq-chart-card' },
                h('div', { className: 'fq-chart-title' }, 'Последние выполненные'),
                h('div', { className: 'fq-recent-list' },
                    recent.length
                        ? recent.map((r) => {
                            const dt = new Date(r.completedAt);
                            const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                            const date = `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
                            return h('div', { key: r.id, className: 'fq-recent-row' },
                                h('span', { className: 'fq-recent-icon' }, r.rewardIcon || '❓'),
                                h('span', { className: 'fq-recent-name', title: r.name }, r.name),
                                h('span', { className: 'fq-recent-orbs' }, r.orbs > 0 ? `+${r.orbs} 🟣` : ''),
                                h('span', { className: 'fq-recent-date' }, `${date} ${time}`)
                            );
                        })
                        : h('div', { className: 'fq-empty', style: { padding: '10px' } }, 'Пока ничего не выполнено')
                )
            );
        }

        return function StatsDashboard({ onClearHistory }) {
            const h = rt.h;
            const [snap, setSnap] = useState(() => ctx.Stats.snapshot());

            // Auto-refresh раз в 5 сек
            useEffect(() => {
                const id = setInterval(() => {
                    try {
                        setSnap(ctx.Stats.snapshot());
                    } catch (_) {}
                }, 5000);
                return () => clearInterval(id);
            }, []);

           const kpis = h('div', { className: 'fq-stats-kpi fq-stats-kpi-2' },
                h(KpiCard, { icon: '🟣', value: snap.totalOrbs, label: 'Всего Orbs', accent: true }),
                h(KpiCard, { icon: '✅', value: snap.total, label: 'Квестов' })
            );

            const handleClear = async () => {
                const ok = await ctx.UI.confirm('Очистить всю историю квестов?');
                if (!ok) return;
                ctx.History.clear();
                setSnap(ctx.Stats.snapshot());
                if (typeof onClearHistory === 'function') onClearHistory();
            };

            return h('div', { className: 'fq-stats-dashboard' },
                h('div', { className: 'fq-section' }, kpis),
                h('div', { className: 'fq-section' }, h(OrbsChart, { dailyAll: snap.dailyAll })),
                h('div', { className: 'fq-grid-2' },
                    h(TypeBars, { byType: snap.byType, total: snap.total }),
                    h(TopDays, { topDays: snap.topDays })
                ),
                h('div', { className: 'fq-section' },
                    h(RecentList, { recent: snap.recent })
                ),
                h('div', { className: 'fq-section' },
                    h('button', {
                        className: 'quest-pick-btn deselect',
                        onClick: handleClear,
                    }, 'Очистить историю')
                )
            );
        };
    },
};