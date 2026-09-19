/* FQuest · modules/logger.js
 * Логи + ticker + рендер карточек задач */

module.exports = {
    createLogger(ctx) {
        const { RUNTIME, CONFIG, ICONS, esc, Mods } = ctx;

        return {
            root: null,
            tasks: new Map(),
            tickerId: null,

            init(rootEl) {
                this.root = rootEl;
                this.startTicker();
            },

            _getPct(t) {
                if (t.done) return 100;
                if (t.pending || t.failed || !t.max) return 0;
                return Math.min(100, (t.cur / t.max) * 100);
            },

            startTicker() {
                if (this.tickerId) clearInterval(this.tickerId);
                this.tickerId = setInterval(() => {
                    if (!RUNTIME.running) return clearInterval(this.tickerId);
                    for (const [id, task] of this.tasks.entries()) {
                        if (task.status === "RUNNING" && task.type !== "ACHIEVEMENT") {
                            let cur = Math.min(task.cur + 1, task.max);
                            this.updateTask(id, { cur });
                        }
                    }
                }, 1000);
            },

            updateTask(id, data) {
                const oldData = this.tasks.get(id);
                const isPending = data.status === "PENDING" || data.status === "QUEUE";
                const isDone = data.status === "COMPLETED" || data.status === "CLAIMED";
                const isFailed = data.status === "FAILED";
                const newData = { ...oldData, ...data, done: isDone, pending: isPending, failed: isFailed };
                this.tasks.set(id, newData);

                if (oldData && oldData.status === newData.status && oldData.removing === newData.removing &&
                    oldData.claimable === newData.claimable && oldData.claimState === newData.claimState &&
                    oldData.actionRequired === newData.actionRequired) {
                    const card = document.getElementById(`fquest-task-${id}`);
                    if (card) {
                        const pct = this._getPct(newData);
                        const fill = card.querySelector('.progress-fill');
                        if (fill) fill.style.width = `${pct}%`;
                        const pt = card.querySelector('.progress-text');
                        if (pt) {
                            const unit = newData.type === 'ACHIEVEMENT' ? '' : 'с';
                            pt.textContent = `${Math.min(Math.floor(newData.cur), newData.max)} / ${newData.max}${unit}`;
                        }
                        return;
                    }
                }
                this.render();
            },

            removeTask(id) {
                if (this.tasks.has(id)) {
                    this.tasks.get(id).removing = true;
                    this.render();
                    setTimeout(() => { this.tasks.delete(id); this.render(); }, 400);
                }
            },

            log(msg, type = 'info') {
                const colors = { info: CONFIG.THEME, success: CONFIG.SUCCESS, warn: CONFIG.WARN, err: CONFIG.ERR, debug: "#6B7A94" };
                console.log(`%c[FQuest] %c${msg}`, `color: ${CONFIG.THEME}; font-weight: bold;`, `color: ${colors[type] || colors.info}`);
                try {
                    const box = document.getElementById('fquest-logs');
                    if (box && type !== 'debug') {
                        const el = document.createElement('div');
                        el.className = `log-item c-${type}`;
                        el.innerHTML = `<span class="log-ts">${new Date().toLocaleTimeString().split(' ')[0]}</span> <span>${esc(msg)}</span>`;
                        box.appendChild(el);
                        box.scrollTop = box.scrollHeight;
                        while (box.children.length > CONFIG.MAX_LOG_ITEMS) box.firstChild.remove();
                    }
                } catch (_) { }
            },

            render() {
                const body = document.getElementById('fquest-body');
                if (!body) return;
                if (ctx.RUNTIME.activeTab !== 'quests') return;
                if (!this.tasks.size) {
                    body.innerHTML = `<div class="fq-empty">Ожидание задач...</div>`;
                    return;
                }

                const sorted = [...this.tasks.entries()].sort((a, b) => {
                    const ta = a[1], tb = b[1];
                    if (ta.done !== tb.done) return ta.done ? 1 : -1;
                    if (ta.failed !== tb.failed) return ta.failed ? 1 : -1;
                    if (ta.pending !== tb.pending) return ta.pending ? 1 : -1;
                    if (!ta.done && !ta.pending && !tb.done && !tb.pending) {
                        const pctA = ta.max ? ta.cur / ta.max : 0;
                        const pctB = tb.max ? tb.cur / tb.max : 0;
                        return pctB - pctA;
                    }
                    return 0;
                });

                const cards = sorted.map(([id, t]) => {
                    const pct = t.pending || t.failed ? 0 : Math.min(100, (t.cur / t.max) * 100);
                    const icon =
                        t.done ? ICONS.CHECK :
                        t.failed ? ICONS.STOP :
                        t.pending ? ICONS.CLOCK :
                        t.type === 'VIDEO' ? ICONS.VIDEO :
                        t.type === 'ACHIEVEMENT' ? ICONS.ACTIVITY :
                        t.type?.includes('GAME') ? ICONS.GAME :
                        t.type?.includes('STREAM') ? ICONS.STREAM : ICONS.BOLT;

                    let statusText = t.status === 'CLAIMED' ? 'ПОЛУЧЕНО' : t.done ? 'ЗАВЕРШЕН' : t.status;
                    let progressLabel = t.pending ? 'В очереди' : t.failed ? 'Прервано' : 'Прогресс';
                    const unit = t.type === 'ACHIEVEMENT' ? '' : 'с';
                    let actionBtn = '';

                    if (t.claimable) {
                        if (t.claimState === 'WAITING') actionBtn = `<button class="claim-btn" disabled>ОЖИДАНИЕ...</button>`;
                        else if (t.claimState === 'FAILED') actionBtn = `<button class="claim-btn failed" disabled>ТРЕБУЕТСЯ ДЕЙСТВИЕ</button>`;
                        else actionBtn = `<button class="claim-btn" data-id="${id}">ПОЛУЧИТЬ</button>`;
                    } else if (t.actionRequired === 'ENROLL') {
                        statusText = 'ТРЕБУЕТСЯ ДЕЙСТВИЕ';
                        progressLabel = 'Примите квест в Discord';
                        actionBtn = `<button class="goto-btn">К КВЕСТАМ</button>`;
                    } else if (t.type === 'ACHIEVEMENT' && t.status === 'RUNNING') {
                        statusText = 'ТРЕБУЕТСЯ ДЕЙСТВИЕ';
                        progressLabel = 'Выполните вручную';
                        actionBtn = `<button class="goto-btn">К КВЕСТАМ</button>`;
                    }

                    const stateClass = t.done ? 'done' : t.failed ? 'failed' : t.pending ? 'pending' : 'running';
                    const removingClass = t.removing ? 'removing' : '';

                    return `
                    <div id="fquest-task-${id}" class="task-card ${stateClass} ${removingClass}">
                        <div class="task-top">
                            <div class="task-icon">${icon}</div>
                            <div class="task-info">
                                <div class="task-status">${statusText}</div>
                                <div class="task-name" title="${esc(t.name)}">${esc(t.name)}</div>
                            </div>
                        </div>
                        ${!t.done ? `
                            <div class="task-progress">
                                <span>${progressLabel}</span>
                                ${actionBtn ? '' : `<span class="progress-text">${Math.min(Math.floor(t.cur), t.max)} / ${t.max}${unit}</span>`}
                            </div>
                            <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
                        ` : ''}
                        ${actionBtn ? `<div class="task-actions">${actionBtn}</div>` : ''}
                    </div>`;
                }).join('');

                body.innerHTML = `<div class="fquest-grid">${cards}</div>`;

                requestAnimationFrame(() => {
                    body.querySelectorAll('.task-card').forEach((el, i) => {
                        el.style.animationDelay = `${i * 55}ms`;
                    });
                });
            },

            /* ——— Quest picker (выбор квестов) ——— */
            showQuestPicker(quests) {
                return new Promise((resolve) => {
                    const body = document.getElementById('fquest-body');
                    const logs = document.getElementById('fquest-logs');

                    const closePicker = (data) => {
                        if (logs) logs.style.display = 'block';
                        if (body) { body.classList.remove('picker-mode'); body.innerHTML = ''; }
                        resolve(data);
                    };

                    if (!body) return closePicker({ selectedQuests: new Set(), autoEnroll: false, autoClaim: false, playSound: false, randomDelay: false });
                    if (logs) logs.style.display = 'none';

                    const items = [];
                    const rewardTypes = new Map();
                    const questTypes = new Set();
                    const REWARD_META = { 1: { label: "В ИГРЕ", color: "#e67e22" }, 3: { label: "УКРАШЕНИЕ", color: "#a358f2" }, 4: { label: "СФЕРЫ", color: "#8B5CF6" } };
                    const REWARD_FALLBACK = { label: "ДРУГОЕ", color: "#6B7A94" };

                    quests.forEach(q => {
                        const cfg = q.config?.taskConfig ?? q.config?.taskConfigV2;
                        if (!cfg?.tasks) return;
                        const typeData = ctx.Tasks.detectType(cfg, q.config?.application?.id);
                        if (!typeData) return;
                        if (!ctx.SYS.IS_DESKTOP && (typeData.type === 'GAME' || typeData.type === 'STREAM')) return;
                        const rw = q.config?.rewardsConfig?.rewards?.[0];
                        const rewardType = rw?.type ?? 0;
                        const rewardText = rw?.messages?.name ?? "Неизвестная награда";
                        const meta = REWARD_META[rewardType] ?? REWARD_FALLBACK;
                        const displayType = typeData.type === 'WATCH_VIDEO' ? 'VIDEO' : typeData.type;
                        questTypes.add(displayType);
                        if (!rewardTypes.has(rewardType)) rewardTypes.set(rewardType, { label: meta.label, count: 0, type: rewardType, color: meta.color });
                        rewardTypes.get(rewardType).count++;
                        items.push({ id: q.id, name: q.config?.messages?.questName ?? "Неизвестный квест", type: displayType, rewardType, rewardText, color: meta.color });
                    });

                    if (!items.length) return closePicker({ selectedQuests: new Set(), autoEnroll: false, autoClaim: false, playSound: false, randomDelay: false });

                    const buildCard = (q) => `
                        <label class="quest-pick" data-rt="${q.rewardType}" data-qt="${q.type}">
                            <input type="checkbox" name="quests" value="${q.id}" class="native-cb" checked>
                            <div class="task-info">
                                <div class="task-name" title="${esc(q.name)}">${esc(q.name)}</div>
                                <div class="task-progress" style="justify-content:flex-start; gap:8px;">
                                    <span style="text-transform:uppercase; font-size:9px;">${esc(q.type)}</span>
                                    <span style="color:${q.color}; font-size:9px;">${esc(q.rewardText)}</span>
                                </div>
                            </div>
                        </label>`;

                    const buildToggle = (name, label, isChecked) => `
                        <div class="fquest-option">
                            <span class="fquest-option-label">${label}</span>
                            <input type="checkbox" name="${name}" class="native-toggle" ${isChecked ? 'checked' : ''}>
                        </div>`;

                    body.innerHTML = `
                        <form id="fquest-picker-form">
                            <div id="fquest-options-panel" style="display:none;">
                                ${rewardTypes.size > 1 ? `
                                    <div class="picker-section-title">Фильтр по награде</div>
                                    <div class="reward-filters">
                                        ${[...rewardTypes.values()].map(rt => `<button type="button" class="reward-filter" data-rt="${rt.type}">${rt.label} (${rt.count})</button>`).join('')}
                                    </div>
                                ` : ''}
                                ${questTypes.size > 1 ? `
                                    <div class="picker-section-title">Фильтр по типу</div>
                                    <div class="reward-filters">
                                        ${[...questTypes].map(t => `<button type="button" class="type-filter" data-qt="${t}">${t}</button>`).join('')}
                                    </div>
                                ` : ''}
                                <div class="picker-section-title">Настройки</div>
                                <div class="picker-options">
                                    ${buildToggle('autoEnroll', 'Авто-участие в квестах', RUNTIME.autoEnroll)}
                                    ${buildToggle('autoClaim', 'Авто-получение наград', RUNTIME.autoClaim)}
                                    ${buildToggle('playSound', 'Звук при завершении', RUNTIME.playSound)}
                                    ${buildToggle('randomDelay', 'Случайная задержка 1-30 мин', RUNTIME.randomDelay)}
                                </div>
                            </div>

                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <div class="picker-section-title" style="margin:0;">Доступные квесты</div>
                                <span class="ctrl-btn ctrl-opts" id="fquest-opts" title="Настройки">${ICONS.OPT}</span>
                            </div>

                            <div id="fquest-quest-list" class="picker-quest-list">${items.map(buildCard).join('')}
                                <div id="fquest-no-quests" class="fq-empty" style="display:none; grid-column:1/-1;">Нет доступных квестов</div>
                            </div>

                            <div class="picker-actions">
                                <button type="button" class="quest-pick-btn deselect" id="select-all-btn">СНЯТЬ ВСЕ</button>
                                <button type="submit" class="quest-pick-btn start" id="start-btn"><span id="start-btn-text">СТАРТ (${items.length})</span></button>
                            </div>
                        </form>`;

                    const form = document.getElementById('fquest-picker-form');
                    const selectAllBtn = document.getElementById('select-all-btn');
                    const startBtn = document.getElementById('start-btn');

                    document.getElementById('fquest-opts').addEventListener('click', () => {
                        const panel = document.getElementById('fquest-options-panel');
                        const list = document.getElementById('fquest-quest-list');
                        const open = panel.style.display === 'none';
                        panel.style.display = open ? '' : 'none';
                        list.style.display = open ? 'none' : '';
                    });

                    const getVisibleCheckboxes = () => Array.from(form.querySelectorAll('.quest-pick input[type="checkbox"]'))
                        .filter(cb => !cb.closest('.quest-pick').classList.contains('hidden'));

                    const syncUI = () => {
                        const visibleCbs = getVisibleCheckboxes();
                        const totalChecked = visibleCbs.filter(cb => cb.checked).length;
                        const sbt = document.getElementById('start-btn-text');
                        if (sbt) sbt.textContent = `СТАРТ (${totalChecked})`;
                        startBtn.disabled = totalChecked === 0;
                        if (visibleCbs.length === 0) { selectAllBtn.disabled = true; selectAllBtn.textContent = 'ВЫБРАТЬ ВСЕ'; }
                        else { selectAllBtn.disabled = false; selectAllBtn.textContent = visibleCbs.every(cb => cb.checked) ? 'СНЯТЬ ВСЕ' : 'ВЫБРАТЬ ВСЕ'; }
                        const noQ = document.getElementById('fquest-no-quests');
                        if (noQ) noQ.style.display = visibleCbs.length === 0 ? 'block' : 'none';
                    };

                    form.addEventListener('change', (e) => { if (e.target.name === 'quests') syncUI(); });

                    const activeRewards = new Set([...rewardTypes.keys()].map(String));
                    const activeTypes = new Set([...questTypes]);
                    const applyFilters = () => {
                        form.querySelectorAll('.quest-pick').forEach(el => {
                            const rt = el.getAttribute('data-rt');
                            const qt = el.getAttribute('data-qt');
                            el.classList.toggle('hidden', !(activeRewards.has(rt) && activeTypes.has(qt)));
                        });
                        syncUI();
                    };
                    const FILTER_KINDS = [
                        { cls: 'reward-filter', attr: 'data-rt', set: activeRewards },
                        { cls: 'type-filter', attr: 'data-qt', set: activeTypes },
                    ];
                    form.addEventListener('click', (e) => {
                        const kind = FILTER_KINDS.find(k => e.target.classList.contains(k.cls));
                        if (kind) {
                            e.preventDefault();
                            const value = e.target.getAttribute(kind.attr);
                            e.target.classList.toggle('off');
                            if (e.target.classList.contains('off')) kind.set.delete(value);
                            else kind.set.add(value);
                            applyFilters();
                            return;
                        }
                        if (e.target.id === 'select-all-btn') {
                            e.preventDefault();
                            const visibleCbs = getVisibleCheckboxes();
                            if (visibleCbs.length === 0) return;
                            const shouldCheck = !visibleCbs.every(cb => cb.checked);
                            visibleCbs.forEach(cb => { cb.checked = shouldCheck; });
                            syncUI();
                        }
                    });

                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const selected = getVisibleCheckboxes().filter(cb => cb.checked);
                        if (selected.length === 0) return;
                        const data = new FormData(form);
                        closePicker({
                            selectedQuests: new Set(selected.map(cb => cb.value)),
                            autoEnroll: data.has('autoEnroll'),
                            autoClaim: data.has('autoClaim'),
                            playSound: data.has('playSound'),
                            randomDelay: data.has('randomDelay'),
                        });
                    });

                    body.classList.add('picker-mode');
                    syncUI();

                    requestAnimationFrame(() => {
                        body.querySelectorAll('.quest-pick').forEach((el, i) => {
                            el.style.animationDelay = `${i * 35}ms`;
                        });
                    });
                });
            },
        };
    },
};