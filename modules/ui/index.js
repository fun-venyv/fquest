/* FQuest · modules/ui/index.js
 * Корневой UI — окно, сайдбар, вкладки */

module.exports = {
    createUI(ctx) {
        const { RUNTIME, ICONS, CONFIG, api } = ctx;

        const TABS = [
            { id: 'quests',   label: 'Задачи',       icon: ICONS.CHECK,    factory: () => ctx.modules('ui/tab-quests.js') },
            { id: 'stats',    label: 'Статистика',   icon: ICONS.CHART,    factory: () => ctx.modules('ui/tab-stats.js') },
            { id: 'settings', label: 'Настройки',    icon: ICONS.OPT,      factory: () => ctx.modules('ui/tab-settings.js') },
            { id: 'updates',  label: 'Обновления',   icon: ICONS.DOWNLOAD, factory: () => ctx.modules('ui/tab-updates.js') },
            { id: 'about',    label: 'О приложении', icon: ICONS.INFO,     factory: () => ctx.modules('ui/tab-about.js') },
        ];

        const tabModules = {};
        for (const t of TABS) tabModules[t.id] = t.factory().createTab(ctx);

        return {
            root: null,
            navBtn: null,
            open: false,
            _activeTab: RUNTIME.activeTab || 'quests',
            _navWatcher: null,
            _pluginEnabled: false,

            /* ——— SIDEBAR в Discord ——— */
            mountSidebarButton() {
                this._pluginEnabled = true;
                const tryMount = () => {
                    if (!this._pluginEnabled) return true;
                    if (this.navBtn && document.body.contains(this.navBtn)) return true;

                    const existing = document.querySelector('.fq-nav-btn');
                    if (existing) { this.navBtn = existing; return true; }

                    const selectors = [
                        'a[href="/quest-home"]', 'a[href="/quests"]',
                        '[aria-label*="Quest" i][role="link"]',
                        '[aria-label*="Задания" i][role="link"]',
                        '[aria-label*="Quests" i][role="link"]',
                    ];
                    let questLink = null;
                    for (const s of selectors) { questLink = document.querySelector(s); if (questLink) break; }
                    if (!questLink) return false;

                    let anchor = questLink;
                    let wrapper = questLink.parentElement;
                    while (wrapper && wrapper !== document.body) {
                        const siblings = wrapper.parentElement
                            ? Array.from(wrapper.parentElement.children).filter(el => el !== wrapper && el.querySelector?.('a[href], [role="link"]'))
                            : [];
                        if (siblings.length > 0) break;
                        anchor = wrapper;
                        wrapper = wrapper.parentElement;
                    }

                    const insertParent = anchor.parentElement;
                    if (!insertParent) return false;

                    const btn = document.createElement(anchor.tagName.toLowerCase() === 'li' ? 'li' : 'div');
                    btn.className = 'fq-nav-btn';
                    btn.setAttribute('role', 'button');
                    btn.setAttribute('tabindex', '0');
                    btn.innerHTML = `
                        <span class="fq-nav-ico">${ICONS.BOLT}</span>
                        <span class="fq-nav-label">FQuest</span>
                    `;
                    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleWindow(); });
                    btn.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleWindow(); }
                    });

                    anchor.insertAdjacentElement('afterend', btn);
                    this.navBtn = btn;
                    return true;
                };

                tryMount();
                this._navWatcher = setInterval(() => {
                    if (!this._pluginEnabled) { clearInterval(this._navWatcher); return; }
                    tryMount();
                }, 800);
            },

            /* ——— WINDOW ——— */
            toggleWindow() {
                if (ctx._stopped) {
                    this.openWindow();
                    return;
                }
                this.open ? this.closeWindow() : this.openWindow();
            },

            openWindow() {
                if (this.root && this.root.style.display === 'flex' && !ctx._stopped) return;

                // Возврат после СТОП
                if (ctx._stopped) {
                    ctx._stopped = false;
                    RUNTIME.running = true;
                    RUNTIME.cleanups = new Set();
                    ctx.Tasks?.skipped?.clear?.();

                    if (this.root) {
                        this.root.style.display = 'flex';
                        this.open = true;
                        this.navBtn?.classList.add('active');
                        const old = this.root.querySelector('#fquest-splash');
                        if (old) old.remove();
                        this._mountSplash();
                        setTimeout(() => this._bootstrap(), 1800);
                        return;
                    }
                }

                if (this.root) {
                    this.root.style.display = 'flex';
                    this.open = true;
                    this.navBtn?.classList.add('active');
                    const old = this.root.querySelector('#fquest-splash');
                    if (old) old.remove();
                    this._mountSplash();
                    setTimeout(() => {
                        const s = this.root?.querySelector('#fquest-splash');
                        if (s) s.remove();
                    }, 1800);
                    return;
                }

                const root = document.createElement('div');
                root.id = 'fquest-ui';
                root.innerHTML = `
                    <div id="fquest-head">
                        <span id="fquest-title">${ICONS.BOLT} ${CONFIG.NAME}
                            <a class="dev-credit" data-url="https://github.com/venyv" role="link" tabindex="0">by venyv</a>
                            <span class="fq-ver">${CONFIG.VERSION}</span>
                        </span>
                        <div id="fquest-controls">
                            <span class="ctrl-btn ctrl-stop" id="fquest-stop" title="Остановить">${ICONS.STOP}</span>
                            <span class="ctrl-btn" id="fquest-close" title="Скрыть">${ICONS.CLOSE}</span>
                        </div>
                    </div>

                    <div id="fquest-layout">
                        <aside class="fq-sidebar" id="fquest-sidebar">
                            ${TABS.map((t, i) => `
                                <button type="button" class="fq-tab ${t.id === this._activeTab ? 'active' : ''}"
                                        data-tab="${t.id}" style="animation-delay:${i * 40}ms">
                                    ${t.icon}
                                    <span class="fq-tab-label">${t.label}</span>
                                </button>
                            `).join('')}
                            <div class="fq-sidebar-footer">
                                <a class="dev-credit" data-url="https://github.com/venyv" role="link" tabindex="0">by venyv</a>
                                · <span>${CONFIG.VERSION}</span>
                            </div>
                        </aside>

                        <section id="fquest-content">
                            <div id="fquest-body"></div>
                            <div id="fquest-logs"></div>
                        </section>
                    </div>
                `;
                document.body.appendChild(root);
                this.root = root;
                this.open = true;
                this.navBtn?.classList.add('active');

                this._mountSplash();
                this._bindDrag(root.querySelector('#fquest-head'));

                root.querySelector('#fquest-sidebar').addEventListener('click', (e) => {
                    const btn = e.target.closest('.fq-tab');
                    if (!btn) return;
                    this.switchTab(btn.dataset.tab);
                });

                root.querySelectorAll('.dev-credit').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const url = el.getAttribute('data-url') || 'https://github.com/venyv';
                        try {
                            if (window.DiscordNative?.shell?.openExternal) return window.DiscordNative.shell.openExternal(url);
                            if (api?.Native?.openExternal) return api.Native.openExternal(url);
                        } catch (_) {}
                        window.open(url, '_blank', 'noopener,noreferrer');
                    });
                });

                root.querySelector('#fquest-stop').onclick = () => this.stopScript();
                root.querySelector('#fquest-close').onclick = () => this.closeWindow();

                setTimeout(() => this._bootstrap(), 1800);
            },

            _mountSplash() {
                if (!this.root) return;
                const old = this.root.querySelector('#fquest-splash');
                if (old) old.remove();
                const splash = document.createElement('div');
                splash.id = 'fquest-splash';
                splash.innerHTML = `
                    <div class="fq-splash-logo">FQUEST</div>
                    <div class="fq-splash-sub">by venyv · ${CONFIG.VERSION}</div>
                `;
                this.root.appendChild(splash);
                setTimeout(() => { if (splash.parentElement) splash.remove(); }, 1800);
            },

            async _bootstrap() {
                if (ctx._bootstrapped) {
                    this.switchTab(this._activeTab);
                    return;
                }
                ctx._bootstrapped = true;

                ctx.Logger.init(this.root);
                if (!ctx.loadModules()) {
                    ctx.Logger.log('[Система] Не удалось загрузить модули Discord.', 'err');
                    return;
                }
                this.switchTab(this._activeTab);

                ctx.runLoop().catch((e) => {
                    console.error('[FQuest Fatal]', e);
                    try { ctx.Logger.log(`[Система] ФАТАЛЬНАЯ ОШИБКА: ${e?.message ?? e}`, 'err'); } catch (_) {}
                });
            },

            switchTab(id) {
                if (!tabModules[id]) return;
                this._activeTab = id;
                RUNTIME.activeTab = id;
                ctx.Storage?.set('activeTab', id);
                ctx.RPC?.update(id);

                const root = this.root;
                if (!root) return;
                root.querySelectorAll('.fq-tab').forEach(el => {
                    el.classList.toggle('active', el.dataset.tab === id);
                });

                const body = root.querySelector('#fquest-body');
                const logs = root.querySelector('#fquest-logs');
                logs.classList.toggle('hidden', id !== 'quests');

                body.innerHTML = '';
                tabModules[id].render(body);
                body.firstElementChild?.classList.add('fq-tab-enter');
            },

            applyTheme(theme, accent) {
                document.documentElement.style.setProperty('--fq-accent', accent || '#8B5CF6');
                document.body.classList.toggle('fq-theme-light', theme === 'light');
                document.body.classList.toggle('fq-theme-dark', theme !== 'light');
            },

            closeWindow() {
                if (!this.root) return;
                this.root.style.display = 'none';
                this.open = false;
                this.navBtn?.classList.remove('active');
            },

            stopScript() {
                if (ctx._stopped) return;
                ctx._stopped = true;
                RUNTIME.running = false;
                for (const fn of RUNTIME.cleanups) { try { fn(); } catch (_) {} }
                RUNTIME.cleanups.clear();
                ctx.Patcher?.clean();
                ctx.RPC?.disable();
                if (ctx.Logger?.tickerId) { clearInterval(ctx.Logger.tickerId); ctx.Logger.tickerId = null; }
                ctx.Logger.log('[Система] Скрипт остановлен. Нажмите FQuest для перезапуска.', 'warn');
                if (this.root) this.root.style.display = 'none';
                this.open = false;
                this.navBtn?.classList.remove('active');
            },

            _bindDrag(head) {
                head.addEventListener('mousedown', (e) => {
                    if (e.target.closest('.ctrl-btn') || e.target.closest('.dev-credit')) return;
                    head.classList.add('dragging');
                    const startX = e.clientX, startY = e.clientY;
                    const rect = this.root.getBoundingClientRect();
                    const initL = rect.left, initT = rect.top;
                    this.root.style.left = initL + 'px';
                    this.root.style.top = initT + 'px';
                    this.root.style.right = 'auto';
                    e.preventDefault();
                    const mm = (ev) => {
                        this.root.style.left = Math.max(0, Math.min(initL + ev.clientX - startX, innerWidth - this.root.offsetWidth)) + 'px';
                        this.root.style.top  = Math.max(0, Math.min(initT + ev.clientY - startY, innerHeight - 50)) + 'px';
                    };
                    const mu = () => {
                        head.classList.remove('dragging');
                        document.removeEventListener('mousemove', mm);
                        document.removeEventListener('mouseup', mu);
                    };
                    document.addEventListener('mousemove', mm);
                    document.addEventListener('mouseup', mu);
                });
            },
        };
    },
};