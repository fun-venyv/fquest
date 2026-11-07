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