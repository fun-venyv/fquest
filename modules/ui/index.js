/* FQuest · modules/ui/index.js
 * Корневой UI — окно, сайдбар, вкладки, авторизация, профиль */

module.exports = {
    createUI(ctx) {
        const { RUNTIME, ICONS, CONFIG, api, platform } = ctx;

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

            // === Auth state ===
            _authLocked: false,        // если true — UI заблокирован до ввода ключа
            _authResolved: false,      // авторизация пройдена (успех или отказ)

            // ============================================================
            //  NAV BUTTON
            // ============================================================
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

            // ============================================================
            //  WINDOW
            // ============================================================
            toggleWindow() {
                // Блокируем закрытие окна, пока не введён ключ
                if (this._authLocked && this.open) {
                    platform?.UI?.showToast?.('Сначала активируйте FQuest', { type: 'warn', timeout: 2000 });
                    return;
                }
                if (ctx._stopped) {
                    this.openWindow();
                    return;
                }
                this.open ? this.closeWindow() : this.openWindow();
            },

            openWindow() {
                if (this.root && this.root.style.display === 'flex' && !ctx._stopped) return;

                const afterShow = () => {
                    // Перезапускаем JS-анимацию темы
                    try {
                        if (ctx.Themes) {
                            setTimeout(() => ctx.Themes.resume(), 100);
                        }
                    } catch (_) {}
                };

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
                        if (this._readyForBootstrap) {
                            setTimeout(() => this._bootstrap(), 1800);
                        }
                        afterShow();
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
                    afterShow();
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
                                <div id="fq-user-card" class="fq-user-card">
                                    <div class="fq-user-avatar" id="fq-user-avatar"></div>
                                    <div class="fq-user-info">
                                        <div class="fq-user-name" id="fq-user-name">—</div>
                                        <div class="fq-user-key" id="fq-user-key" title="Клик — скопировать">—</div>
                                    </div>
                                    <button class="fq-user-logout" id="fq-user-logout" title="Выйти">⏻</button>
                                </div>
                                <div class="fq-sidebar-meta">
                                    <a class="dev-credit" data-url="https://funpay.com/users/15985830/" role="link" tabindex="0">by venyv</a>
                                    · <span>${CONFIG.VERSION}</span>
                                </div>
                            </div>
                        </aside>

                        <section id="fquest-content">
                            <div id="fquest-body"></div>
                            <div id="fquest-logs"></div>
                        </section>
                    </div>

                    <div id="fquest-modal-host"></div>
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
                    // Блок кликов по вкладкам, пока не авторизован
                    if (this._authLocked) return;
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
                root.querySelector('#fquest-close').onclick = () => {
                    if (this._authLocked) {
                        platform?.UI?.showToast?.('Сначала активируйте FQuest', { type: 'warn', timeout: 2000 });
                        return;
                    }
                    this.closeWindow();
                };

                this.renderUserCard();

                if (this._readyForBootstrap) {
                    setTimeout(() => this._bootstrap(), 1800);
                }
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

            // ============================================================
            //  MODAL HOST (внутри окна)
            // ============================================================
            _getModalHost() {
                if (this.root) {
                    let host = this.root.querySelector('#fquest-modal-host');
                    if (!host) {
                        host = document.createElement('div');
                        host.id = 'fquest-modal-host';
                        this.root.appendChild(host);
                    }
                    return host;
                }
                let host = document.getElementById('fquest-modal-host-global');
                if (!host) {
                    host = document.createElement('div');
                    host.id = 'fquest-modal-host-global';
                    document.body.appendChild(host);
                }
                return host;
            },

            async _openModal(html) {
                if (!this.root) {
                    const start = Date.now();
                    while (!this.root && Date.now() - start < 3000) {
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
                const host = this._getModalHost();
                const ov = document.createElement('div');
                ov.className = 'fq-modal-overlay';
                ov.innerHTML = html;
                host.appendChild(ov);
                return ov;
            },

            // ============================================================
            //  AUTH LOCK
            // ============================================================
            /**
             * Блокирует UI окна на время авторизации.
             * Шапка (drag) остаётся активной.
             */
            _setAuthLock(on) {
                this._authLocked = !!on;
                if (!this.root) return;
                const layout = this.root.querySelector('#fquest-layout');
                if (!layout) return;
                if (on) {
                    layout.classList.add('fq-auth-locked');
                } else {
                    layout.classList.remove('fq-auth-locked');
                }
            },

            // ============================================================
            //  BOOTSTRAP
            // ============================================================
            async _bootstrap() {
                if (ctx._bootstrapped) {
                    this.switchTab(this._activeTab);
                    this.renderUserCard();
                    return;
                }
                ctx._bootstrapped = true;

                // Снимаем блокировку после успешной авторизации
                this._setAuthLock(false);

                ctx.Logger.init(this.root);
                if (!ctx.loadModules()) {
                    ctx.Logger.log('[Система] Не удалось загрузить модули Discord.', 'err');
                    return;
                }
                this.switchTab(this._activeTab);
                this.renderUserCard();

                ctx.runLoop().catch((e) => {
                    console.error('[FQuest Fatal]', e);
                    try { ctx.Logger.log(`[Система] ФАТАЛЬНАЯ ОШИБКА: ${e?.message ?? e}`, 'err'); } catch (_) {}
                });
            },

            // ============================================================
            //  TABS
            // ============================================================
            switchTab(id) {
                if (!tabModules[id]) return;
                if (this._authLocked) return;
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

            // ============================================================
            //  THEME
            // ============================================================
         applyTheme(theme, accent) {
                // 1. Очищаем старую JS-тему
                if (ctx.Themes) {
                    try { ctx.Themes.clear(); } catch (_) {}
                }

                // 2. Снимаем все классы тем
                document.body.classList.remove(
                    'fq-theme-dark', 'fq-theme-light',
                    'fq-theme-sakura', 'fq-theme-cyberpunk',
                    'fq-theme-midnight', 'fq-theme-starfield', 'fq-theme-lofi'
                );

                // 3. Сбрасываем inline-стили
                const root = document.getElementById('fquest-ui');
                if (root) {
                    root.style.removeProperty('background-image');
                    root.style.removeProperty('background');
                    root.style.removeProperty('box-shadow');
                    root.style.removeProperty('filter');
                    root.style.removeProperty('mix-blend-mode');
                    const head = root.querySelector('#fquest-head');
                    if (head) {
                        head.style.removeProperty('transform');
                        head.style.removeProperty('text-shadow');
                    }
                }

                // 4. Валидация
                const VALID_THEMES = [
                    'dark', 'light', 'sakura',
                    'cyberpunk', 'midnight', 'starfield', 'lofi',
                ];
                if (!VALID_THEMES.includes(theme)) theme = 'dark';

                // 5. Добавляем класс новой темы СРАЗУ (важно!)
                document.body.classList.add('fq-theme-' + theme);

                // 6. Акцент — устанавливаем ПОСЛЕ класса
                document.documentElement.style.setProperty('--fq-accent', accent || '#8B5CF6');

                // 7. Анимация переключения
                if (root) {
                    root.classList.add('theme-switching');
                    setTimeout(() => root.classList.remove('theme-switching'), 500);
                }

                // 8. Запускаем JS-анимацию
                if (ctx.Themes) {
                    try { ctx.Themes.apply(theme); } catch (_) {}
                }
            },
            // ============================================================
            //  WINDOW CONTROLS
            // ============================================================
            closeWindow() {
                if (!this.root) return;
                if (this._authLocked) return;
                this.root.style.display = 'none';
                this.open = false;
                this.navBtn?.classList.remove('active');

                // === Ставим JS-анимации на паузу ===
                try { ctx.Themes?.pause?.(); } catch (_) {}
            },

            stopScript() {
                if (ctx._stopped) return;
                if (this._authLocked) {
                    platform?.UI?.showToast?.('Сначала активируйте FQuest', { type: 'warn', timeout: 2000 });
                    return;
                }
                ctx._stopped = true;
                RUNTIME.running = false;
                for (const fn of RUNTIME.cleanups) { try { fn(); } catch (_) {} }
                RUNTIME.cleanups.clear();
                ctx.Patcher?.clean();
                ctx.RPC?.disable();
                if (ctx.Logger?.tickerId) { clearInterval(ctx.Logger.tickerId); ctx.Logger.tickerId = null; }
                ctx.Themes?.clear?.();
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

            // ============================================================
            //  MODALS (внутри окна, без закрытия по клику на фон)
            // ============================================================

            // Универсальный prompt (используется вне auth-flow, можно закрывать по фону)
            async prompt(label, defaultValue = '') {
                const ov = await this._openModal(`
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
                `);

                return new Promise((resolve) => {
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

            async confirm(message) {
                const ov = await this._openModal(`
                    <div class="fq-modal-box">
                        <div class="fq-modal-head">Подтверждение</div>
                        <div class="fq-modal-body">${ctx.esc(message)}</div>
                        <div class="fq-modal-actions">
                            <button type="button" class="quest-pick-btn deselect" data-act="cancel">Отмена</button>
                            <button type="button" class="quest-pick-btn start" data-act="ok">Подтвердить</button>
                        </div>
                    </div>
                `);

                return new Promise((resolve) => {
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

            // infoModal — блокирующая, НЕ закрывается по фону и Escape
            async infoModal(message, title = 'Информация') {
                const ov = await this._openModal(`
                    <div class="fq-modal-box">
                        <div class="fq-modal-head">${ctx.esc(title)}</div>
                        <div class="fq-modal-body">${ctx.esc(message)}</div>
                        <div class="fq-modal-actions">
                            <button type="button" class="quest-pick-btn start" data-act="ok">ОК</button>
                        </div>
                    </div>
                `);

                return new Promise((resolve) => {
                    const finish = () => {
                        document.removeEventListener('keydown', onKey);
                        ov.remove();
                        resolve();
                    };
                    const onKey = (e) => { if (e.key === 'Enter') finish(); };
                    document.addEventListener('keydown', onKey);
                    ov.querySelector('[data-act="ok"]').addEventListener('click', finish);
                    // НЕ закрываем по клику на фон
                });
            },

            // ============================================================
            //  AUTH FLOW
            // ============================================================
            async runAuthFlow() {
    const { Profile, Auth } = ctx;

    // Ставим блокировку
    this._setAuthLock(true);

    // Ждём появления окна
    const start = Date.now();
    while (!this.root && Date.now() - start < 3000) {
        await new Promise(r => setTimeout(r, 50));
    }

    // === 1. Всегда получаем реальный Discord ID ===
    const realUser = Profile.getDiscordUser();
    if (!realUser) {
        platform?.Logger?.warn?.('[FQuest] Не удалось получить Discord-пользователя');
        await this.infoModal('Не удалось получить данные пользователя Discord. Перезапустите Discord.', 'Ошибка');
        return false;
    }

    platform?.Logger?.info?.(`[FQuest] Реальный Discord ID: ${realUser.id}`);

    // === 2. Проверяем сохранённый профиль ===
    let profile = Profile.load();
    if (profile) {
        // 2a. Профиль принадлежит ДРУГОМУ пользователю — сбрасываем
        if (profile.userId !== realUser.id) {
            platform?.Logger?.warn?.(
                `[FQuest] Профиль принадлежит другому пользователю (${profile.userId} ≠ ${realUser.id}). Сброс.`
            );
            Profile.clear();
            await this.infoModal(
                'Профиль принадлежит другому Discord-аккаунту и был сброшен. Введите свой ключ.',
                'Профиль сброшен'
            );
            profile = null;
        } else {
            // 2b. Профиль принадлежит текущему пользователю — проверяем на сервере
            platform?.Logger?.info?.('[FQuest] Проверяю профиль на сервере...');
            const check = await Auth.verify(realUser.id, profile.key);
            if (check.ok) {
                platform?.Logger?.info?.('[FQuest] Профиль подтверждён');
                Profile.syncDiscord();
                this._authResolved = true;
                return true;
            }
            platform?.Logger?.warn?.('[FQuest] Профиль отклонён:', check.reason);
            Profile.clear();
        }
    }

    // === 3. Просим ключ ===
    while (true) {
        const key = await this.promptKey();

        if (key === null) {
            platform?.UI?.showToast?.('FQuest заблокирован до ввода ключа', { type: 'error', timeout: 3000 });
            await this.infoModal(
                'FQuest не активирован. Без ключа продукта работа невозможна. Нажмите ОК, чтобы ввести ключ заново.',
                'Активация требуется'
            );
            continue;
        }

        // ⚠️ Используем realUser.id из UserStore — не из localStorage
        const reg = await Auth.register(realUser.id, key);
        if (reg.ok) {
            Profile.save({
                userId: realUser.id,     // гарантированно актуальный
                key: Auth.normalize(key),
                username: realUser.globalName || realUser.username,
                avatar: realUser.avatarUrl,
            });
            Profile.syncDiscord();
            platform?.UI?.showToast?.('FQuest: ключ принят', { type: 'success', timeout: 2500 });
            this._authResolved = true;
            return true;
        }

        await this.infoModal(Auth.reasonText(reg.reason), 'Ключ отклонён');
    }
},

            // Модалка ввода ключа — блокирующая:
            // НЕ закрывается по фону, только через Enter (успех) или Ctrl+W/перезапуск.
            // Кнопка "Отмена" вызывает infoModal с напоминанием.
            async promptKey() {
                const ov = await this._openModal(`
                    <div class="fq-modal-box">
                        <div class="fq-modal-head">Активация FQuest</div>
                        <div class="fq-modal-body">
                            <div style="margin-bottom:12px;color:var(--fq-muted);font-size:12px;line-height:1.5;">
                                Введите ключ продукта. Формат: <b style="color:var(--fq-accent);">XXXX-XXXX-XXXX-XXXX</b><br>
                            </div>
                            <input type="text" class="fq-modal-input" id="fq-key-input"
                                   placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false"
                                   maxlength="19">
                        </div>
                        <div class="fq-modal-actions">
                            <button type="button" class="quest-pick-btn deselect" data-act="cancel">Отмена</button>
                            <button type="button" class="quest-pick-btn start" data-act="ok">Активировать</button>
                        </div>
                    </div>
                `);

                return new Promise((resolve) => {
                    const input = ov.querySelector('#fq-key-input');
                    input.focus();

                    input.addEventListener('input', (e) => {
                        let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        v = v.slice(0, 16);
                        v = v.replace(/(.{4})/g, '$1-').replace(/-$/, '');
                        e.target.value = v;
                    });

                    const finish = (val) => {
                        document.removeEventListener('keydown', onKey);
                        ov.remove();
                        resolve(val);
                    };
                    const submit = () => {
                        const v = input.value.trim();
                        if (!v) { input.focus(); return; }
                        finish(v);
                    };
                    const onKey = (e) => {
                        if (e.key === 'Enter') submit();
                        // Escape НЕ обрабатываем — окно не закрывается
                    };
                    document.addEventListener('keydown', onKey);
                    ov.querySelector('[data-act="cancel"]').addEventListener('click', () => finish(null));
                    ov.querySelector('[data-act="ok"]').addEventListener('click', submit);
                    // Клик по фону НЕ закрывает
                });
            },

            // ============================================================
            //  USER CARD (footer)
            // ============================================================
            renderUserCard() {
                if (!this.root || !ctx.Profile) return;
                const { Profile } = ctx;

                let p = null;
                try { p = Profile.load(); } catch (_) {}

                // Fallback: если профиль в новом формате — попробуем ещё раз через платформенный Data
                if (!p) {
                    try {
                        const raw = platform?.Data?.load?.('fq_user_profile');
                        if (raw && typeof raw === 'object' && raw.userId && raw.key) {
                            p = raw;
                        } else if (typeof raw === 'string') {
                            const parsed = JSON.parse(raw);
                            if (parsed?.userId && parsed?.key) p = parsed;
                        }
                    } catch (_) {}
                }

                const u = Profile.getDiscordUser();

                const avatarEl = this.root.querySelector('#fq-user-avatar');
                const nameEl   = this.root.querySelector('#fq-user-name');
                const keyEl    = this.root.querySelector('#fq-user-key');
                const logoutEl = this.root.querySelector('#fq-user-logout');

                // AVATAR
                if (avatarEl) {
                    if (u?.avatarUrl) {
                        avatarEl.style.backgroundImage = `url(${u.avatarUrl})`;
                    } else {
                        avatarEl.style.backgroundImage = '';
                    }
                }

                // NAME
                if (nameEl) {
                    const name =
                        p?.username ||
                        u?.globalName ||
                        u?.username ||
                        'Гость';
                    nameEl.textContent = name;
                }

                // KEY
                if (keyEl) {
                    const rawKey = p?.key || '';
                    keyEl.textContent = rawKey ? Profile.maskKey(rawKey) : '— нет ключа —';
                    keyEl.title = rawKey ? `Ключ: ${rawKey} (клик — скопировать)` : 'Ключ не найден';
                    keyEl.onclick = () => {
                        if (!rawKey) {
                            platform?.UI?.showToast?.('Ключ не найден в профиле', { type: 'warn', timeout: 2000 });
                            return;
                        }
                        try {
                            navigator.clipboard.writeText(rawKey);
                            platform?.UI?.showToast?.('Ключ скопирован', { type: 'success', timeout: 1500 });
                        } catch (_) {
                            platform?.UI?.showToast?.('Не удалось скопировать', { type: 'error', timeout: 2000 });
                        }
                    };
                }

                // LOGOUT
                if (logoutEl) {
                    logoutEl.onclick = async () => {
                        if (this._authLocked) return;
                        const ok = await this.confirm('Выйти из аккаунта FQuest? Придётся ввести ключ заново.');
                        if (!ok) return;
                        Profile.clear();
                        try { platform?.Data?.delete?.('fq_user_profile'); } catch (_) {}
                        location.reload();
                    };
                }
            },

            // ============================================================
            //  BADGE
            // ============================================================
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