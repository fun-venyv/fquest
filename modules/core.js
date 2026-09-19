module.exports = function FQuestFactory({ meta, api, modules, css, manifest }) {
    // ---------- CONFIG ----------
    const CONFIG = {
        NAME: 'FQuest',
        VERSION: manifest.version,
        THEME: '#8B5CF6',
        SUCCESS: '#34D399',
        WARN: '#FBBF24',
        ERR: '#F87171',
        MAX_LOG_ITEMS: 80,
        HIDE_ACTIVITY: false,
    };

    const SYS = Object.freeze({
        MAX_TIME: 25 * 60 * 1000,
        MAX_TASK_FAILURES: 5,
        MAX_RETRIES: 3,
        IS_DESKTOP: typeof window.DiscordNative !== 'undefined',
    });

    const RUNTIME = {
        running: true,
        cleanups: new Set(),
        autoEnroll: true,
        autoClaim: false,
        playSound: false,
        randomDelay: false,
        theme: 'dark',
        accent: '#8B5CF6',
        richPresence: false,
        activeTab: 'quests',
        notifyOnFinish: true,
        notifyOnlyFinal: false,
        notifyInFocus: false,
    };

    const ICONS = {
        BOLT: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.29-.62L14.5 3h1l-1 7h3.5c.58 0 .57.32.29.62L11 21z"/></svg>`,
        OPT: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5zm7.43-2.53a7.66 7.66 0 0 0 0-1.94l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.31 7.31 0 0 0-1.68-.97l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.49.42l-.38 2.65a7.31 7.31 0 0 0-1.68.97l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L4.57 11a7.66 7.66 0 0 0 0 1.94L2.46 14.6a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1a7.31 7.31 0 0 0 1.68.97l.38 2.65A.5.5 0 0 0 10 22h4a.5.5 0 0 0 .49-.42l.38-2.65a7.31 7.31 0 0 0 1.68-.97l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64z"/></svg>`,
        CHECK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        CHART: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        DOWNLOAD: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        INFO: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        STOP: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`,
        CLOSE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
        VIDEO: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`,
        GAME: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM11 13H8v3H6v-3H3v-2h3V8h2v3h3v2z"/></svg>`,
        STREAM: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
        ACTIVITY: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5z"/></svg>`,
        CLOCK: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
    };

    const CONST = Object.freeze({
        ID: '1412491570820812933',
        EVT: Object.freeze({
            HEARTBEAT: 'QUESTS_SEND_HEARTBEAT_SUCCESS',
            GAME: 'RUNNING_GAMES_CHANGE',
            RPC: 'LOCAL_ACTIVITY_UPDATE',
        }),
    });

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const notExpired = q => { const e = new Date(q.config?.expiresAt ?? 0).getTime(); return Number.isNaN(e) || e > Date.now(); };

    // ---------- ctx ----------
    const ctx = {
        CONFIG, SYS, RUNTIME, ICONS, CONST,
        esc, sleep, rnd, notExpired,
        api, modules, manifest,
        Mods: {},
        Logger: null,
        Traffic: null,
        Tasks: null,
        Patcher: null,
        Consent: null,
        Sound: null,
        ErrorHandler: null,
        UI: null,
        Storage: null,
        Profiles: null,
        History: null,
        RPC: null,
        _stopped: false,
        _bootstrapped: false,
        _hotkeyHandler: null,
        styleEl: null,
    };

    // ---------- init modules (порядок важен) ----------
    ctx.Storage = modules('storage.js').createStorage(ctx);
    ctx.ErrorHandler = modules('traffic.js').createErrorHandler(ctx);
    ctx.Traffic = modules('traffic.js').createTraffic(ctx);
    ctx.Patcher = modules('patcher.js').createPatcher(ctx);
    ctx.Consent = modules('consent.js').createConsent(ctx);
    ctx.Sound = modules('consent.js').createSound(ctx);
    ctx.History = modules('history.js').createHistory(ctx);
    ctx.Profiles = modules('profiles.js').createProfiles(ctx);
    ctx.RPC = modules('rpc.js').createRPC(ctx);
    ctx.Tasks = modules('tasks.js').createTasks(ctx);
    ctx.Logger = modules('logger.js').createLogger(ctx);
    ctx.UI = modules('ui/index.js').createUI(ctx);

    // ---------- loadModules (webpack Discord) ----------
    ctx.loadModules = function () {
        try {
            const findStore = (name) => {
                for (const m of Object.values(webpackChunkdiscord_app.c || {})) {
                    try {
                        const exp = m?.exports;
                        if (!exp || typeof exp !== 'object') continue;
                        for (const key of Object.keys(exp)) {
                            const prop = exp[key];
                            if (prop && typeof prop === 'object' && prop.__proto__?.constructor?.displayName === name) return prop;
                        }
                    } catch (_) {}
                }
            };

            let req;
            webpackChunkdiscord_app.push([[Symbol()], {}, (r) => {
                const cur = Object.keys(req?.c || {}).length;
                const incoming = Object.keys(r?.c || {}).length;
                if (incoming > cur) req = r;
            }]);
            webpackChunkdiscord_app.pop();

            if (!req?.c) throw new Error('Webpack недоступен');
            const modules_list = Object.values(req.c);

            const findStoreByName = (name) => {
                for (const m of modules_list) {
                    try {
                        const exp = m?.exports;
                        if (!exp || typeof exp !== 'object') continue;
                        for (const key of Object.keys(exp)) {
                            const prop = exp[key];
                            if (prop && typeof prop === 'object' && prop.__proto__?.constructor?.displayName === name) return prop;
                        }
                    } catch (_) {}
                }
            };
            const findDispatcher = () => {
                for (const m of modules_list) {
                    try {
                        const exp = m?.exports;
                        if (!exp || typeof exp !== 'object') continue;
                        for (const key of Object.keys(exp)) {
                            const prop = exp[key];
                            if (prop && prop._subscriptions && typeof prop.subscribe === 'function' && typeof prop.dispatch === 'function') return prop;
                        }
                    } catch (_) {}
                }
            };
            const findAPI = () => {
                for (const m of modules_list) {
                    try {
                        const exp = m?.exports;
                        if (!exp || typeof exp !== 'object') continue;
                        for (const key of Object.keys(exp)) {
                            const prop = exp[key];
                            if (prop && typeof prop.get === 'function' && typeof prop.post === 'function' && typeof prop.del === 'function') return prop;
                        }
                    } catch (_) {}
                }
            };
            const findRouter = () => {
                for (const m of modules_list) {
                    try {
                        const exp = m?.exports;
                        if (!exp) continue;
                        for (const prop of [exp, exp.default, ...Object.values(exp)]) {
                            if (typeof prop === 'function' && prop.toString().includes('transitionTo -')) return { transitionTo: prop };
                        }
                    } catch (_) {}
                }
            };

            ctx.Mods = {
                QuestStore: findStoreByName('QuestStore'),
                RunStore: findStoreByName('RunningGameStore'),
                StreamStore: findStoreByName('ApplicationStreamingStore'),
                ChanStore: findStoreByName('ChannelStore'),
                GuildChanStore: findStoreByName('GuildChannelStore'),
                Dispatcher: findDispatcher(),
                API: findAPI(),
                Router: findRouter(),
            };

            const required = ['QuestStore', 'API', 'Dispatcher', 'RunStore'];
            const missing = required.filter(k => !ctx.Mods[k]);
            if (missing.length) throw new Error('Не найдены: ' + missing.join(', '));

            ctx.Patcher.init(ctx.Mods.RunStore);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    // ---------- runLoop (главный цикл квестов) ----------
    ctx.runLoop = async function () {
        const getQuests = () => {
            const q = ctx.Mods.QuestStore.quests;
            return q instanceof Map ? [...q.values()] : Object.values(q);
        };

        let quests = getQuests().filter(q =>
            !q.userStatus?.completedAt && notExpired(q) && q.id !== CONST.ID && !ctx.Tasks.skipped.has(q.id)
        );

        if (!quests.length) {
            ctx.Logger.log('[Система] Нет доступных квестов. Ожидание...', 'info');
            while (RUNTIME.running) {
                await sleep(10000);
                const newQ = getQuests().filter(q =>
                    !q.userStatus?.completedAt && notExpired(q) && q.id !== CONST.ID && !ctx.Tasks.skipped.has(q.id)
                );
                if (newQ.length) { quests = newQ; ctx.Logger.log(`[Система] Найдено ${quests.length} квестов`, 'success'); break; }
            }
            if (!RUNTIME.running) return;
        }

        const pick = await ctx.Logger.showQuestPicker(quests);
        if (!RUNTIME.running) return;

        RUNTIME.autoEnroll = pick.autoEnroll;
        RUNTIME.autoClaim = pick.autoClaim;
        RUNTIME.playSound = pick.playSound;
        RUNTIME.randomDelay = pick.randomDelay;

        if (!pick.selectedQuests.size) {
            ctx.Logger.log('[Система] Квесты не выбраны.', 'info');
            return;
        }

        let loopCount = 1;
        while (RUNTIME.running) {
            try {
                ctx.Logger.log(`[Цикл] Запуск #${loopCount}...`, 'info');
                quests = getQuests();
                const active = quests.filter(q =>
                    pick.selectedQuests.has(q.id) && !q.userStatus?.completedAt &&
                    notExpired(q) && q.id !== CONST.ID && !ctx.Tasks.skipped.has(q.id)
                );

                if (!active.length) {
                    ctx.Logger.log('[Система] Все квесты завершены, ожидание...', 'info');
                    await sleep(10000);
                    continue;
                }

                const queueVideo = [];
                const queueGame = [];

                for (const q of active) {
                    const cfg = q.config?.taskConfig ?? q.config?.taskConfigV2;
                    if (!cfg?.tasks) continue;
                    const typeData = ctx.Tasks.detectType(cfg, q.config?.application?.id);
                    if (!typeData) continue;
                    if (!SYS.IS_DESKTOP && (typeData.type === 'GAME' || typeData.type === 'STREAM')) continue;

                    const { type, keyName, target } = typeData;
                    if (target <= 0) continue;

                    const tInfo = {
                        id: q.id,
                        appId: q.config?.application?.id ?? 0,
                        name: q.config?.messages?.questName ?? 'Неизвестный квест',
                        target, type, keyName,
                    };

                    if (!q.userStatus?.enrolledAt && !RUNTIME.autoEnroll) {
                        ctx.Logger.updateTask(tInfo.id, { ...tInfo, cur: 0, max: target, status: 'PENDING', actionRequired: 'ENROLL' });
                        continue;
                    }

                    if (ctx.Logger.tasks.has(q.id) && ctx.Logger.tasks.get(q.id).status === 'RUNNING') continue;

                    ctx.Logger.updateTask(tInfo.id, { ...tInfo, cur: 0, max: target, status: 'QUEUE', actionRequired: null });

                    const taskFn = async () => {
                        if (!q.userStatus?.enrolledAt) {
                            try {
                                await ctx.Traffic.enqueue(`/quests/${q.id}/enroll`, { location: 11, is_targeted: false });
                                await sleep(rnd(800, 1500));
                            } catch (e) {
                                const err = ctx.ErrorHandler.classify(e);
                                ctx.Tasks.skipped.add(q.id);
                                return ctx.Tasks.failTask(q, tInfo, `Ошибка зачисления ${err.status || ''}`);
                            }
                        }
                        if (type === 'WATCH_VIDEO') return ctx.Tasks.VIDEO(q, tInfo, q.userStatus);
                        if (type === 'ACHIEVEMENT') return ctx.Tasks.ACHIEVEMENT(q, tInfo);
                        if (type === 'ACTIVITY') return ctx.Tasks.ACTIVITY(q, tInfo);
                        if (type === 'STREAM') return ctx.Tasks.STREAM(q, tInfo, q.userStatus);
                        return ctx.Tasks.GAME(q, tInfo, q.userStatus);
                    };

                    if (type === 'WATCH_VIDEO') queueVideo.push(taskFn);
                    else queueGame.push(taskFn);
                }

                if (queueVideo.length || queueGame.length) {
                    ctx.Logger.log(`[Цикл] ${queueVideo.length} видео, ${queueGame.length} игр`, 'info');
                    await Promise.all([
                        runConcurrent(queueGame, 1),
                        runConcurrent(queueVideo, 2),
                    ]);
                } else {
                    await sleep(rnd(4000, 6000));
                }

                if (!RUNTIME.running) break;
                if (RUNTIME.randomDelay) {
                    const delay = rnd(60000, 1800000);
                    ctx.Logger.log(`[Цикл] Задержка ${Math.round(delay / 60000)}м`, 'info');
                    await sleep(delay);
                } else {
                    await sleep(rnd(2500, 4500));
                }
                loopCount++;
            } catch (e) {
                ctx.Logger.log(`[Цикл] Ошибка #${loopCount}: ${e?.message ?? e}`, 'err');
                await sleep(3000);
                loopCount++;
            }
        }

        async function runConcurrent(tasks, limit) {
            const executing = new Set();
            for (const task of tasks) {
                if (!RUNTIME.running) break;
                const p = task().finally(() => executing.delete(p));
                executing.add(p);
                await sleep(rnd(1500, 4000));
                if (executing.size >= limit) await Promise.race(executing);
            }
            return Promise.allSettled(executing);
        }
    };

    // ---------- класс плагина ----------
    return class FQuest {
        constructor(opts) { this.opts = opts; }

        async start() {
            // CSS
            ctx.styleEl = document.createElement('style');
            ctx.styleEl.id = 'fquest-styles';
            ctx.styleEl.textContent = css;
            document.head.appendChild(ctx.styleEl);

            // Загрузка настроек
            ctx.Storage.loadAll();
            ctx.UI.applyTheme(RUNTIME.theme, RUNTIME.accent);

            // Кнопка в сайдбаре
            ctx.UI.mountSidebarButton();

            // Хоткей Shift+>
            ctx._hotkeyHandler = (e) => {
                if (e.key === '>' || (e.shiftKey && e.key === '.')) {
                    if (ctx._stopped) return;
                    e.preventDefault();
                    ctx.UI.toggleWindow();
                }
            };
            document.addEventListener('keydown', ctx._hotkeyHandler);

            // RPC
            if (RUNTIME.richPresence) ctx.RPC.enable();

            api.Logger.info(`[FQuest] v${CONFIG.VERSION} запущен`);
        }

        stop() {
            RUNTIME.running = false;
            for (const fn of RUNTIME.cleanups) { try { fn(); } catch (_) {} }
            RUNTIME.cleanups.clear();
            ctx.Patcher?.clean();
            ctx.RPC?.disable();
            if (ctx.Logger?.tickerId) clearInterval(ctx.Logger.tickerId);
            if (ctx.UI?.root) ctx.UI.root.remove();
            if (ctx.UI?.navBtn) ctx.UI.navBtn.remove();
            if (ctx.UI?._navWatcher) clearInterval(ctx.UI._navWatcher);
            if (ctx._hotkeyHandler) document.removeEventListener('keydown', ctx._hotkeyHandler);
            if (ctx.styleEl) ctx.styleEl.remove();
        }
    };
};