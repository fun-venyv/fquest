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
                        const url = ctx.api.Native?.getPluginPath ? '' : null;
                        const manifestUrl = 'https://raw.githubusercontent.com/venyv/fquest/main/manifest.json?t=' + Date.now();
                        const res = await fetch(manifestUrl);
                        const remote = await res.json();
                        if (remote.version !== manifest.version) {
                            if (confirm(`Доступна новая версия: ${remote.version}. Перезагрузить плагин?`)) {
                                localStorage.removeItem('fquest_module_cache_v1');
                                location.reload();
                            }
                        } else {
                            alert('Установлена последняя версия.');
                        }
                    } catch (e) {
                        alert('Не удалось проверить: ' + e.message);
                    }
                });

                container.querySelector('#fq-clear-cache')?.addEventListener('click', () => {
                    if (confirm('Очистить кэш модулей? При следующем запуске они скачаются заново.')) {
                        localStorage.removeItem('fquest_module_cache_v1');
                        alert('Кэш очищен. Перезагрузите Discord.');
                    }
                });
            },
        };
    },
};