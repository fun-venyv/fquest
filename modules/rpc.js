/* FQuest · modules/rpc.js
 * Discord Rich Presence через BdApi */

module.exports = {
    createRPC(ctx) {
        const { RUNTIME, api } = ctx;
        const APP_ID = '1550866409092026489';

        let active = false;
        let startTime = null;
        let currentState = 'Выполняет квесты Discord';

        const buildActivity = () => ({
            application_id: APP_ID,
            name: 'FQuest',
            type: 0,                    // 0 = Playing
            details: currentState,
            state: RUNTIME.waitingForQuests ? 'Ожидание квестов' : 'В работе',
            timestamps: startTime ? { start: startTime } : undefined,
            assets: {
                large_image: 'fquest',
                large_text: 'FQuest',
            },
        });

        const dispatch = (activity) => {
            try {
                // Способ 1: через BdApi (предпочтительно)
                if (api?.Native?.sendActivityUpdate) {
                    api.Native.sendActivityUpdate(activity);
                    return true;
                }

                // Способ 2: через FluxDispatcher напрямую
                if (ctx.Mods?.Dispatcher) {
                    ctx.Mods.Dispatcher.dispatch({
                        type: 'LOCAL_ACTIVITY_UPDATE',
                        activity: activity,
                        socketId: undefined,
                        pid: 9999,
                    });
                    return true;
                }

                // Способ 3: через findModule FluxDispatcher
                const flux = ctx.Mods?.Dispatcher;
                if (flux) {
                    flux.dispatch({
                        type: 'LOCAL_ACTIVITY_UPDATE',
                        activity: activity,
                        socketId: undefined,
                        pid: 9999,
                    });
                    return true;
                }

                return false;
            } catch (e) {
                api.Logger.warn('[RPC] dispatch failed:', e);
                return false;
            }
        };

        return {
            enable() {
                if (active) return;
                if (!APP_ID || !/^\d+$/.test(APP_ID)) {
                    api.Logger.warn('[RPC] Application ID не задан или невалиден');
                    return;
                }

                startTime = Date.now();
                active = true;

                // Discord принимает RPC только когда dispatch прошёл успешно
                const ok = dispatch(buildActivity());
                if (ok) {
                    api.Logger.info('[RPC] Rich Presence включён');
                } else {
                    api.Logger.warn('[RPC] Не удалось включить Rich Presence');
                    active = false;
                }
            },

            disable() {
                if (!active) return;
                try {
                    dispatch(null);
                    api.Logger.info('[RPC] Rich Presence выключен');
                } catch (_) {}
                active = false;
                startTime = null;
            },

            update(state) {
                if (!active) return;
                if (state) currentState = String(state).slice(0, 128);
                dispatch(buildActivity());
            },

            setWaiting(isWaiting) {
                if (!active) return;
                RUNTIME.waitingForQuests = isWaiting;
                dispatch(buildActivity());
            },

            isActive() { return active; },
        };
    },
};