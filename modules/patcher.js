/* FQuest · modules/patcher.js
 * Подмена RunningGameStore для спуфинга игр */

module.exports = {
    createPatcher(ctx) {
        const { RUNTIME, CONST, Mods, Logger } = ctx;

        return {
            games: [],
            realGames: null,
            realPID: null,
            active: false,

            init(Store) {
                if (!Store) return;
                this.realGames = Store.getRunningGames;
                this.realPID = Store.getGameForPID;
            },

            toggle(on) {
                if (on && !this.active) {
                    Mods.RunStore.getRunningGames = () => [...this.realGames.call(Mods.RunStore), ...this.games];
                    Mods.RunStore.getGameForPID = (pid) => this.games.find(g => g.pid === pid) || this.realPID.call(Mods.RunStore, pid);
                    this.active = true;
                } else if (!on && this.active) {
                    Mods.RunStore.getRunningGames = this.realGames;
                    Mods.RunStore.getGameForPID = this.realPID;
                    this.active = false;
                }
            },

            add(g) {
                if (this.games.some(x => x.pid === g.pid)) return;
                this.games.push(g);
                this.toggle(true);
                this.dispatch([g], []);
                this.rpc(g);
            },

            remove(g) {
                const before = this.games.length;
                this.games = this.games.filter(x => x.pid !== g.pid);
                if (this.games.length === before) return;
                this.dispatch([], [g]);
                if (!this.games.length) {
                    this.toggle(false);
                    this.rpc(null);
                } else {
                    this.rpc(this.games[0]);
                }
            },

            dispatch(added, removed) {
                Mods.Dispatcher?.dispatch({
                    type: CONST.EVT.GAME,
                    added,
                    removed,
                    games: Mods.RunStore.getRunningGames(),
                });
            },

            rpc(g) {
                if (ctx.CONFIG.HIDE_ACTIVITY && g) return;
                try {
                    Mods.Dispatcher?.dispatch({
                        type: CONST.EVT.RPC,
                        socketId: null,
                        pid: g ? g.pid : 9999,
                        activity: g ? {
                            application_id: g.id,
                            name: g.name,
                            type: 0,
                            details: null,
                            state: null,
                            timestamps: { start: g.start },
                            icon: g.icon,
                            assets: null,
                        } : null,
                    });
                } catch (e) {
                    Logger?.log(`[Очистка RPC] ${e.message}`, 'debug');
                }
            },

            clean() {
                this.games = [];
                this.toggle(false);
                this.rpc(null);
            },
        };
    },
};