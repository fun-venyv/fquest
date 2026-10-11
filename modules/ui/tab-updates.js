module.exports = {
    createTab(ctx) {
        const { CHANGELOG, getTypeLabel } = ctx.modules('ui/changelog.js');

        return {
            render(container) {
                const manifest = ctx.manifest;
                const files = Object.keys(manifest.files || {});
                const totalSize = files.reduce((s, f) => s + (manifest.files[f].size || 0), 0);

                const changesHtml = CHANGELOG.map((rel, idx) => {
                const isLatest = idx === 0;
                const isMajor = rel.type === 'major';

                // Если у релиза есть sections — рендерим по секциям
                const body = rel.sections
                    ? rel.sections.map(section => `
                        <div class="fq-changelog-section">
                            <div class="fq-changelog-section-title">
                                <span class="fq-changelog-section-icon">${section.icon}</span>
                                <span>${ctx.esc(section.label)}</span>
                                <span class="fq-changelog-section-count">${section.items.length}</span>
                            </div>
                            <ul class="fq-changelog-list">${section.items.map(i => `<li>${ctx.esc(i)}</li>`).join('')}</ul>
                        </div>
                    `).join('')
                    : `<ul class="fq-changelog-list">${(rel.items || []).map(i => `<li>${ctx.esc(i)}</li>`).join('')}</ul>`;

                return `
                    <div class="fq-changelog-item ${isLatest ? 'latest' : ''} ${isMajor ? 'major' : ''}">
                        <div class="fq-changelog-head">
                            <span class="fq-changelog-version">${ctx.esc(rel.version)}</span>
                            <span class="fq-changelog-type ${rel.type}">${getTypeLabel(rel.type)}</span>
                            ${rel.title ? `<span class="fq-changelog-subtitle">${ctx.esc(rel.title)}</span>` : ''}
                            <span class="fq-changelog-date">${ctx.esc(rel.date)}</span>
                        </div>
                        ${body}
                    </div>
                `;
            }).join('');

                container.innerHTML = `
                    <div class="fq-section">
                        <div class="fq-section-title">Текущая версия</div>
                        <div class="fq-option"><span>Модули FQuest</span><span>${ctx.esc(manifest.version)}</span></div>
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
                        <div class="fq-section-title">История обновлений</div>
                        <div class="fq-changelog">${changesHtml}</div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Загруженные файлы модулей</div>
                        ${files.map(f => `
                            <div class="fq-option" style="font-size:11px;">
                                <span>${ctx.esc(f)}</span>
                                <span style="color:var(--fq-dim)">${manifest.files[f].size} b</span>
                            </div>
                        `).join('')}
                    </div>
                `;

                container.querySelector('#fq-check-updates')?.addEventListener('click', async () => {
                    try {
                        const manifestUrl = 'https://raw.githubusercontent.com/fun-venyv/fquest/main/manifest.json?t=' + Date.now();
                        const res = await fetch(manifestUrl);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const text = await res.text();
                        if (!text.trim().startsWith('{')) throw new Error('Сервер вернул не JSON');
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