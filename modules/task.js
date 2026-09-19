/* FQuest · modules/tasks.js
 * VIDEO / GAME / STREAM / ACHIEVEMENT / ACTIVITY */

module.exports = {
    createTasks(ctx) {
        const { RUNTIME, SYS, CONST, Mods, Traffic, Logger, Patcher, Sound, ErrorHandler, sleep, rnd, esc } = ctx;

        return {
            skipped: new Set(),

            sanitize(name) { return String(name).replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, " "); },

            detectType(cfg, applicationId) {
                const taskKeys = Object.keys(cfg.tasks);
                const typeMap = [
                    { key: "PLAY", type: "GAME" },
                    { key: "STREAM", type: "STREAM" },
                    { key: "VIDEO", type: "WATCH_VIDEO" },
                    { key: "ACHIEVEMENT_IN_ACTIVITY", type: "ACHIEVEMENT" },
                    { key: "ACTIVITY", type: "ACTIVITY" },
                ];
                for (const { key, type } of typeMap) {
                    const keyName = taskKeys.find(k => k.includes(key));
                    if (keyName) return { type, keyName, target: cfg.tasks[keyName]?.target ?? 0 };
                }
                if (applicationId) return { type: "GAME", keyName: "PLAY_ON_DESKTOP", target: cfg.tasks[taskKeys[0]]?.target ?? 0 };
                return null;
            },

            async fetchGameData(appId, appName) {
                try {
                    const res = await Mods.API.get({ url: `/applications/public?application_ids=${appId}` });
                    const appData = res?.body?.[0];
                    const exeEntry = appData?.executables?.find(x => x.os === "win32");
                    const rawExe = exeEntry ? exeEntry.name.replace(">", "") : `${this.sanitize(appName)}.exe`;
                    const cleanName = this.sanitize(appData?.name || appName);
                    return {
                        name: appData?.name || appName,
                        icon: appData?.icon,
                        exeName: rawExe,
                        cmdLine: `C:\\Program Files\\${cleanName}\\${rawExe}`,
                        exePath: `c:/program files/${cleanName.toLowerCase()}/${rawExe}`,
                        id: appId,
                    };
                } catch (e) {
                    Logger.log(`[Игра] Фолбэк для ${appName}: ${e?.message ?? e}`, 'debug');
                    const cleanName = this.sanitize(appName);
                    const safeExe = `${cleanName.replace(/\s+/g, "")}.exe`;
                    return {
                        name: appName,
                        exeName: safeExe,
                        cmdLine: `C:\\Program Files\\${cleanName}\\${safeExe}`,
                        exePath: `c:/program files/${cleanName.toLowerCase()}/${safeExe}`,
                        id: appId,
                    };
                }
            },

            async claimReward(questId) {
                return await Mods.API.post({
                    url: `/quests/${questId}/claim-reward`,
                    body: { platform: 0, location: 11, is_targeted: false, metadata_raw: null, metadata_sealed: null, traffic_metadata_raw: null, traffic_metadata_sealed: null },
                });
            },

            failTask(q, t, reason) {
                const cur = Logger.tasks.get(q.id)?.cur ?? 0;
                Logger.updateTask(q.id, { name: t.name, type: t.type, cur, max: t.target, status: "FAILED" });
                Logger.log(`[Задача] Прервано "${t.name}": ${reason}`, 'err');
                this.skipped.add(q.id);
                setTimeout(() => Logger.removeTask(q.id), 2000);
            },

            async VIDEO(q, t, s) {
                let cur = s?.progress?.[t.keyName]?.value ?? s?.progress?.[t.type]?.value ?? 0;
                let failCount = 0;
                Logger.updateTask(q.id, { name: t.name, type: "VIDEO", cur, max: t.target, status: "RUNNING" });
                const startTime = Date.now();
                let calls = 0;

                if (cur === 0) {
                    await sleep(rnd(200, 350));
                    cur = 0.2 + (Math.random() * 0.05);
                    try {
                        await Traffic.enqueue(`/quests/${q.id}/video-progress`, { timestamp: Number(cur.toFixed(6)) });
                        calls++;
                    } catch (e) { Logger.log(`[Видео] Стартовый пинг: ${e.message}`, 'debug'); }
                }

                while (cur < t.target && RUNTIME.running) {
                    const delayMs = rnd(3500, 4750);
                    await sleep(delayMs);
                    const elapsedSec = (delayMs / 1000) + (Math.random() * 0.02 - 0.01);
                    cur += elapsedSec;
                    const payloadTs = Number(Math.min(t.target, cur).toFixed(6));
                    try {
                        const r = await Traffic.enqueue(`/quests/${q.id}/video-progress`, { timestamp: payloadTs });
                        calls++;
                        const serverVal = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.WATCH_VIDEO?.value;
                        if (serverVal > cur) cur = Math.min(t.target, serverVal);
                        if (r?.body?.completed_at) break;
                        failCount = 0;
                    } catch (e) {
                        failCount++;
                        const err = ErrorHandler.classify(e);
                        if (err.isClientError) {
                            Logger.log(`[Задача] Видео недоступно (HTTP ${err.status}).`, 'warn');
                            return this.failTask(q, t, `Ошибка клиента ${err.status}`);
                        }
                        if (failCount >= SYS.MAX_TASK_FAILURES) return this.failTask(q, t, 'Слишком много сетевых ошибок');
                        Logger.log(`[Задача] VIDEO (${failCount}/${SYS.MAX_TASK_FAILURES}): ${err.message}`, 'debug');
                    }
                    Logger.updateTask(q.id, { name: t.name, type: "VIDEO", cur, max: t.target, status: "RUNNING" });
                    if (Date.now() - startTime > SYS.MAX_TIME) return this.failTask(q, t, 'Превышен таймаут');
                }
                if (RUNTIME.running) {
                    Logger.log(`[Задача] VIDEO "${t.name}" за ${calls} вызовов`, 'debug');
                    this.finish(q, t);
                }
            },

            GAME(q, t, s) { return this.generic(q, t, "GAME", "PLAY_ON_DESKTOP", s); },
            STREAM(q, t, s) { return this.generic(q, t, "STREAM", "STREAM_ON_DESKTOP", s); },

            async generic(q, t, type, key, s) {
                if (!RUNTIME.running) return;
                const gameData = await this.fetchGameData(t.appId, t.name);

                return new Promise(resolve => {
                    const pid = rnd(2500, 12500) * 4;
                    const game = {
                        id: gameData.id, name: gameData.name, icon: gameData.icon,
                        pid, pidPath: [pid], processName: gameData.name, start: Date.now(),
                        exeName: gameData.exeName, exePath: gameData.exePath, cmdLine: gameData.cmdLine,
                        executables: [{ os: 'win32', name: gameData.exeName, is_launcher: false }],
                        windowHandle: 0, fullscreenType: 0, overlay: true, sandboxed: false,
                        hidden: false, isLauncher: false,
                    };

                    let cleanupHook;
                    let cleaned = false;
                    let safetyTimer;

                    if (type === "STREAM") {
                        const real = Mods.StreamStore?.getStreamerActiveStreamMetadata;
                        if (Mods.StreamStore) {
                            Mods.StreamStore.getStreamerActiveStreamMetadata = () => ({ id: gameData.id, pid, sourceName: gameData.name });
                        }
                        cleanupHook = () => { if (Mods.StreamStore) Mods.StreamStore.getStreamerActiveStreamMetadata = real; };
                    } else {
                        Patcher.add(game);
                        cleanupHook = () => Patcher.remove(game);
                    }

                    Logger.updateTask(q.id, { name: t.name, type, cur: 0, max: t.target, status: "RUNNING" });
                    Logger.log(`[Задача] Запущен ${type}: ${gameData.name}`, 'info');

                    const finish = () => {
                        if (cleaned) return;
                        cleaned = true;
                        clearTimeout(safetyTimer);
                        try { cleanupHook(); } catch (e) { Logger.log(`[Задача] Очистка: ${e.message}`, 'debug'); }
                        try { Mods.Dispatcher?.unsubscribe(CONST.EVT.HEARTBEAT, check); } catch (e) {
                            Logger.log(`[Диспетчер] Ошибка отписки: ${e.message}`, 'debug');
                        }
                        RUNTIME.cleanups.delete(finish);
                    };

                    safetyTimer = setTimeout(() => {
                        if (RUNTIME.running) this.failTask(q, t, 'Превышен таймаут (25м)');
                        finish();
                        resolve();
                    }, SYS.MAX_TIME);

                    const check = (d) => {
                        if (!RUNTIME.running) { finish(); resolve(); return; }
                        if (d?.questId !== q.id) return;
                        const prog = d.userStatus?.progress?.[key]?.value ?? d.userStatus?.streamProgressSeconds ?? 0;
                        Logger.updateTask(q.id, { name: t.name, type, cur: prog, max: t.target, status: "RUNNING" });
                        if (prog >= t.target) { finish(); this.finish(q, t); resolve(); }
                    };

                    Mods.Dispatcher?.subscribe(CONST.EVT.HEARTBEAT, check);
                    RUNTIME.cleanups.add(finish);
                });
            },

            async ACHIEVEMENT(q, t) {
                Logger.updateTask(q.id, { name: t.name, type: "ACHIEVEMENT", cur: 0, max: t.target, status: "RUNNING" });
                let chan = null;
                try {
                    chan = Mods.ChanStore?.getSortedPrivateChannels()?.[0]?.id
                        ?? Object.values(Mods.GuildChanStore?.getAllGuilds() ?? {}).find(g => g?.VOCAL?.length)?.VOCAL?.[0]?.channel?.id;
                } catch (e) { Logger.log(`[Достижение] Канал: ${e.message}`, 'debug'); }

                if (chan) {
                    Logger.log(`[Задача] Спуфинг heartbeat для "${t.name}"...`, 'info');
                    const key = `call:${chan}:${rnd(1000, 9999)}`;
                    let cur = 0;
                    let failCount = 0;
                    while (cur < t.target && RUNTIME.running) {
                        try {
                            const r = await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: false });
                            cur = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.ACHIEVEMENT_IN_ACTIVITY?.value ?? cur;
                            Logger.updateTask(q.id, { name: t.name, type: "ACHIEVEMENT", cur, max: t.target, status: "RUNNING" });
                            failCount = 0;
                            if (cur >= t.target) {
                                try { await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: true }); } catch (_) {}
                                break;
                            }
                        } catch (e) {
                            failCount++;
                            const err = ErrorHandler.classify(e);
                            if (err.isClientError) { Logger.log(`[Достижение] Отклонен (HTTP ${err.status}).`, 'warn'); break; }
                            if (failCount >= SYS.MAX_TASK_FAILURES) { Logger.log(`[Достижение] Много ошибок.`, 'warn'); break; }
                        }
                        await sleep(rnd(19000, 22000));
                    }
                    if (cur >= t.target && RUNTIME.running) return this.finish(q, t);
                }
                if (!RUNTIME.running) return;
                Logger.log(`[Задача] Пропуск "${t.name}" — нет рабочих путей.`, 'warn');
                return this.failTask(q, t, 'Невозможно автозавершить');
            },

            async ACTIVITY(q, t) {
                let chan = null;
                try {
                    chan = Mods.ChanStore?.getSortedPrivateChannels()?.[0]?.id
                        ?? Object.values(Mods.GuildChanStore?.getAllGuilds() ?? {}).find(g => g?.VOCAL?.length)?.VOCAL?.[0]?.channel?.id;
                } catch (e) { Logger.log(`[ACTIVITY] Канал: ${e.message}`, 'debug'); }
                if (!chan) return this.failTask(q, t, 'Голосовой канал не найден');

                const key = `call:${chan}:${rnd(1000, 9999)}`;
                let cur = 0;
                let failCount = 0;
                Logger.updateTask(q.id, { name: t.name, type: "ACTIVITY", cur, max: t.target, status: "RUNNING" });
                const startTime = Date.now();

                while (cur < t.target && RUNTIME.running) {
                    try {
                        const r = await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: false });
                        cur = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.PLAY_ACTIVITY?.value ?? cur + 20;
                        Logger.updateTask(q.id, { name: t.name, type: "ACTIVITY", cur, max: t.target, status: "RUNNING" });
                        failCount = 0;
                        if (cur >= t.target) {
                            try { await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: true }); } catch (_) {}
                            break;
                        }
                    } catch (e) {
                        failCount++;
                        const err = ErrorHandler.classify(e);
                        if (err.isClientError) { Logger.log(`[ACTIVITY] Недоступно (HTTP ${err.status}).`, 'warn'); return this.failTask(q, t, `Ошибка ${err.status}`); }
                        if (failCount >= SYS.MAX_TASK_FAILURES) return this.failTask(q, t, 'Слишком много ошибок');
                        Logger.log(`[ACTIVITY] Ошибка (${failCount}/${SYS.MAX_TASK_FAILURES}): ${err.message}`, 'debug');
                    }
                    if (Date.now() - startTime > SYS.MAX_TIME) return this.failTask(q, t, 'Превышен таймаут');
                    await sleep(rnd(19000, 22000));
                }
                if (RUNTIME.running && cur >= t.target) this.finish(q, t);
            },

            async finish(q, t) {
                Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "COMPLETED" });
                Logger.log(`[Задача] Завершено "${t.name}"!`, 'success');
                Sound.play('tick');

                // История
                ctx.History?.add({
                    id: q.id,
                    name: t.name,
                    type: t.type,
                    target: t.target,
                    appId: t.appId,
                    completedAt: Date.now(),
                    claimed: false,
                });

                // Уведомление
                if (ctx.RUNTIME.notifyOnFinish) {
                    try {
                        if (typeof Notification !== 'undefined') {
                            if (Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (_) {} }
                            const focused = document.hasFocus();
                            if (Notification.permission === 'granted' && (!focused || ctx.RUNTIME.notifyInFocus)) {
                                new Notification("FQuest: Квест завершен", { body: t.name, tag: `fquest-${q.id}` });
                            }
                        }
                    } catch (e) { Logger.log(`[Уведомление] ${e.message}`, 'debug'); }
                }

                // Авто-клейм
                if (RUNTIME.autoClaim) {
                    try {
                        await sleep(rnd(2500, 6000));
                        if (!RUNTIME.running) return;
                        const claimRes = await this.claimReward(q.id);
                        if (claimRes?.body?.claimed_at) {
                            Logger.log(`[Получение] Награда за "${t.name}" получена!`, 'success');
                            Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "CLAIMED" });
                            ctx.History?.markClaimed(q.id);
                            setTimeout(() => Logger.removeTask(q.id), 2000);
                            return;
                        }
                    } catch (e) {
                        const needsCaptcha = e?.body?.captcha_key || e?.body?.captcha_sitekey;
                        if (needsCaptcha) Logger.log(`[Получение] Капча для "${t.name}".`, 'warn');
                        else Logger.log(`[Получение] Ошибка для "${t.name}": ${e?.body?.message ?? e?.message}`, 'err');
                    }
                }
                Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "COMPLETED", claimable: true, questId: q.id });
            },
        };
    },
};