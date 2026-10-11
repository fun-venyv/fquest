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
                            FQuest автоматически выполняет квесты Discord: видео, игры, достижения и активность.
                            Плагин работает через официальные API Discord и не нарушает правила использования Discord.<br>

                            Если вы столкнулись с проблемой или у вас есть предложение как можно
                            улучшить FQuest то обращайтесь ко мне на фанпей, буду очень сильно благодарен, <br>
                            каждому предложению по улучшению и каждому найденому багу!<br>

                            Возможно именно ваше предложение попадет в следующее обновление FQuest! 
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Ссылки</div>
                        <div class="fq-about-links">
                            <a class="fq-about-link" data-url="https://discord.com/users/981395292685471784">
                                <span>Discord</span>
                                <span class="fq-about-arrow">→</span>
                            </a>
                            <a class="fq-about-link" data-url="https://funpay.com/users/15985830/">
                                <span>Funpay</span>
                                <span class="fq-about-arrow">→</span>
                            </a>
                        </div>
                    </div>

                    <div class="fq-section">
                        <div class="fq-section-title">Благодарности</div>
                        <div class="fq-about-text">
                            Буду благодарен каждому кто поможет улучшить FQuest, <br>
                            как и от лица обычного пользователя, так и от лица разработчика <br>
                            (P.S Если вы хотите внести вклад в проект как разработчик то пишите мне на Discord)
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