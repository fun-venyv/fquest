/* FQuest · modules/ui/tab-stats.js
 * Дашборд статистики: React-версия с fallback на vanilla SVG */

module.exports = {
    createTab(ctx) {
        const { esc } = ctx;

        const TYPE_LABELS = {
            VIDEO: 'Видео', GAME: 'Игры', STREAM: 'Стримы',
            ACHIEVEMENT: 'Достижения', ACTIVITY: 'Активность',
        };

        const REWARD_COLORS = {
            ORB:       '#8B5CF6',
            ORBS:      '#8B5CF6',
            ORB_PACK:  '#A78BFA',
            DECORATION: '#EC4899',
            IN_GAME:   '#F59E0B',
            UNKNOWN:   '#6B7A94',
        };

        return {
            _reactRoot: null,
            _fallbackTimer: null,
            _vanillaPeriod: 'month',

            render(container) {
                const rt = ctx.React;

                // === React-путь ===
                if (rt && rt.isAvailable()) {
                    try {
                        const { createStatsDashboard } = ctx.modules('ui/components/stats-dashboard.js');
                        const StatsDashboard = createStatsDashboard(ctx, rt);

                        this._reactRoot = rt.render(
                            container,
                            StatsDashboard,
                            {
                                onClearHistory: () => this._refresh(),
                            },
                            () => this._renderVanilla(container)
                        );
                        return;
                    } catch (e) {
                        ctx.platform?.Logger?.warn?.('[TabStats] React render failed, fallback:', e);
                        this._renderVanilla(container);
                        return;
                    }
                }

                // === Vanilla fallback ===
                this._renderVanilla(container);
            },

            _refresh() {
                if (!this._reactRoot) return;
            },

            unmount(container) {
                try {
                    if (ctx.React?.isAvailable()) {
                        ctx.React.unmount(container);
                    }
                } catch (_) {}
                if (this._fallbackTimer) {
                    clearInterval(this._fallbackTimer);
                    this._fallbackTimer = null;
                }
                this._reactRoot = null;
            },

            // ============================================================
            //  VANILLA FALLBACK
            // ============================================================
            _renderVanilla(container) {
                const snap = ctx.Stats.snapshot();
                const fmt = (n) => String(n ?? 0);

                if (!this._vanillaPeriod) this._vanillaPeriod = 'month';

                const buildContent = () => {
                    const dailyAll = snap.dailyAll || {};
                    const daily = dailyAll[this._vanillaPeriod] || snap.daily || [];

                    // === KPI ===
                    const kpiCards = `
                        <div class="fq-stats-kpi fq-stats-kpi-2">
                            <div class="fq-kpi-card fq-kpi-orbs">
                                <div class="fq-kpi-icon">🟣</div>
                                <div class="fq-kpi-value">${fmt(snap.totalOrbs)}</div>
                                <div class="fq-kpi-label">Всего Orbs</div>
                            </div>
                            <div class="fq-kpi-card">
                                <div class="fq-kpi-icon">✅</div>
                                <div class="fq-kpi-value">${fmt(snap.total)}</div>
                                <div class="fq-kpi-label">Квестов</div>
                            </div>
                        </div>
                    `;

                    // === График Orbs ===
                    const { line, area, max, points } = ctx.Stats.buildLinePath(daily, 640, 100);
                    const n = daily.length;
                    const labelStep = Math.max(1, Math.ceil(n / 8));

                    const xLabels = daily
                        .map((d, i) => (i % labelStep === 0 || i === n - 1)
                            ? `<text x="${(i * (640 / Math.max(1, n - 1))).toFixed(0)}" y="118" 
                                    fill="var(--fq-muted)" font-size="9" text-anchor="middle">${esc(d.date)}</text>`
                            : ''
                        ).join('');

                    const dots = '';   

                    const totalOrbs = daily.reduce((s, d) => s + d.orbs, 0);
                    const totalCount = daily.reduce((s, d) => s + d.count, 0);

                    const orbsChart = `
                        <div class="fq-chart-card">
                            <div class="fq-chart-header">
                                <div class="fq-chart-title">Динамика Orbs</div>
                                <div class="fq-period-switch">
                                    <button class="fq-period-btn ${this._vanillaPeriod === 'week'  ? 'active' : ''}" data-period="week">Неделя</button>
                                    <button class="fq-period-btn ${this._vanillaPeriod === 'month' ? 'active' : ''}" data-period="month">Месяц</button>
                                    <button class="fq-period-btn ${this._vanillaPeriod === 'all'   ? 'active' : ''}" data-period="all">Всё время</button>
                                </div>
                            </div>
                            <div class="fq-chart-period-meta">
                                <span>Итого: <b>${totalOrbs} Orbs</b></span>
                                <span> · </span>
                                <span><b>${totalCount}</b> квестов</span>
                            </div>
                            <svg viewBox="0 0 640 120" class="fq-line-chart fq-line-chart-anim" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="fq-orbs-grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.4"/>
                                        <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
                                    </linearGradient>
                                </defs>
                                ${area ? `<path d="${area}" fill="url(#fq-orbs-grad)" class="fq-chart-area"/>` : ''}
                                ${line ? `<path d="${line}" fill="none" stroke="#A78BFA" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="fq-chart-line"/>` : ''}
                                ${dots}
                                ${xLabels}
                            </svg>
                            <div class="fq-chart-meta">Максимум за период: <b>${max}</b> Orbs</div>
                        </div>
                    `;

                    // === Прогресс-бары по типам ===
                    const typeBars = Object.entries(snap.byType)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => {
                            const pct = (count / snap.total) * 100;
                            return `
                                <div class="fq-type-row">
                                    <span class="fq-type-label">${TYPE_LABELS[type] || type}</span>
                                    <div class="fq-type-bar">
                                        <div class="fq-type-fill" style="width:${pct}%"></div>
                                    </div>
                                    <span class="fq-type-count">${count}</span>
                                </div>
                            `;
                        }).join('') || '<div class="fq-empty" style="padding:10px;">Пока пусто</div>';

                    const typesCard = `
                        <div class="fq-chart-card">
                            <div class="fq-chart-title">Квесты по типам</div>
                            <div class="fq-type-list">${typeBars}</div>
                        </div>
                    `;

                    // === Последние выполненные ===
                    const recentRows = snap.recent.map(r => {
                        const dt = new Date(r.completedAt);
                        const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                        const date = `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
                        return `
                            <div class="fq-recent-row">
                                <span class="fq-recent-icon">${r.rewardIcon || '❓'}</span>
                                <span class="fq-recent-name" title="${esc(r.name)}">${esc(r.name)}</span>
                                <span class="fq-recent-orbs">${r.orbs > 0 ? `+${r.orbs} 🟣` : ''}</span>
                                <span class="fq-recent-date">${date} ${time}</span>
                            </div>
                        `;
                    }).join('') || '<div class="fq-empty" style="padding:10px;">Пока ничего не выполнено</div>';

                    const recentCard = `
                        <div class="fq-chart-card">
                            <div class="fq-chart-title">Последние выполненные</div>
                            <div class="fq-recent-list">${recentRows}</div>
                        </div>
                    `;

                    // === Топ-3 дня ===
                    const topDaysHtml = snap.topDays.map((d, i) => `
                        <div class="fq-topday-row">
                            <span class="fq-topday-rank">#${i + 1}</span>
                            <span class="fq-topday-date">${esc(d.date)}</span>
                            <span class="fq-topday-orbs">${d.orbs} 🟣</span>
                            <span class="fq-topday-count">${d.count} кв.</span>
                        </div>
                    `).join('') || '<div class="fq-empty" style="padding:10px;">Нет данных</div>';

                    const topDaysCard = `
                        <div class="fq-chart-card">
                            <div class="fq-chart-title">Топ дней по Orbs</div>
                            <div class="fq-topday-list">${topDaysHtml}</div>
                        </div>
                    `;

                    // === Итог ===
                    return `
                        <div class="fq-stats-dashboard">
                            <div class="fq-section">${kpiCards}</div>
                            <div class="fq-section">${orbsChart}</div>
                            <div class="fq-grid-2">
                                ${typesCard}
                                ${topDaysCard}
                            </div>
                            <div class="fq-section">
                                ${recentCard}
                            </div>
                            <div class="fq-section">
                                <button class="quest-pick-btn deselect" id="fq-stats-clear">Очистить историю</button>
                            </div>
                        </div>
                    `;
                };

                // Первая отрисовка
                container.innerHTML = buildContent();

                // === Обработчики ===
                const bindHandlers = () => {
                    // Переключатель периода
                    container.querySelectorAll('.fq-period-btn').forEach(btn => {
                        btn.onclick = () => {
                            const period = btn.getAttribute('data-period');
                            if (period === this._vanillaPeriod) return;
                            this._vanillaPeriod = period;

                            const dash = container.querySelector('.fq-stats-dashboard');
                            if (dash) {
                                dash.style.opacity = '0';
                                dash.style.transform = 'translateY(4px)';
                                dash.style.transition = 'opacity .18s ease, transform .18s ease';
                                setTimeout(() => {
                                    container.innerHTML = buildContent();
                                    bindHandlers();
                                    const newDash = container.querySelector('.fq-stats-dashboard');
                                    if (newDash) {
                                        newDash.style.opacity = '0';
                                        newDash.style.transform = 'translateY(-4px)';
                                        requestAnimationFrame(() => {
                                            newDash.style.transition = 'opacity .22s ease, transform .22s ease';
                                            newDash.style.opacity = '1';
                                            newDash.style.transform = 'translateY(0)';
                                        });
                                    }
                                }, 180);
                            } else {
                                container.innerHTML = buildContent();
                                bindHandlers();
                            }
                        };
                    });

                    // Очистка истории
                    container.querySelector('#fq-stats-clear')?.addEventListener('click', async () => {
                        const ok = await ctx.UI.confirm('Очистить всю историю квестов?');
                        if (!ok) return;
                        ctx.History.clear();
                        container.innerHTML = buildContent();
                        bindHandlers();
                    });
                };

                bindHandlers();

                // === Авто-обновление раз в 5 сек ===
                if (this._fallbackTimer) clearInterval(this._fallbackTimer);
                this._fallbackTimer = setInterval(() => {
                    if (!document.body.contains(container)) {
                        clearInterval(this._fallbackTimer);
                        this._fallbackTimer = null;
                        return;
                    }
                    if (ctx.RUNTIME.activeTab !== 'stats') return;
                    if (ctx.UI._authLocked) return;

                    const active = document.activeElement;
                    if (active && container.contains(active) && active.tagName === 'INPUT') return;

                    try {
                        const newSnap = ctx.Stats.snapshot();
                        // Меняем данные в замыкании
                        Object.assign(snap, newSnap);
                        container.innerHTML = buildContent();
                        bindHandlers();
                    } catch (_) {}
                }, 5000);
            },
        };
    },
};