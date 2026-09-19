/* ============================================================
 *  FQuest · modules/storage.js
 *  Единая обёртка над localStorage
 * ============================================================ */

module.exports = {
    /**
     * @param {object} ctx — общий контекст
     */
    createStorage(ctx) {
        const { RUNTIME, api } = ctx;
        const PREFIX = 'fq_';

        // Настройки, которые хранятся отдельными ключами
        const DEFAULTS = {
            autoEnroll: true,
            autoClaim: false,
            playSound: false,
            randomDelay: false,
            theme: 'dark',
            accent: '#8B5CF6',
            richPresence: false,
            activeTab: 'quests',
            videoSpeedMode: 'safe',      // safe | fast | custom
            videoSpeedMultiplier: 1,     // множитель для custom
            maxParallel: 1,              // сколько игр одновременно
            notifyOnFinish: true,        // уведомления по каждому квесту
            notifyOnlyFinal: false,      // только финальное уведомление
            notifyInFocus: false,        // не уведомлять, если Discord в фокусе
        };

        // Ключи для больших JSON-объектов
        const BLOB_KEYS = {
            profiles: 'profiles',        // массив профилей настроек
            history: 'history',          // массив записей о завершённых квестах
            cache: 'module_cache',       // не используется — кэш у загрузчика
        };

        return {
            /* ---------- core get/set ---------- */
            _key(name) { return PREFIX + name; },

            get(name, fallback = null) {
                try {
                    const raw = localStorage.getItem(this._key(name));
                    if (raw === null || raw === undefined) return fallback;
                    return JSON.parse(raw);
                } catch (e) {
                    api?.Logger?.warn?.(`[Storage] get(${name}) failed:`, e);
                    return fallback;
                }
            },

            set(name, value) {
                try {
                    localStorage.setItem(this._key(name), JSON.stringify(value));
                    return true;
                } catch (e) {
                    // QuotaExceededError или приватный режим
                    api?.Logger?.warn?.(`[Storage] set(${name}) failed:`, e);
                    return false;
                }
            },

            remove(name) {
                try {
                    localStorage.removeItem(this._key(name));
                    return true;
                } catch (_) { return false; }
            },

            /* ---------- settings (с defaults) ---------- */
            getSetting(name) {
                const stored = this.get(name, undefined);
                if (stored === undefined) return DEFAULTS[name];
                return stored;
            },

            setSetting(name, value) {
                return this.set(name, value);
            },

            /**
             * Загрузить все настройки в RUNTIME.
             * Вызывается один раз в start() из core.js.
             */
            loadAll() {
                for (const [key, def] of Object.entries(DEFAULTS)) {
                    const val = this.get(key, undefined);
                    RUNTIME[key] = (val === undefined) ? def : val;
                }
                return RUNTIME;
            },

            /**
             * Сохранить все настройки из RUNTIME.
             * Используется при экспорте и на всякий случай.
             */
            saveAll() {
                for (const key of Object.keys(DEFAULTS)) {
                    if (key in RUNTIME) this.set(key, RUNTIME[key]);
                }
            },

            /* ---------- blob (profiles, history) ---------- */
            getBlob(name, fallback = []) {
                return this.get(BLOB_KEYS[name] || name, fallback);
            },

            setBlob(name, value) {
                return this.set(BLOB_KEYS[name] || name, value);
            },

            /* ---------- export / import ---------- */
            /**
             * Собирает всё в один объект для JSON-экспорта.
             * Не включает модульный кэш — он большой и не нужен.
             */
            exportAll() {
                const data = {
                    _meta: {
                        plugin: 'FQuest',
                        version: ctx.CONFIG.VERSION,
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

            /**
             * Импорт данных. Возвращает {ok, applied, errors}.
             */
            importAll(data) {
                const result = { ok: false, applied: 0, errors: [] };
                if (!data || typeof data !== 'object') {
                    result.errors.push('Некорректный формат файла');
                    return result;
                }

                // Настройки
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

                // Профили
                if (Array.isArray(data.profiles)) {
                    if (this.setBlob('profiles', data.profiles)) result.applied++;
                    else result.errors.push('Не удалось сохранить профили');
                }

                // История
                if (Array.isArray(data.history)) {
                    if (this.setBlob('history', data.history)) result.applied++;
                    else result.errors.push('Не удалось сохранить историю');
                }

                result.ok = result.errors.length === 0;
                return result;
            },

            /**
             * Полный сброс к дефолтам.
             */
            reset() {
                for (const key of Object.keys(DEFAULTS)) {
                    this.remove(key);
                    RUNTIME[key] = DEFAULTS[key];
                }
                this.remove(BLOB_KEYS.profiles);
                this.remove(BLOB_KEYS.history);
            },

            /**
             * Удобный хелпер — отдать DEFAULTS наружу,
             * чтобы вкладка «Настройки» знала дефолты.
             */
            get defaults() { return { ...DEFAULTS }; },
        };
    },
};