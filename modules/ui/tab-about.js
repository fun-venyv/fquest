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
                        <div class="fq-section-title">Что это такое</div>
                        <div class="fq-about-text">
                            FQuest — плагин для BetterDiscord и Vencord, который автоматически выполняет квесты Discord.
                            Он берёт на себя рутину: смотрит видео, запускает игры, стримы, активности и достижения.
                            Тебе остаётся только выбрать нужные квесты и забрать награды.
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Что умеет</div>
                        <div class="fq-about-features">
                            <div class="fq-about-feature">
                                <span class="fq-about-feature-icon">🎬</span>
                                <div class="fq-about-feature-body">
                                    <div class="fq-about-feature-title">Видео и стримы</div>
                                    <div class="fq-about-feature-text">Автоматически просматривает видео и подделывает стрим</div>
                                </div>
                            </div>
                            <div class="fq-about-feature">
                                <span class="fq-about-feature-icon">🎮</span>
                                <div class="fq-about-feature-body">
                                    <div class="fq-about-feature-title">Игры и активности</div>
                                    <div class="fq-about-feature-text">Подделывает запуск игр и участие в активностях</div>
                                </div>
                            </div>
                            <div class="fq-about-feature">
                                <span class="fq-about-feature-icon">📊</span>
                                <div class="fq-about-feature-body">
                                    <div class="fq-about-feature-title">Статистика Orbs</div>
                                    <div class="fq-about-feature-text">Дашборд с графиками, топом дней и историей наград</div>
                                </div>
                            </div>
                            <div class="fq-about-feature">
                                <span class="fq-about-feature-icon">🎨</span>
                                <div class="fq-about-feature-body">
                                    <div class="fq-about-feature-title">Живые темы</div>
                                    <div class="fq-about-feature-text">7 тем с настоящими JS-анимациями: Сакура, Starfield, Lofi и другие</div>
                                </div>
                            </div>
                            <div class="fq-about-feature">
                                <span class="fq-about-feature-icon">🔔</span>
                                <div class="fq-about-feature-body">
                                    <div class="fq-about-feature-title">Уведомления</div>
                                    <div class="fq-about-feature-text">Оповещения о завершении квестов и появлении новых</div>
                                </div>
                            </div>
                            <div class="fq-about-feature">
                                <span class="fq-about-feature-icon">⚡</span>
                                <div class="fq-about-feature-body">
                                    <div class="fq-about-feature-title">Горячие клавиши</div>
                                    <div class="fq-about-feature-text">Быстрый доступ ко всем вкладкам через Ctrl+1..6</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Поддержать проект</div>
                        <div class="fq-about-text">
                            FQuest развивается благодаря тебе. Если плагин помогает — расскажи о нём друзьям,
                            оставь отзыв или отправь идею для новой фичи.<br><br>

                            Нашёл баг? Есть предложение? Напиши мне — каждое сообщение помогает сделать FQuest лучше.
                            Возможно именно твоя идея попадёт в следующее обновление.
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Ссылки</div>
                        <div class="fq-about-links">
                            <a class="fq-about-link" data-url="https://discord.com/users/981395292685471784">
                                <span>💬 Discord</span>
                                <span class="fq-about-arrow">→</span>
                            </a>
                            <a class="fq-about-link" data-url="https://funpay.com/users/15985830/">
                                <span>🛒 Funpay</span>
                                <span class="fq-about-arrow">→</span>
                            </a>
                        </div>
                    </div>

                    <div class="fq-section fq-about-footer">
                        <div class="fq-about-text" style="text-align:center; opacity:.7; font-size:11px;">
                            FQuest v${CONFIG.VERSION} · сделано с душой by venyv
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