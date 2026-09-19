module.exports = {
    createTab(ctx) {
        const { RUNTIME, Storage, Profiles } = ctx;

        const toggles = [
            ['autoEnroll', 'Авто-участие в квестах'],
            ['autoClaim', 'Авто-получение наград'],
            ['playSound', 'Звук при завершении'],
            ['randomDelay', 'Случайная задержка 1-30 мин'],
            ['richPresence', 'Discord Rich Presence'],
            ['notifyOnFinish', 'Уведомления о завершении'],
            ['notifyOnlyFinal', 'Только финальное уведомление'],
            ['notifyInFocus', 'Уведомлять, даже если Discord в фокусе'],
        ];

        return {
            render(container) {
                const tglHtml = toggles.map(([key, label]) =>
                    `<div class="fq-option">
                        <span>${label}</span>
                        <input type="checkbox" class="native-toggle" data-key="${key}" ${RUNTIME[key] ? 'checked' : ''}>
                    </div>`
                ).join('');

                const profiles = Profiles.getAll().map(p =>
                    `<div class="fq-option" data-pid="${p.id}">
                        <span>${p.name}</span>
                        <span>
                            <button class="fq-btn-mini" data-act="apply">Прим.</button>
                            <button class="fq-btn-mini" data-act="remove">×</button>
                        </span>
                    </div>`
                ).join('') || '<div class="fq-empty">Нет профилей</div>';

                container.innerHTML = `
                    <div class="fq-section">
                        <div class="fq-section-title">Поведение</div>
                        ${tglHtml}
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Внешний вид</div>
                        <div class="fq-option">
                            <span>Тема</span>
                            <select class="fq-select" id="fq-theme">
                                <option value="dark"  ${RUNTIME.theme==='dark'?'selected':''}>Тёмная</option>
                                <option value="light" ${RUNTIME.theme==='light'?'selected':''}>Светлая</option>
                            </select>
                        </div>
                        <div class="fq-option">
                            <span>Акцентный цвет</span>
                            <input type="color" id="fq-accent" value="${RUNTIME.accent}">
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Профили настроек</div>
                        <div id="fq-profiles-list">${profiles}</div>
                        <button class="quest-pick-btn start" id="fq-profile-new" style="margin-top:8px;">Создать профиль</button>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Экспорт / Импорт</div>
                        <div style="display:flex; gap:8px;">
                            <button class="quest-pick-btn deselect" id="fq-export">Экспорт JSON</button>
                            <label class="quest-pick-btn deselect" style="position:relative; overflow:hidden;">
                                Импорт JSON
                                <input type="file" id="fq-import" accept=".json" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
                            </label>
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Сброс</div>
                        <button class="quest-pick-btn deselect" id="fq-reset">Сбросить все настройки</button>
                    </div>
                `;

                // toggles
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

                // theme
                container.querySelector('#fq-theme')?.addEventListener('change', (e) => {
                    RUNTIME.theme = e.target.value;
                    Storage.set('theme', RUNTIME.theme);
                    ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);
                });

                // accent
                container.querySelector('#fq-accent')?.addEventListener('input', (e) => {
                    RUNTIME.accent = e.target.value;
                    Storage.set('accent', RUNTIME.accent);
                    ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);
                });

                // profiles
                container.querySelector('#fq-profile-new')?.addEventListener('click', () => {
                    const defaultName = `Профиль ${Profiles.getAll().length + 1}`;
                    const name = ctx.UI.prompt('Имя профиля', defaultName);
                    if (!name) return;
                    Profiles.create(name);
                    this.render(container);
                });

                container.querySelector('#fq-profiles-list')?.addEventListener('click', (e) => {
                    const btn = e.target.closest('.fq-btn-mini');
                    if (!btn) return;
                    const pid = btn.closest('[data-pid]')?.dataset.pid;
                    if (!pid) return;
                    if (btn.dataset.act === 'apply') {
                        Profiles.apply(pid);
                        ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);
                        this.render(container);
                    } else if (btn.dataset.act === 'remove') {
                        Profiles.remove(pid);
                        this.render(container);
                    }
                });

                // export
                container.querySelector('#fq-export')?.addEventListener('click', () => {
                    const data = Storage.exportAll();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `fquest-settings-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                });

                // import
                container.querySelector('#fq-import')?.addEventListener('change', async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        const res = Storage.importAll(data);
                        if (res.ok) {
                            alert(`Импортировано: ${res.applied}`);
                            ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);
                            this.render(container);
                        } else {
                            alert('Ошибки: ' + res.errors.join('\n'));
                        }
                    } catch (err) {
                        alert('Не удалось прочитать файл: ' + err.message);
                    }
                });

                // reset
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