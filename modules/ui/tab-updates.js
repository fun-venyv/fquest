module.exports = {
    createTab(ctx) {
        return {
            render(container) {
                const manifest = ctx.manifest;
                const files = Object.keys(manifest.files || {});
                const totalSize = files.reduce((s, f) => s + (manifest.files[f].size || 0), 0);

                const list = files.map(f =>
                    `<div class="fq-option" style="font-size:11px;">
                        <span>${f}</span>
                        <span style="color:var(--fq-dim)">${manifest.files[f].size} b</span>
                    </div>`
                ).join('');

                container.innerHTML = `
                    <div class="fq-section">
                        <div class="fq-section-title">Текущая версия</div>
                        <div class="fq-option"><span>Модули FQuest</span><span>v${manifest.version}</span></div>
                        <div class="fq-option"><span>Обновлено</span><span>${new Date(manifest.updatedAt).toLocaleString('ru-RU')}</span></div>
                        <div class="fq-option"><span>Файлов</span><span>${files.length}</span></div>
                        <div class="fq-option"><span>Общий размер</span><span>${(totalSize / 1024).toFixed(1)} КБ</span></div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Действия</div>
                        <button class="quest-pick-btn start" id="fq-check-updates">Проверить обновления</button>
                        <button class="quest-pick-btn deselect" id="fq-clear-cache" style="margin-top:8px;">Очистить кэш модулей</button>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Файлы модулей</div>
                        ${list}
                    </div>
                `;

                container.querySelector('#fq-check-updates')?.addEventListener('click', async () => {
                    try {
                        const manifestUrl = 'https://raw.githubusercontent.com/fun-venyv/fquest/main/manifest.json?t=' + Date.now();
                        const res = await fetch(manifestUrl);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const text = await res.text();

                        if (!text.trim().startsWith('{')) {
                            throw new Error('Сервер вернул не JSON. Проверь URL и ник в FQuest.plugin.js');
                        }

                        const remote = JSON.parse(text);
                        if (remote.version !== ctx.manifest.version) {
                            const ok = await ctx.UI.confirm(`Доступна новая версия: ${remote.version}. Перезагрузить плагин?`);
                            if (ok) {
                                try { ctx.api.Data.delete('fquest_module_cache_v1'); } catch (_) {}
                                location.reload();
                            }
                        } else {
                            await ctx.UI.confirm('Установлена последняя версия.');
                        }
                    } catch (e) {
                        await ctx.UI.confirm('Не удалось проверить: ' + e.message);
                    }
                });

                container.querySelector('#fq-clear-cache')?.addEventListener('click', async () => {
                    const ok = await ctx.UI.confirm('Очистить кэш модулей? При следующем запуске они скачаются заново.');
                    if (!ok) return;
                    try { ctx.api.Data.delete('fquest_module_cache_v1'); } catch (_) {}
                    await ctx.UI.confirm('Кэш очищен. Перезагрузите Discord.');
                });
            },
        };
    },
};