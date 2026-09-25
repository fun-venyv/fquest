/* FQuest · modules/history.js
 * История выполненных квестов + статистика */

module.exports = {
    createHistory(ctx) {
        const { Storage, RUNTIME } = ctx;
        const MAX_RECORDS = 200;

        return {
            _records: null,

            _load() {
                if (this._records) return this._records;
                this._records = Storage.getBlob('history', []);
                if (!Array.isArray(this._records)) this._records = [];
                return this._records;
            },

            _save() {
                Storage.setBlob('history', this._records);
            },

            add(record) {
                this._load();
                this._records.unshift({ ...record, id: record.id || `h_${Date.now()}` });
                if (this._records.length > MAX_RECORDS) this._records.length = MAX_RECORDS;
                this._save();
            },

            markClaimed(questId) {
                this._load();
                const rec = this._records.find(r => r.id === questId && !r.claimed);
                if (rec) { rec.claimed = true; this._save(); }
            },

            getAll() {
                return [...this._load()];
            },

            clear() {
                this._records = [];
                this._save();
            },

            stats() {
                const recs = this._load();
                const total = recs.length;
                const claimed = recs.filter(r => r.claimed).length;
                const byType = {};
                let totalMs = 0;
                for (const r of recs) {
                    byType[r.type] = (byType[r.type] || 0) + 1;
                }
                const sorted = [...recs].sort((a, b) => a.completedAt - b.completedAt);
                for (let i = 1; i < sorted.length; i++) {
                    totalMs += sorted[i].completedAt - sorted[i - 1].completedAt;
                }
                const avgMs = sorted.length > 1 ? totalMs / (sorted.length - 1) : 0;

                return { total, claimed, byType, avgMs };
            },
        };
    },
};