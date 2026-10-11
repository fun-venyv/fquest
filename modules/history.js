/* FQuest · modules/history.js
 * История выполненных квестов + статистика + Orbs */

module.exports = {
    createHistory(ctx) {
        const { Storage } = ctx;
        const MAX_RECORDS = 500;

        return {
            _records: null,

            _load() {
                if (this._records) return this._records;
                this._records = Storage.getBlob('history', []);
                if (!Array.isArray(this._records)) this._records = [];
                // Миграция старых записей
                for (const r of this._records) {
                    if (r.orbs === undefined) r.orbs = 0;
                    if (r.rewardKey === undefined) r.rewardKey = 'UNKNOWN';
                    if (r.rewardType === undefined) r.rewardType = 0;
                    if (r.rewardIcon === undefined) r.rewardIcon = '❓';
                }
                return this._records;
            },

            _save() {
                Storage.setBlob('history', this._records);
            },

            /**
             * @param {object} record
             * @param {string} record.id
             * @param {string} record.name
             * @param {string} record.type         // VIDEO / GAME / STREAM / ACHIEVEMENT / ACTIVITY
             * @param {number} record.target
             * @param {number} [record.appId]
             * @param {number} [record.orbs]       // ← НОВОЕ
             * @param {string} [record.rewardKey]  // ← НОВОЕ
             * @param {number} [record.rewardType] // ← НОВОЕ
             * @param {string} [record.rewardIcon] // ← НОВОЕ
             * @param {string} [record.rewardName] // ← НОВОЕ
             */
            add(record) {
                this._load();
                this._records.unshift({
                    ...record,
                    id: record.id || `h_${Date.now()}`,
                    completedAt: record.completedAt || Date.now(),
                    claimed: !!record.claimed,
                    orbs: record.orbs || 0,
                    rewardKey: record.rewardKey || 'UNKNOWN',
                    rewardType: record.rewardType ?? 0,
                    rewardIcon: record.rewardIcon || '❓',
                    rewardName: record.rewardName || '',
                });
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
                const totalOrbs = recs.reduce((s, r) => s + (r.orbs || 0), 0);
                const claimedOrbs = recs.filter(r => r.claimed).reduce((s, r) => s + (r.orbs || 0), 0);

                const byType = {};
                const byReward = {};
                for (const r of recs) {
                    byType[r.type] = (byType[r.type] || 0) + 1;
                    const rk = r.rewardKey || 'UNKNOWN';
                    if (!byReward[rk]) byReward[rk] = { count: 0, orbs: 0, icon: r.rewardIcon || '❓' };
                    byReward[rk].count++;
                    byReward[rk].orbs += r.orbs || 0;
                }

                // Средний интервал между квестами
                const sorted = [...recs].sort((a, b) => a.completedAt - b.completedAt);
                let totalMs = 0;
                for (let i = 1; i < sorted.length; i++) {
                    totalMs += sorted[i].completedAt - sorted[i - 1].completedAt;
                }
                const avgMs = sorted.length > 1 ? totalMs / (sorted.length - 1) : 0;

                // Активность по дням (последние 30)
                const daily = this.dailyStats(30);

                // Streak (дней подряд)
                const streak = this._calcStreak(recs);

                return {
                    total,
                    claimed,
                    totalOrbs,
                    claimedOrbs,
                    byType,
                    byReward,
                    avgMs,
                    daily,
                    streak,
                };
            },

            /**
             * Статистика по дням за N последних дней.
             * @returns {Array<{ date: string, ts: number, count: number, orbs: number }>}
             */
            dailyStats(days = 30) {
                const recs = this._load();
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const buckets = [];
                for (let i = days - 1; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    buckets.push({
                        date: d.toISOString().slice(5, 10), // MM-DD
                        ts: d.getTime(),
                        count: 0,
                        orbs: 0,
                    });
                }

                const startTs = buckets[0].ts;
                for (const r of recs) {
                    const t = new Date(r.completedAt);
                    t.setHours(0, 0, 0, 0);
                    const ts = t.getTime();
                    if (ts < startTs) continue;
                    const idx = Math.floor((ts - startTs) / 86400000);
                    if (idx >= 0 && idx < buckets.length) {
                        buckets[idx].count++;
                        buckets[idx].orbs += r.orbs || 0;
                    }
                }

                return buckets;
            },

            _calcStreak(recs) {
                if (!recs.length) return 0;
                const days = new Set();
                for (const r of recs) {
                    const d = new Date(r.completedAt);
                    d.setHours(0, 0, 0, 0);
                    days.add(d.getTime());
                }
                const sorted = [...days].sort((a, b) => b - a);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTs = today.getTime();
                const dayMs = 86400000;

                // Если последний день — сегодня или вчера, считаем streak
                if (sorted[0] !== todayTs && sorted[0] !== todayTs - dayMs) return 0;

                let streak = 1;
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i - 1] - sorted[i] === dayMs) streak++;
                    else break;
                }
                return streak;
            },
        };
    },
};