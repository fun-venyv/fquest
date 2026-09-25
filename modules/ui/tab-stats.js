module.exports = {
    createTab(ctx) {
        const { esc } = ctx;
        return {
            render(container) {
                const s = ctx.History.stats();
                const all = ctx.History.getAll();
                const avgSec = s.avgMs ? Math.round(s.avgMs / 1000) : 0;

                const typeLabels = { VIDEO: 'Видео', GAME: 'Игры', STREAM: 'Стримы', ACHIEVEMENT: 'Достижения', ACTIVITY: 'Активность' };
                const byType = Object.entries(s.byType).map(([k, v]) =>
                    `<div class="fq-option"><span>${typeLabels[k] || k}</span><span>${v}</span></div>`
                ).join('') || '<div class="fq-empty">Пока пусто</div>';

                const rows = all.slice(0, 50).map(r => {
                    const dt = new Date(r.completedAt).toLocaleString('ru-RU');
                    return `<div class="fq-option" style="font-size:11px;">
                        <span>${esc(r.name)} <span style="color:var(--fq-dim)">(${r.type})</span></span>
                        <span style="color:${r.claimed ? 'var(--fq-success)' : 'var(--fq-muted)'}">${r.claimed ? '✓' : '·'}</span>
                    </div>`;
                }).join('');

                container.innerHTML = `
                    <div class="fq-section">
                        <div class="fq-section-title">Итоги</div>
                        <div class="fq-option"><span>Всего выполнено</span><span>${s.total}</span></div>
                        <div class="fq-option"><span>Наград получено</span><span>${s.claimed}</span></div>
                        <div class="fq-option"><span>Средний интервал</span><span>${avgSec} с</span></div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">По типам</div>
                        ${byType}
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Последние записи</div>
                        <div class="fq-history-list">${rows || '<div class="fq-empty">Пока ничего не выполнено</div>'}</div>
                    </div>

                    <div class="fq-section">
                        <button class="quest-pick-btn deselect" id="fq-stats-clear">Очистить историю</button>
                    </div>
                `;

                container.querySelector('#fq-stats-clear')?.addEventListener('click', () => {
                    if (confirm('Очистить всю историю?')) {
                        ctx.History.clear();
                        this.render(container);
                    }
                });
            },
        };
    },
};