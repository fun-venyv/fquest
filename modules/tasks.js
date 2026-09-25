/* FQuest · modules/tasks.js */

module.exports = {
    createTasks(ctx) {
        return {
            skipped: new Set(),

            get RUNTIME()      { return ctx.RUNTIME; },
            get SYS()          { return ctx.SYS; },
            get CONST()        { return ctx.CONST; },
            get Mods()         { return ctx.Mods; },
            get Logger()       { return ctx.Logger; },
            get Sound()        { return ctx.Sound; },
            get ErrorHandler() { return ctx.ErrorHandler; },
            get Consent()      { return ctx.Consent; },

            sleep: ctx.sleep,
            rnd:   ctx.rnd,
            esc:   ctx.esc,

            sanitize(name) {
                return String(name).replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, " ");
            },

            detectType(cfg, applicationId) {
                if (!cfg?.tasks || typeof cfg.tasks !== 'object') return null;
                const taskKeys = Object.keys(cfg.tasks);
                if (!taskKeys.length) return null;

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

                if (applicationId) {
                    return { type: "GAME", keyName: "PLAY_ON_DESKTOP", target: cfg.tasks[taskKeys[0]]?.target ?? 0 };
                }
                return null;
            },

            async VIDEO(q, t, s) {
                let cur = s?.progress?.[t.keyName]?.value ?? s?.progress?.[t.type]?.value ?? 0;
                let failCount = 0;

                this.Logger.updateTask(q.id, { name: t.name, type: "VIDEO", cur, max: t.target, status: "RUNNING" });
                this.Logger.log(`[Задача] VIDEO "${t.name}"`, 'info');

                const startTime = Date.now();
                let calls = 0;

                if (cur === 0) {
                    await this.sleep(this.rnd(200, 350));
                    if (!this.RUNTIME.running) return;
                    cur = 0.2 + (Math.random() * 0.05);
                    try {
                        await this.Mods.api.post({ url: `/quests/${q.id}/video-progress`, body: { timestamp: Number(cur.toFixed(6)) } });
                        calls++;
                    } catch (e) {
                        this.Logger.log(`[Видео] Ошибка начального пинга: ${e.message}`, 'debug');
                    }
                }

                while (cur < t.target && this.RUNTIME.running) {
                    const delayMs = this.rnd(3500, 4750);
                    await this.sleep(delayMs);
                    if (!this.RUNTIME.running) return;

                    const elapsedSec = (delayMs / 1000) + (Math.random() * 0.02 - 0.01);
                    cur += elapsedSec;

                    const payloadTs = Number(Math.min(t.target, cur).toFixed(6));

                    try {
                        const r = await this.Mods.api.post({ url: `/quests/${q.id}/video-progress`, body: { timestamp: payloadTs } });
                        calls++;
                        const serverVal = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.WATCH_VIDEO?.value;
                        if (serverVal > cur) cur = Math.min(t.target, serverVal);
                        if (r?.body?.completed_at) break;
                        failCount = 0;
                    } catch (e) {
                        failCount++;
                        const err = this.ErrorHandler.classify(e);
                        if (err.isClientError) {
                            this.Logger.log(`[Задача] Квест видео недоступен (HTTP ${err.status}). Пропускаем.`, 'warn');
                            return this.failTask(q, t, `Ошибка клиента ${err.status}`);
                        }
                        if (failCount >= this.SYS.MAX_TASK_FAILURES) {
                            return this.failTask(q, t, 'Слишком много сетевых ошибок');
                        }
                        this.Logger.log(`[Задача] Ошибка прогресса VIDEO (${failCount}/${this.SYS.MAX_TASK_FAILURES}): ${err.message}`, 'debug');
                    }

                    this.Logger.updateTask(q.id, { name: t.name, type: "VIDEO", cur, max: t.target, status: "RUNNING" });

                    if (Date.now() - startTime > this.SYS.MAX_TIME) {
                        return this.failTask(q, t, 'Превышен таймаут');
                    }
                }
                if (this.RUNTIME.running) {
                    this.Logger.log(`[Задача] VIDEO "${t.name}" выполнено за ${calls} вызовов API`, 'debug');
                    this.finish(q, t);
                }
            },

            async GAME(q, t, s) {
                if (!this.RUNTIME.running) return;
                if (!this.SYS.IS_DESKTOP) return this.failTask(q, t, 'Только в десктоп-приложении');

                const RunStore = this.Mods.RunningGameStore;
                const Dispatcher = this.Mods.FluxDispatcher;
                if (!RunStore || !Dispatcher) return this.failTask(q, t, 'RunStore/Dispatcher недоступны');

                let appData;
                try {
                    const res = await this.Mods.api.get({ url: `/applications/public?application_ids=${t.appId}` });
                    appData = res?.body?.[0];
                    if (!appData) throw new Error('Пустой ответ API');
                } catch (e) {
                    this.Logger.log(`[Игра] Пропуск "${t.name}": ${e?.message ?? e}`, 'debug');
                    return this.failTask(q, t, 'Ошибка получения данных игры');
                }

                const exeName = appData.executables?.find(x => x.os === "win32")?.name?.replace(">", "")
                    ?? appData.name.replace(/[\/\\:*?"<>|]/g, "");
                const pid = Math.floor(Math.random() * 30000) + 1000;

                const fakeGame = {
                    cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                    exeName,
                    exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                    hidden: false,
                    isLauncher: false,
                    id: t.appId,
                    name: appData.name,
                    pid: pid,
                    pidPath: [pid],
                    processName: appData.name,
                    start: Date.now(),
                };

                const realGames = RunStore.getRunningGames();
                const fakeGames = [fakeGame];
                const realGetRunningGames = RunStore.getRunningGames;
                const realGetGameForPID = RunStore.getGameForPID;

                RunStore.getRunningGames = () => fakeGames;
                RunStore.getGameForPID = (p) => fakeGames.find(x => x.pid === p);
                Dispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

                this.Logger.updateTask(q.id, { name: t.name, type: "GAME", cur: 0, max: t.target, status: "RUNNING" });
                this.Logger.log(`[Игра] Подделка "${appData.name}". Ждите ${Math.ceil(t.target / 60)} мин.`, 'info');

                return new Promise(resolve => {
                    let finished = false;
                    const restore = () => {
                        try {
                            RunStore.getRunningGames = realGetRunningGames;
                            RunStore.getGameForPID = realGetGameForPID;
                            Dispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                        } catch (_) {}
                    };
                    const finish = () => {
                        if (finished) return;
                        finished = true;
                        clearTimeout(safetyTimer);
                        restore();
                        try { Dispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", check); } catch (_) {}
                        this.RUNTIME.cleanups.delete(finish);
                        try { resolve(); } catch (_) {}
                    };
                    const safetyTimer = setTimeout(() => {
                        if (this.RUNTIME.running) this.failTask(q, t, 'Превышен таймаут (25м)');
                        finish();
                    }, this.SYS.MAX_TIME);
                    const check = (data) => {
                        if (!this.RUNTIME.running) { finish(); return; }
                        if (data?.questId !== q.id) return;
                        const progress = q.config?.configVersion === 1
                            ? (data.userStatus?.streamProgressSeconds ?? 0)
                            : Math.floor(data.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0);
                        this.Logger.updateTask(q.id, { name: t.name, type: "GAME", cur: progress, max: t.target, status: "RUNNING" });
                        if (progress >= t.target) {
                            this.Logger.log(`[Готово] GAME "${t.name}"!`, 'success');
                            finish();
                            this.finish(q, t);
                        }
                    };
                    Dispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", check);
                    this.RUNTIME.cleanups.add(finish);
                });
            },

            async STREAM(q, t, s) {
                if (!this.RUNTIME.running) return;
                if (!this.SYS.IS_DESKTOP) return this.failTask(q, t, 'Только в десктоп-приложении');

                const StreamStore = this.Mods.ApplicationStreamingStore;
                const Dispatcher = this.Mods.FluxDispatcher;
                if (!StreamStore || !Dispatcher) return this.failTask(q, t, 'StreamStore/Dispatcher недоступны');

                let appData = null;
                try {
                    const res = await this.Mods.api.get({ url: `/applications/public?application_ids=${t.appId}` });
                    appData = res?.body?.[0];
                } catch (_) {}

                if (!appData) {
                    this.Logger.log(`[Стрим] Пропуск "${t.name}" — нет данных приложения`, 'debug');
                    return this.failTask(q, t, 'Ошибка получения данных');
                }

                const appName = appData.name;
                const pid = Math.floor(Math.random() * 30000) + 1000;

                const realFunc = StreamStore.getStreamerActiveStreamMetadata;
                StreamStore.getStreamerActiveStreamMetadata = () => ({
                    id: t.appId,
                    pid,
                    sourceName: null,
                });

                this.Logger.updateTask(q.id, { name: t.name, type: "STREAM", cur: 0, max: t.target, status: "RUNNING" });
                this.Logger.log(`[Стрим] Подделка "${appName}". Стримьте ${Math.ceil(t.target / 60)} мин.`, 'info');
                this.Logger.log(`[Важно] В голосовом канале должен быть хотя бы 1 другой человек!`, 'warn');

                return new Promise(resolve => {
                    let finished = false;
                    const finish = () => {
                        if (finished) return;
                        finished = true;
                        clearTimeout(safetyTimer);
                        try { StreamStore.getStreamerActiveStreamMetadata = realFunc; } catch (_) {}
                        try { Dispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", check); } catch (_) {}
                        this.RUNTIME.cleanups.delete(finish);
                        try { resolve(); } catch (_) {}
                    };
                    const safetyTimer = setTimeout(() => {
                        if (this.RUNTIME.running) this.failTask(q, t, 'Превышен таймаут (25м)');
                        finish();
                    }, this.SYS.MAX_TIME);
                    const check = (data) => {
                        if (!this.RUNTIME.running) { finish(); return; }
                        if (data?.questId !== q.id) return;
                        const progress = q.config?.configVersion === 1
                            ? (data.userStatus?.streamProgressSeconds ?? 0)
                            : Math.floor(data.userStatus?.progress?.STREAM_ON_DESKTOP?.value ?? 0);
                        this.Logger.updateTask(q.id, { name: t.name, type: "STREAM", cur: progress, max: t.target, status: "RUNNING" });
                        if (progress >= t.target) {
                            this.Logger.log(`[Готово] STREAM "${t.name}"!`, 'success');
                            finish();
                            this.finish(q, t);
                        }
                    };
                    Dispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", check);
                    this.RUNTIME.cleanups.add(finish);
                });
            },

            async ACTIVITY(q, t) {
                if (!this.RUNTIME.running) return;

                const channelId = this.Mods.ChannelStore?.getSortedPrivateChannels?.()[0]?.id
                    ?? Object.values(this.Mods.GuildChannelStore?.getAllGuilds?.() ?? {}).find(x => x != null && x.VOCAL.length > 0)?.VOCAL[0]?.channel.id;

                if (!channelId) return this.failTask(q, t, 'Канал не найден');

                const streamKey = `call:${channelId}:1`;
                this.Logger.updateTask(q.id, { name: t.name, type: "ACTIVITY", cur: 0, max: t.target, status: "RUNNING" });
                this.Logger.log(`[Активность] "${t.name}" канал ${channelId}`, 'info');

                const startTime = Date.now();

                while (this.RUNTIME.running) {
                    try {
                        const res = await this.Mods.api.post({
                            url: `/quests/${q.id}/heartbeat`,
                            body: { stream_key: streamKey, terminal: false },
                        });
                        const progress = res?.body?.progress?.PLAY_ACTIVITY?.value ?? 0;
                        this.Logger.updateTask(q.id, { name: t.name, type: "ACTIVITY", cur: progress, max: t.target, status: "RUNNING" });

                        await this.sleep(this.rnd(18000, 22000));
                        if (!this.RUNTIME.running) return;

                        if (progress >= t.target) {
                            await this.Mods.api.post({
                                url: `/quests/${q.id}/heartbeat`,
                                body: { stream_key: streamKey, terminal: true },
                            });
                            break;
                        }
                    } catch (e) {
                        this.Logger.log(`[ACTIVITY] Ошибка: ${e?.message ?? e}`, 'err');
                        break;
                    }
                    if (Date.now() - startTime > this.SYS.MAX_TIME) {
                        return this.failTask(q, t, 'Превышен таймаут');
                    }
                }

                if (this.RUNTIME.running) {
                    this.Logger.log(`[Готово] ACTIVITY "${t.name}"!`, 'success');
                    this.finish(q, t);
                }
            },

            async ACHIEVEMENT(q, t) {
                this.Logger.updateTask(q.id, { name: t.name, type: "ACHIEVEMENT", cur: 0, max: t.target, status: "RUNNING" });
                let chan = null;
                try {
                    chan = this.Mods.ChannelStore?.getSortedPrivateChannels?.()?.[0]?.id
                        ?? Object.values(this.Mods.GuildChannelStore?.getAllGuilds?.() ?? {}).find(g => g?.VOCAL?.length)?.VOCAL?.[0]?.channel?.id;
                } catch (_) {}

                if (chan) {
                    this.Logger.log(`[Задача] Heartbeat для "${t.name}"...`, 'info');
                    const key = `call:${chan}:${this.rnd(1000, 9999)}`;
                    let cur = 0;
                    let failCount = 0;
                    while (cur < t.target && this.RUNTIME.running) {
                        try {
                            const r = await this.Mods.api.post({
                                url: `/quests/${q.id}/heartbeat`,
                                body: { stream_key: key, terminal: false },
                            });
                            cur = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.ACHIEVEMENT_IN_ACTIVITY?.value ?? cur;
                            this.Logger.updateTask(q.id, { name: t.name, type: "ACHIEVEMENT", cur, max: t.target, status: "RUNNING" });
                            failCount = 0;
                            if (cur >= t.target) {
                                try { await this.Mods.api.post({ url: `/quests/${q.id}/heartbeat`, body: { stream_key: key, terminal: true } }); } catch (_) {}
                                break;
                            }
                        } catch (e) {
                            failCount++;
                            if (failCount >= this.SYS.MAX_TASK_FAILURES) break;
                        }
                        await this.sleep(this.rnd(19000, 22000));
                    }
                    if (cur >= t.target && this.RUNTIME.running) return this.finish(q, t);
                }
                if (!this.RUNTIME.running) return;
                return this.failTask(q, t, 'Невозможно автозавершить');
            },

            async finish(q, t) {
                this.Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "COMPLETED" });
                this.Logger.log(`[Готово] "${t.name}"!`, 'success');
                this.Sound.play('tick');

                if (ctx.History) {
                    ctx.History.add({ id: q.id, name: t.name, type: t.type, target: t.target, appId: t.appId, completedAt: Date.now(), claimed: false });
                }

                try {
                    if (typeof Notification !== 'undefined') {
                        if (Notification.permission === 'default' && !this.RUNTIME.notifyPermission) {
                            try { this.RUNTIME.notifyPermission = await Notification.requestPermission(); } catch (_) {}
                        }
                        const perm = this.RUNTIME.notifyPermission || Notification.permission;
                        if (perm === 'granted' && (!document.hasFocus() || this.RUNTIME.notifyInFocus)) {
                            new Notification("FQuest: Квест завершен", { body: t.name, tag: `fquest-${q.id}` });
                        }
                    }
                } catch (_) {}

                if (this.RUNTIME.autoClaim) {
                    try {
                        await this.sleep(this.rnd(2500, 6000));
                        if (!this.RUNTIME.running) return;
                        const claimRes = await this.Mods.api.post({
                            url: `/quests/${q.id}/claim-reward`,
                            body: { platform: 0, location: 11, is_targeted: false, metadata_raw: null, metadata_sealed: null, traffic_metadata_raw: null, traffic_metadata_sealed: null },
                        });
                        if (claimRes?.body?.claimed_at) {
                            this.Logger.log(`[Получение] Награда за "${t.name}"!`, 'success');
                            this.Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "CLAIMED" });
                            setTimeout(() => this.Logger.removeTask(q.id), 2000);
                            return;
                        }
                    } catch (e) {
                        this.Logger.log(`[Получение] Ошибка: ${e?.body?.message ?? e?.message}`, 'err');
                    }
                }

                this.Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "COMPLETED", claimable: true, questId: q.id });
            },

            failTask(q, t, reason) {
                const cur = this.Logger?.tasks?.get(q.id)?.cur ?? 0;
                this.Logger.updateTask(q.id, { name: t.name, type: t.type, cur, max: t.target, status: "FAILED" });
                this.Logger.log(`[Задача] Прервано "${t.name}": ${reason}`, 'err');
                this.skipped.add(q.id);
                setTimeout(() => this.Logger.removeTask(q.id), 2000);
            },
        };
    },
};