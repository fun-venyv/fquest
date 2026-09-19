module.exports = function FQuestFactory({ meta, api, modules, css, manifest }) {
    // ---------- CONFIG ----------
    const CONFIG = {
        NAME: 'FQuest',
        VERSION: manifest.version,
        THEME: '#8B5CF6',
        SUCCESS: '#34D399',
        WARN: '#FBBF24',
        ERR: '#F87171',
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
    };

    const CONST = Object.freeze({
        ID: '1412491570820812933',
        EVT: Object.freeze({
            HEARTBEAT: 'QUESTS_SEND_HEARTBEAT_SUCCESS',
            GAME: 'RUNNING_GAMES_CHANGE',
            RPC: 'LOCAL_ACTIVITY_UPDATE',
        }),
    });

    // ---------- utils ----------
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

    // ---------- init modules (пока только то, что уже есть) ----------
    ctx.Consent = modules('consent.js').createConsent(ctx);
    ctx.Sound   = modules('consent.js').createSound(ctx);
    // TODO: остальные модули — следующими шагами
    // ctx.Logger = modules('logger.js').createLogger(ctx);
    // ctx.UI     = modules('ui/index.js').createUI(ctx);

    // ---------- stub Logger, пока не написан настоящий ----------
    ctx.Logger = ctx.Logger || {
        tickerId: null,
        init() { console.log('[FQuest] Logger stub init'); },
        log(msg, type) { console.log(`[FQuest/${type || 'info'}] ${msg}`); },
        render() {},
        updateTask() {},
        removeTask() {},
    };

    // ---------- stub runLoop ----------
    ctx.runLoop = async function () {
        ctx.Logger.log('[FQuest] Каркас запущен. Логика ещё не подключена.', 'warn');
    };

    // ---------- stub loadModules ----------
    ctx.loadModules = function () {
        ctx.Logger.log('[FQuest] loadModules: заглушка.', 'warn');
        return true;
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

            // пока нет UI — просто лог
            ctx.Logger.log(`[FQuest] Каркас v${CONFIG.VERSION} загружен`, 'success');
            console.log('[FQuest] CSS length:', css.length);
            console.log('[FQuest] Modules loaded:', Object.keys(manifest.files).length);

            // TODO: на следующем шаге здесь будет ctx.UI.mountSidebarButton()
        }

        stop() {
            RUNTIME.running = false;
            for (const fn of RUNTIME.cleanups) { try { fn(); } catch (_) {} }
            RUNTIME.cleanups.clear();
            if (ctx.styleEl) { ctx.styleEl.remove(); ctx.styleEl = null; }
            console.log('[FQuest] stopped');
        }
    };
};