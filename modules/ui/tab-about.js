module.exports = {
    createTab(ctx) {
        const { CONFIG } = ctx;
        return {
            render(container) {
                container.innerHTML = `
                    <div class="fq-section fq-about-hero">
                        <div class="fq-about-logo">FQUEST</div>
                        <div class="fq-about-ver">v${CONFIG.VERSION}</div>
                        <div class="fq-about-tag">Автоматизация квестов Discord</div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">О проекте</div>
                        <div class="fq-about-text">
                            FQuest автоматически выполняет квесты Discord: видео, игры, стримы,
                            достижения и активность. Плагин работает через официальные API Discord
                            и не нарушает правила использования.
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Ссылки</div>
                        <div class="fq-about-links">
                            <a class="fq-about-link" data-url="https://github.com/venyv/fquest">
                                <span>GitHub</span>
                                <span class="fq-about-arrow">→</span>
                            </a>
                            <a class="fq-about-link" data-url="https://github.com/venyv/fquest/issues">
                                <span>Проблемы</span>
                                <span class="fq-about-arrow">→</span>
                            </a>
                            <a class="fq-about-link" data-url="https://github.com/venyv/fquest/releases">
                                <span>Релизы</span>
                                <span class="fq-about-arrow">→</span>
                            </a>
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Благодарности</div>
                        <div class="fq-about-text">
                            Спасибо Discord и BetterDiscord за платформу,<br>
                            и всем, кто помогает тестировать FQuest.
                        </div>
                    </div>
                `;

                container.querySelectorAll('.fq-about-link').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.preventDefault();
                        const url = el.getAttribute('data-url');
                        try {
                            if (window.DiscordNative?.shell?.openExternal) return window.DiscordNative.shell.openExternal(url);
                            if (ctx.api?.Native?.openExternal) return ctx.api.Native.openExternal(url);
                        } catch (_) {}
                        window.open(url, '_blank', 'noopener,noreferrer');
                    });
                });
            },
        };
    },
};