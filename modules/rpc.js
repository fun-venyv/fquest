/* FQuest · modules/rpc.js
 * Discord Rich Presence через BdApi.Webpack */

module.exports = {
    createRPC(ctx) {
        const { RUNTIME, api } = ctx;

        const APP_ID = '1550866409092026489';

        const ASSETS = {
            large: 'fquest',           // имя большой иконки
            largeText: 'FQuest',
            small: null,                // или имя маленькой иконки
            smallText: null,
        };

        let active = false;
        let startTime = null;
        let currentDetails = 'FQuest';
        let currentState = 'Ожидание задач';

        // Кэш модулей (получаем один раз)
        let _Dispatcher = null;
        let _ActivityStore = null;

        const getDispatcher = () => {
            if (_Dispatcher) return _Dispatcher;
            try {
                // BdApi.Webpack — официальный способ
                _Dispatcher = BdApi.Webpack.getByKeys('dispatch', 'subscribe', 'flushWaitQueue')
                    || BdApi.Webpack.getByKeys('dispatch', 'subscribe');
                if (_Dispatcher) api.Logger.info('[RPC] FluxDispatcher найден');
                else api.Logger.warn('[RPC] FluxDispatcher НЕ найден');
            } catch (e) {
                api.Logger.warn('[RPC] getDispatcher error:', e);
            }
            return _Dispatcher;
        };

        const getActivityStore = () => {
            if (_ActivityStore) return _ActivityStore;
            try {
                _ActivityStore = BdApi.Webpack.getStore('ApplicationStreamingStore')
                    || BdApi.Webpack.getStore('ActivityStore')
                    || BdApi.Webpack.getStore('RunningGameStore');
            } catch (e) {
                api.Logger.warn('[RPC] getActivityStore error:', e);
            }
            return _ActivityStore;
        };

        const buildActivity = () => {
            const activity = {
                application_id: APP_ID,
                name: 'FQuest',
                type: 0,                 // 0 = Playing
                details: currentDetails,
                state: currentState,
                timestamps: startTime ? { start: startTime } : undefined,
            };

            // Добавляем assets только если заданы
            if (ASSETS.large) {
                activity.assets = {
                    large_image: ASSETS.large,
                    large_text: ASSETS.largeText || 'FQuest',
                };
                if (ASSETS.small) {
                    activity.assets.small_image = ASSETS.small;
                    activity.assets.small_text = ASSETS.smallText || '';
                }
            }

            return activity;
        };

        const dispatch = (activity) => {
            const Dispatcher = getDispatcher();
            if (!Dispatcher) return false;

            try {
                Dispatcher.dispatch({
                    type: 'LOCAL_ACTIVITY_UPDATE',
                    activity: activity,
                    socketId: undefined,
                    pid: 9999,
                });
                return true;
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

            update(details, state) {
                if (!active) return;
                if (details) currentDetails = String(details).slice(0, 128);
                if (state) currentState = String(state).slice(0, 128);
                dispatch(buildActivity());
            },

            setWaiting(isWaiting) {
                if (!active) return;
                currentState = isWaiting ? 'Ожидание квестов' : 'В работе';
                dispatch(buildActivity());
            },

            isActive() { return active; },
        };
    },
};