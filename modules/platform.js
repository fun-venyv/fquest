// === Маппинг имён stores → методов для поиска ===
const STORE_METHODS = {
    'UserStore': 'getCurrentUser',
    'SelectedGuildStore': 'getSelectedGuildId',
    'ChannelStore': 'getChannel',
    'GuildStore': 'getGuild',
    'GuildChannelStore': 'getSFWDefaultChannel',
    'ApplicationStreamingStore': 'getStreamerActiveStreamMetadata',
    'RunningGameStore': 'getRunningGames',
    'QuestsStore': 'getQuest',
    'PresenceStore': 'getStatus',
    'MessageStore': 'getMessage',
};

const Webpack = {
    getStore(name) {
        try {
            // 1. BetterDiscord — работает по имени
            if (isBD) {
                const store = BdApi.Webpack.getStore(name);
                if (store) return store;
            }

            // 2. Vencord — ищем по методу
            if (isVencord) {
                const { findStore, findByProps } = Vencord.Webpack || {};

                // 2a. Пробуем по имени (некоторые версии поддерживают)
                if (findStore) {
                    try {
                        const store = findStore(name);
                        if (store) return store;
                    } catch (_) {}
                }

                // 2b. Ищем по известному методу
                const method = STORE_METHODS[name];
                if (method && findStore) {
                    try {
                        const store = findStore(method);
                        if (store) return store;
                    } catch (_) {}
                }
                if (method && findByProps) {
                    try {
                        const store = findByProps(method);
                        if (store) return store;
                    } catch (_) {}
                }
            }

            // 3. Fallback через webpackChunkdiscord_app
            let wpRequire;
            webpackChunkdiscord_app.push([[Symbol()], {}, r => { wpRequire = r; }]);
            webpackChunkdiscord_app.pop();
            const modules = Object.values(wpRequire.c);

            // 3a. По имени store (если есть getName)
            for (const m of modules) {
                const ex = m?.exports;
                if (ex?.getName?.() === name || ex?.constructor?.displayName === name) {
                    return ex;
                }
            }

            // 3b. По известному методу
            const method = STORE_METHODS[name];
            if (method) {
                for (const m of modules) {
                    const ex = m?.exports;
                    if (ex?.[method] && typeof ex[method] === 'function') {
                        return ex;
                    }
                }
            }

            return null;
        } catch (e) {
            console.warn(`[FQuest] getStore(${name}) failed:`, e);
            return null;
        }
    },

    getByKeys(...keys) {
        try {
            if (isVencord && Vencord.Webpack.findByProps) {
                return Vencord.Webpack.findByProps(...keys);
            }
            if (isBD) return BdApi.Webpack.getByKeys(...keys);
        } catch (_) {}
        try {
            let wpRequire;
            webpackChunkdiscord_app.push([[Symbol()], {}, r => { wpRequire = r; }]);
            webpackChunkdiscord_app.pop();
            return Object.values(wpRequire.c).find(m => {
                const ex = m?.exports;
                return ex && keys.every(k => ex[k] !== undefined);
            })?.exports;
        } catch (_) { return null; }
    },

    getModule(filter) {
        try {
            if (isVencord && Vencord.Webpack.findByProps) {
                // Vencord-specific: findExportedComponent, findStore и т.д.
            }
            if (isBD) return BdApi.Webpack.getModule(filter);
        } catch (_) {}
        try {
            let wpRequire;
            webpackChunkdiscord_app.push([[Symbol()], {}, r => { wpRequire = r; }]);
            webpackChunkdiscord_app.pop();
            return Object.values(wpRequire.c).map(m => m?.exports).find(filter);
        } catch (_) { return null; }
    },
};
 function createPlatform(meta) {
        const isVencord = typeof Vencord !== 'undefined' && typeof definePlugin !== 'undefined';
        const isBD = !isVencord && typeof BdApi !== 'undefined';

        // === DATA (универсальный) ===
        const Data = {
            load(key) {
                try {
                    if (isVencord) return Vencord.Data.load(key) ?? null;
                    if (isBD) return BdApi.Data.load(meta.name, key) ?? null;
                    const raw = localStorage.getItem('fquest_' + key);
                    return raw ? JSON.parse(raw) : null;
                } catch { return null; }
            },
            save(key, value) {
                try {
                    if (isVencord) return Vencord.Data.save(key, value);
                    if (isBD) return BdApi.Data.save(meta.name, key, value);
                    localStorage.setItem('fquest_' + key, JSON.stringify(value));
                    return true;
                } catch { return false; }
            },
            delete(key) {
                try {
                    if (isVencord) return Vencord.Data.delete(key);
                    if (isBD) return BdApi.Data.delete(meta.name, key);
                    localStorage.removeItem('fquest_' + key);
                    return true;
                } catch { return false; }
            },
        };

        // === UI (универсальный) ===
        const UI = {
            showToast(message, opts = {}) {
                try {
                    if (isBD) return BdApi.UI.showToast(message, { type: opts.type || 'info', timeout: opts.timeout || 3000 });
                    if (isVencord && Vencord.Api?.showToast) return Vencord.Api.showToast({ message, ...opts });
                } catch {}
            },
            showNotice(message, opts = {}) {
                try {
                    if (isBD) return BdApi.UI.showNotice(message, { type: opts.type || 'info' });
                    if (isVencord && Vencord.Api?.showNotice) return Vencord.Api.showNotice({ message, type: opts.type });
                } catch {}
            },
        };

        // === LOGGER (универсальный) ===
        const Logger = {
            info: (...a) => { try { isBD ? BdApi.Logger.info(meta.name, ...a) : isVencord ? Vencord.Logger.info(...a) : console.log('[FQuest]', ...a); } catch { console.log('[FQuest]', ...a); } },
            warn: (...a) => { try { isBD ? BdApi.Logger.warn(meta.name, ...a) : isVencord ? Vencord.Logger.warn(...a) : console.warn('[FQuest]', ...a); } catch { console.warn('[FQuest]', ...a); } },
            error: (...a) => { try { isBD ? BdApi.Logger.error(meta.name, ...a) : isVencord ? Vencord.Logger.error(...a) : console.error('[FQuest]', ...a); } catch { console.error('[FQuest]', ...a); } },
        };

        // === NATIVE (универсальный) ===
        const Native = {
            openExternal(url) {
                try {
                    if (window.DiscordNative?.shell?.openExternal) return window.DiscordNative.shell.openExternal(url);
                    if (isVencord && Vencord.Util?.openExternal) return Vencord.Util.openExternal(url);
                    if (isBD && BdApi.Native?.openExternal) return BdApi.Native.openExternal(url);
                } catch {}
                window.open(url, '_blank', 'noopener,noreferrer');
            },
        };

        return {
            isVencord,
            isBD,
            isFallback: !isVencord && !isBD,
            Data,
            Webpack, // используем объект Webpack, определённый выше в файле
            UI,
            Logger,
            Native,
        };
    }

    // Экспортируем функцию, которую ожидает core.js
    module.exports = { createPlatform };