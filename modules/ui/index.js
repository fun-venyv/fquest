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

           mountSidebarButton() {
            this._pluginEnabled = true;

            const tryMount = () => {
                if (!this._pluginEnabled) return true;
                if (this.navBtn && document.body.contains(this.navBtn)) return true;

                const existing = document.querySelector('.fq-nav-btn');
                if (existing) { this.navBtn = existing; return true; }

                const questLink =
                    document.querySelector('a[href="/quest-home"]')
                    || document.querySelector('a[href="/quests"]');

                if (!questLink) return false;

                const isInNavSidebar = !!questLink.closest('[class*="privateChannels"], [class*="guilds"], [class*="sidebar"], nav');
                if (!isInNavSidebar) return false;

                const rect = questLink.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return false;

                let anchor = questLink;
                let wrapper = questLink.parentElement;
                while (wrapper && wrapper !== document.body) {
                    const siblings = wrapper.parentElement
                        ? Array.from(wrapper.parentElement.children).filter(el =>
                            el !== wrapper && el.querySelector?.('a[href], [role="link"]'))
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

            toggleWindow() {
                if (ctx._stopped) {
                    this.openWindow();
                    return;
                }
                this.open ? this.closeWindow() : this.openWindow();
            },

            openWindow() {
                if (this.root && this.root.style.display === 'flex' && !ctx._stopped) return;

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
                            <a class="dev-credit" data-url="https://funpay.com/users/15985830/" role="link" tabindex="0">by venyv</a>
                            <span class="fq-ver">${CONFIG.VERSION}</span>
                        </span>
                        <div id="fquest-controls">
                            <span class="ctrl-btn ctrl-stop" id="fquest-stop" title="Остановить">${ICONS.STOP}</span>
                            <span class="ctrl-btn" id="fquest-close" title="Скрыть">${ICONS.CLOSE}</span>
                        </div>
                    </div>

                    <div id="fquest-layout">
                        <aside class="fq-sidebar" id="fquest-sidebar">
                            ${TABS.map((t, i) => {
                                const showBadge = (t.id === 'updates' && RUNTIME.badges?.updates)
                                            || (t.id === 'quests'  && RUNTIME.badges?.quests);
                                return `
                                    <button type="button" class="fq-tab ${t.id === this._activeTab ? 'active' : ''}"
                                            data-tab="${t.id}" style="animation-delay:${i * 40}ms">
                                        ${t.icon}
                                        <span class="fq-tab-label">${t.label}</span>
                                        ${showBadge ? '<span class="fq-tab-badge"></span>' : ''}
                                    </button>
                                `;
                            }).join('')}
                            <div class="fq-sidebar-footer">
                                <a class="dev-credit" data-url="https://funpay.com/users/15985830/" role="link" tabindex="0">by venyv</a>
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
                    
                if (id === 'updates' && RUNTIME.badges?.updates) {
                    RUNTIME.badges.updates = false;
                    ctx.Storage.set('lastSeenUpdate', Date.now());
                    ctx.Storage.set('lastSeenVersion', CONFIG.VERSION);
                    this.setBadge('updates', false);
                }
                if (id === 'quests' && RUNTIME.badges?.quests) {
                    RUNTIME.badges.quests = false;
                    ctx.Storage.set('lastSeenQuests', Date.now());
                    this.setBadge('quests', false);
                }
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

                if (logs) logs.style.display = (id === 'quests') ? 'block' : 'none';

                const pickerForm = body.querySelector('#fquest-picker-form');
                if (pickerForm && id !== 'quests') {
                    if (!this._savedPicker) {
                        this._savedPicker = document.createElement('div');
                        this._savedPicker.style.display = 'none';
                        this._savedPicker.id = 'fquest-picker-saved';
                        document.body.appendChild(this._savedPicker);
                    }
                    this._savedPicker.appendChild(pickerForm);
                }

                body.innerHTML = '';

                if (id === 'quests') {
                    if (this._savedPicker && this._savedPicker.children.length) {
                        while (this._savedPicker.firstChild) {
                            body.appendChild(this._savedPicker.firstChild);
                        }
                    }
                    else if (ctx.Logger.tasks.size > 0) {
                        ctx.Logger.render();
                    }
                    else if (ctx._runLoopActive) {
                        body.innerHTML = `<div class="fq-empty">Ожидание задач...</div>`;
                    }
                    else if (typeof ctx.startQuestLoop === 'function') {
                        ctx.startQuestLoop();
                    } else {
                        body.innerHTML = `<div class="fq-empty">Ожидание задач...</div>`;
                    }
                } else {
                    tabModules[id].render(body);
                }

                if (!body.children.length) {
                    body.innerHTML = `<div class="fq-empty">Ожидание задач...</div>`;
                }

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
            /**
             * @param {string} label 
             * @param {string} defaultValue 
             * @returns {Promise<string|null>}
             */

            prompt(label, defaultValue = '') {
                return new Promise((resolve) => {
                    const ov = document.createElement('div');
                    ov.className = 'fq-modal-overlay';
                    ov.innerHTML = `
                        <div class="fq-modal-box">
                            <div class="fq-modal-head">${ctx.esc(label)}</div>
                            <div class="fq-modal-body">
                                <input type="text" class="fq-modal-input" value="${ctx.esc(defaultValue)}">
                            </div>
                            <div class="fq-modal-actions">
                                <button type="button" class="quest-pick-btn deselect" data-act="cancel">Отмена</button>
                                <button type="button" class="quest-pick-btn start" data-act="ok">ОК</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(ov);

                    const input = ov.querySelector('.fq-modal-input');
                    input.focus();
                    input.select();

                    const finish = (val) => {
                        document.removeEventListener('keydown', onKey);
                        ov.remove();
                        resolve(val);
                    };

                    const onKey = (e) => {
                        if (e.key === 'Escape') finish(null);
                        else if (e.key === 'Enter') finish(input.value.trim() || null);
                    };
                    document.addEventListener('keydown', onKey);

                    ov.querySelector('[data-act="cancel"]').addEventListener('click', () => finish(null));
                    ov.querySelector('[data-act="ok"]').addEventListener('click', () => finish(input.value.trim() || null));
                    ov.addEventListener('mousedown', (e) => { if (e.target === ov) finish(null); });
                });
            },

            /**
             * @returns {Promise<boolean>}
             */
            confirm(message) {
                return new Promise((resolve) => {
                    const ov = document.createElement('div');
                    ov.className = 'fq-modal-overlay';
                    ov.innerHTML = `
                        <div class="fq-modal-box">
                            <div class="fq-modal-head">Подтверждение</div>
                            <div class="fq-modal-body">${ctx.esc(message)}</div>
                            <div class="fq-modal-actions">
                                <button type="button" class="quest-pick-btn deselect" data-act="cancel">Отмена</button>
                                <button type="button" class="quest-pick-btn start" data-act="ok">Подтвердить</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(ov);

                    const finish = (val) => {
                        document.removeEventListener('keydown', onKey);
                        ov.remove();
                        resolve(val);
                    };

                    const onKey = (e) => {
                        if (e.key === 'Escape') finish(false);
                        else if (e.key === 'Enter') finish(true);
                    };
                    document.addEventListener('keydown', onKey);

                    ov.querySelector('[data-act="cancel"]').addEventListener('click', () => finish(false));
                    ov.querySelector('[data-act="ok"]').addEventListener('click', () => finish(true));
                    ov.addEventListener('mousedown', (e) => { if (e.target === ov) finish(false); });
                });
            },
            /**
             * @param {'updates'|'quests'} tabId
             * @param {boolean} on
             */
            setBadge(tabId, on) {
                if (!RUNTIME.badges) RUNTIME.badges = { updates: false, quests: false };
                RUNTIME.badges[tabId] = !!on;

                const root = this.root;
                if (!root) return;
                const btn = root.querySelector(`.fq-tab[data-tab="${tabId}"]`);
                if (!btn) return;

                const existing = btn.querySelector('.fq-tab-badge');
                if (on && !existing) {
                    const badge = document.createElement('span');
                    badge.className = 'fq-tab-badge';
                    btn.appendChild(badge);
                } else if (!on && existing) {
                    existing.remove();
                }
            },
        };
    },
};