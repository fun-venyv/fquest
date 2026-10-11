/* FQuest · modules/rpc.js
 * Discord Rich Presence — подход из AutoStartRichPresence */

module.exports = {
    createRPC(ctx) {
        const { RUNTIME, api } = ctx;

        const APP_ID = '1550866409092026489';

        const ASSETS = {
            large: 'ico',        
            largeText: 'FQuest.plugin',
            small: null,            
            smallText: null,
        };

        let active = false;
        let startTime = null;
        let currentDetails = 'FQuest';
        let currentState = 'Ожидание задач';

        let _dispatcher = null;
        const getDispatcher = () => {
            if (_dispatcher) return _dispatcher;
            try {

                _dispatcher = api.Webpack.getStore('UserStore')?._dispatcher;
                if (_dispatcher) {
                    api.Logger.info('[RPC] Dispatcher получен через UserStore._dispatcher');
                    return _dispatcher;
                }


                _dispatcher = api.Webpack.getByKeys('dispatch')?.dispatch
                    ? api.Webpack.getByKeys('dispatch')
                    : null;
                if (_dispatcher) {
                    api.Logger.info('[RPC] Dispatcher получен через getByKeys("dispatch")');
                    return _dispatcher;
                }


                _dispatcher = api.Webpack.getByKeys('dispatch', 'subscribe', 'flushWaitQueue');
                if (_dispatcher) {
                    api.Logger.info('[RPC] Dispatcher получен через FluxDispatcher');
                    return _dispatcher;
                }

                api.Logger.warn('[RPC] Не удалось найти dispatcher');
                return null;
            } catch (e) {
                api.Logger.warn('[RPC] getDispatcher error:', e);
                return null;
            }
        };

        const buildActivity = () => {
            const activity = {
                application_id: APP_ID,
                name: 'FQuest',             
                type: 0,                     
                details: currentDetails,
                flags: 1,                    
                timestamps: startTime ? { start: Math.floor(startTime) } : undefined,
            };

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

        const setActivity = (activity) => {
            const dispatcher = getDispatcher();
            if (!dispatcher?.dispatch) {
                api.Logger.warn('[RPC] Dispatcher пуст — активность не установлена');
                return false;
            }

            try {
                dispatcher.dispatch({
                    type: 'LOCAL_ACTIVITY_UPDATE',
                    activity: activity,
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

                const ok = setActivity(buildActivity());
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
                    setActivity({});
                    api.Logger.info('[RPC] Rich Presence выключен');
                } catch (_) {}
                active = false;
                startTime = null;
            },

            update(details, state) {
                if (!active) return;
                if (details) currentDetails = String(details).slice(0, 128);
                if (state) currentState = String(state).slice(0, 128);
                setActivity(buildActivity());
            },

            setWaiting(isWaiting) {
                // if (!active) return;
            },

            isActive() { return active; },
        };
    },
};