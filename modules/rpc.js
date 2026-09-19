/* FQuest · modules/rpc.js
 * Discord Rich Presence (опционально) */

module.exports = {
    createRPC(ctx) {
        const { Mods, RUNTIME, Logger } = ctx;
        const APP_ID = '1412491570820812933'; // FQuest app id (тот же, что и для квестов-achievements)
        let active = false;

        return {
            enable() {
                if (active) return;
                try {
                    if (!Mods.Dispatcher) return;
                    Mods.Dispatcher.dispatch({
                        type: 'LOCAL_ACTIVITY_UPDATE',
                        socketId: null,
                        pid: 9999,
                        activity: {
                            application_id: APP_ID,
                            name: 'FQuest',
                            type: 0,
                            details: 'Выполняет квесты Discord',
                            state: `${RUNTIME.activeTab || 'quests'}`,
                            timestamps: { start: Date.now() },
                            assets: null,
                        },
                    });
                    active = true;
                    Logger.log('[RPC] Rich Presence включён', 'info');
                } catch (e) {
                    Logger.log(`[RPC] Ошибка включения: ${e.message}`, 'warn');
                }
            },

            disable() {
                if (!active) return;
                try {
                    Mods.Dispatcher?.dispatch({
                        type: 'LOCAL_ACTIVITY_UPDATE',
                        socketId: null,
                        pid: 9999,
                        activity: null,
                    });
                    active = false;
                    Logger.log('[RPC] Rich Presence выключен', 'info');
                } catch (_) {}
            },

            update(state) {
                if (!active) return;
                try {
                    Mods.Dispatcher?.dispatch({
                        type: 'LOCAL_ACTIVITY_UPDATE',
                        socketId: null,
                        pid: 9999,
                        activity: {
                            application_id: APP_ID,
                            name: 'FQuest',
                            type: 0,
                            details: 'Выполняет квесты Discord',
                            state: String(state).slice(0, 128),
                            timestamps: { start: Date.now() },
                            assets: null,
                        },
                    });
                } catch (_) {}
            },
        };
    },
};