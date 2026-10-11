/* ============================================================
 *  FQuest · modules/storage.js
 *  Единая обёртка над BdApi.Data / Vencord.Data / localStorage
 * ============================================================ */

module.exports = {
    /**
     * @param {object} ctx
     */
    createStorage(ctx) {
        const { RUNTIME, platform } = ctx;
        const PREFIX = 'fq_';

        const DEFAULTS = {
            autoEnroll: true,
            autoClaim: false,
            playSound: false,
            randomDelay: false,
            theme: 'dark',
            accent: '#8B5CF6',
            richPresence: false,
            activeTab: 'quests',
            videoSpeedMode: 'safe',
            videoSpeedMultiplier: 1,
            maxParallel: 1,
            notifyOnFinish: true,
            notifyOnlyFinal: false,
            notifyInFocus: false,
            lastSeenUpdate: 0,
            lastSeenQuests: 0,
            lastSeenVersion: '',
            // === v6.0.0 ===
            authToken: '',
            themeV2: 'dark',
            orbCount: 0,
            statsDays: 30,
        };

        const BLOB_KEYS = {
            profiles: 'profiles',
            history: 'history',
            cache: 'module_cache',
            stats: 'stats_v2',
        };

        return {
            _key(name) { return PREFIX + name; },

            /**
             * Читает значение. Для совместимости со старым форматом
             * пытается распарсить JSON, если данные — строка.
             */
            get(name, fallback = null) {
                try {
                    const raw = platform.Data.load(this._key(name));
                    if (raw === null || raw === undefined) return fallback;
                    if (typeof raw !== 'string') return raw;

                    try {
                        return JSON.parse(raw);
                    } catch (_) {
                        return raw;
                    }
                } catch (e) {
                    platform?.Logger?.warn?.(`[Storage] get(${name}) failed:`, e);
                    return fallback;
                }
            },

            /**
             * Сохраняет значение. Обёртка platform.Data сама решит,
             * как сериализовать (BD/Vencord умеют работать с объектами,
             * для localStorage — JSON.stringify).
             */
            set(name, value) {
                try {
                    platform.Data.save(this._key(name), value);
                    return true;
                } catch (e) {
                    platform?.Logger?.warn?.(`[Storage] set(${name}) failed:`, e);
                    return false;
                }
            },

            remove(name) {
                try {
                    platform.Data.delete(this._key(name));
                    return true;
                } catch (_) {
                    return false;
                }
            },

            // ==== Settings (DEFAULTS + RUNTIME) ====

            getSetting(name) {
                const stored = this.get(name, undefined);
                if (stored === undefined) return DEFAULTS[name];
                return stored;
            },

            setSetting(name, value) {
                return this.set(name, value);
            },

            loadAll() {
                for (const [key, def] of Object.entries(DEFAULTS)) {
                    const val = this.get(key, undefined);
                    RUNTIME[key] = (val === undefined) ? def : val;
                }
                return RUNTIME;
            },

            saveAll() {
                for (const key of Object.keys(DEFAULTS)) {
                    if (key in RUNTIME) this.set(key, RUNTIME[key]);
                }
            },

            // ==== Blobs (profiles / history / stats / cache) ====

            getBlob(name, fallback = []) {
                return this.get(BLOB_KEYS[name] || name, fallback);
            },

            setBlob(name, value) {
                return this.set(BLOB_KEYS[name] || name, value);
            },

            // ==== Export / Import ====

            exportAll() {
                const data = {
                    _meta: {
                        plugin: 'FQuest',
                        version: ctx.CONFIG?.VERSION || '0.0.0',
                        exportedAt: new Date().toISOString(),
                    },
                    settings: {},
                    profiles: this.getBlob('profiles', []),
                    history: this.getBlob('history', []),
                };
                for (const key of Object.keys(DEFAULTS)) {
                    data.settings[key] = this.get(key, DEFAULTS[key]);
                }
                return data;
            },

            importAll(data) {
                const result = { ok: false, applied: 0, errors: [] };
                if (!data || typeof data !== 'object') {
                    result.errors.push('Некорректный формат файла');
                    return result;
                }

                if (data.settings && typeof data.settings === 'object') {
                    for (const [key, value] of Object.entries(data.settings)) {
                        if (!(key in DEFAULTS)) continue;
                        if (this.set(key, value)) {
                            RUNTIME[key] = value;
                            result.applied++;
                        } else {
                            result.errors.push(`Не удалось сохранить "${key}"`);
                        }
                    }
                }

                if (Array.isArray(data.profiles)) {
                    if (this.setBlob('profiles', data.profiles)) result.applied++;
                    else result.errors.push('Не удалось сохранить профили');
                }

                if (Array.isArray(data.history)) {
                    if (this.setBlob('history', data.history)) result.applied++;
                    else result.errors.push('Не удалось сохранить историю');
                }

                result.ok = result.errors.length === 0;
                return result;
            },

            // ==== Reset ====

            reset() {
                for (const key of Object.keys(DEFAULTS)) {
                    this.remove(key);
                    RUNTIME[key] = DEFAULTS[key];
                }
                this.remove(BLOB_KEYS.profiles);
                this.remove(BLOB_KEYS.history);
            },

            get defaults() { return { ...DEFAULTS }; },
        };
    },
};