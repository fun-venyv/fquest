/* ============================================================
 *  FQuest · modules/storage.js
 *  Единая обёртка над localStorage
 * ============================================================ */

module.exports = {
    /**
     * @param {object} ctx 
     */
    createStorage(ctx) {
        const { RUNTIME, api } = ctx;
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
        };

        const BLOB_KEYS = {
            profiles: 'profiles',      
            history: 'history',         
            cache: 'module_cache',      
        };

        return {
  
    _key(name) { return PREFIX + name; },

    get(name, fallback = null) {
        try {
            const raw = api.Data.load(this._key(name));
            if (raw === null || raw === undefined) return fallback;

    
            if (typeof raw !== 'string') return raw;

         
            try {
                return JSON.parse(raw);
            } catch (_) {
                return raw; 
            }
        } catch (e) {
            api?.Logger?.warn?.(`[Storage] get(${name}) failed:`, e);
            return fallback;
        }
    },

    set(name, value) {
        try {
            api.Data.save(this._key(name), value);
            return true;
        } catch (e) {
            api?.Logger?.warn?.(`[Storage] set(${name}) failed:`, e);
            return false;
        }
    },

    remove(name) {
        try {
            api.Data.delete(this._key(name));
            return true;
        } catch (_) { return false; }
    },


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

    getBlob(name, fallback = []) {
        return this.get(BLOB_KEYS[name] || name, fallback);
    },

    setBlob(name, value) {
        return this.set(BLOB_KEYS[name] || name, value);
    },

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