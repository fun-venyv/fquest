module.exports = {
    createTab(ctx) {
        const { RUNTIME, Storage } = ctx;

        const toggles = [
            ['autoClaim', 'Авто-получение наград'],
            ['playSound', 'Звук при завершении'],
            ['richPresence', 'Discord Rich Presence'],
            ['notifyOnFinish', 'Уведомления о завершении'],
            ['notifyOnlyFinal', 'Только финальное уведомление'],
            ['notifyInFocus', 'Уведомлять, даже если Discord в фокусе'],
        ];

        const THEMES = [
            { id: 'dark',      label: '🌑 Тёмная' },
            { id: 'light',     label: '☀️ Светлая' },
            { id: 'sakura',    label: '🌸 Сакура' },
            { id: 'cyberpunk', label: '💜 Cyberpunk' },
            { id: 'midnight',  label: '🌙 Midnight Blossom' },
            { id: 'starfield', label: '✨ Starfield' },
            { id: 'lofi',      label: '🎧 Lofi' },
        ];

        return {
            render(container) {
                const tglHtml = toggles.map(([key, label]) =>
                    `<div class="fq-option">
                        <span>${label}</span>
                        <input type="checkbox" class="native-toggle" data-key="${key}" ${RUNTIME[key] ? 'checked' : ''}>
                    </div>`
                ).join('');

                const themeOptions = THEMES.map(t =>
                    `<option value="${t.id}" ${RUNTIME.theme === t.id ? 'selected' : ''}>${t.label}</option>`
                ).join('');

                container.innerHTML = `
                    <div class="fq-section">
                        <div class="fq-section-title">Поведение</div>
                        ${tglHtml}
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Внешний вид</div>
                        <div class="fq-option">
                            <span>Тема</span>
                            <select class="fq-select" id="fq-theme">${themeOptions}</select>
                        </div>
                        <div class="fq-option">
                            <span>Акцентный цвет</span>
                            <input type="color" id="fq-accent" value="${RUNTIME.accent || '#8B5CF6'}">
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Аккаунт</div>
                        <button class="quest-pick-btn deselect" id="fq-logout">Выйти из аккаунта</button>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Сброс</div>
                        <button class="quest-pick-btn deselect" id="fq-reset">Сбросить все настройки</button>
                    </div>
                `;

                container.querySelectorAll('.native-toggle').forEach(cb => {
                    cb.addEventListener('change', () => {
                        const key = cb.dataset.key;
                        RUNTIME[key] = cb.checked;
                        Storage.set(key, cb.checked);

                        if (key === 'richPresence') {
                            cb.checked ? ctx.RPC?.enable() : ctx.RPC?.disable();
                        }
                    });
                });

                container.querySelector('#fq-theme')?.addEventListener('change', (e) => {
                    RUNTIME.theme = e.target.value;
                    Storage.set('theme', RUNTIME.theme);
                    ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);
                });

                container.querySelector('#fq-accent')?.addEventListener('input', (e) => {
                    RUNTIME.accent = e.target.value;
                    Storage.set('accent', RUNTIME.accent);
                    ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);
                });

                container.querySelector('#fq-logout')?.addEventListener('click', async () => {
                    const ok = await ctx.UI.confirm('Выйти из аккаунта FQuest? Придётся ввести ключ заново.');
                    if (!ok) return;
                    ctx.Profile.clear();
                    location.reload();
                });

                container.querySelector('#fq-reset')?.addEventListener('click', async () => {
                    const ok = await ctx.UI.confirm('Сбросить все настройки?');
                    if (!ok) return;
                    Storage.reset();
                    ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);
                    this.render(container);
                });
            },
        };
    },
};