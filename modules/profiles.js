/* FQuest · modules/profiles.js
 * Профили настроек */

module.exports = {
    createProfiles(ctx) {
        const { Storage, RUNTIME } = ctx;

        const PROFILE_KEYS = ['autoEnroll', 'autoClaim', 'playSound', 'randomDelay',
            'videoSpeedMode', 'videoSpeedMultiplier', 'maxParallel',
            'notifyOnFinish', 'notifyOnlyFinal', 'notifyInFocus'];

        return {
            _list: null,

            _load() {
                if (this._list) return this._list;
                this._list = Storage.getBlob('profiles', []);
                if (!Array.isArray(this._list)) this._list = [];
                return this._list;
            },

            _save() {
                Storage.setBlob('profiles', this._list);
            },

            getAll() { return [...this._load()]; },

            create(name) {
                this._load();
                const profile = {
                    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name: name || `Профиль ${this._list.length + 1}`,
                    createdAt: Date.now(),
                    settings: {},
                };
                for (const key of PROFILE_KEYS) profile.settings[key] = RUNTIME[key];
                this._list.push(profile);
                this._save();
                return profile;
            },

            remove(id) {
                this._load();
                this._list = this._list.filter(p => p.id !== id);
                this._save();
            },

            rename(id, newName) {
                this._load();
                const p = this._list.find(x => x.id === id);
                if (p) { p.name = newName; this._save(); }
            },

            apply(id) {
                this._load();
                const p = this._list.find(x => x.id === id);
                if (!p) return false;
                for (const [key, value] of Object.entries(p.settings)) {
                    RUNTIME[key] = value;
                    Storage.set(key, value);
                }
                return true;
            },

            update(id) {
                this._load();
                const p = this._list.find(x => x.id === id);
                if (!p) return false;
                for (const key of PROFILE_KEYS) p.settings[key] = RUNTIME[key];
                this._save();
                return true;
            },
        };
    },
};