/* ============================================================
 *  FQuest · modules/consent.js
 *  OAuth-подтверждение + Sound
 * ============================================================ */

module.exports = {
    createConsent(ctx) {
        const { esc, ICONS } = ctx;

        return {
            _granted: new Set(),
            TIMEOUT: 60000,
            SCOPES: ['identify', 'applications.commands', 'applications.entitlements'],

            ask(appId, appName) {
                if (this._granted.has(appId)) return Promise.resolve(true);

                return new Promise(resolve => {
                    const ov = document.createElement('div');
                    ov.id = 'fquest-consent';
                    ov.innerHTML = this._template(appId, appName);
                    document.body.appendChild(ov);

                    let done = false;
                    const finish = (v) => {
                        if (done) return;
                        done = true;
                        clearTimeout(timer);
                        document.removeEventListener('keydown', onKey);
                        if (v && ov.querySelector('#fq-remember')?.checked) {
                            this._granted.add(appId);
                        }
                        ov.remove();
                        resolve(v);
                    };

                    const onKey = (e) => { if (e.key === 'Escape') finish(false); };

                    ov.querySelector('#fq-yes')?.addEventListener('click', () => finish(true));
                    ov.querySelector('#fq-no')?.addEventListener('click', () => finish(false));
                    ov.addEventListener('mousedown', (e) => { if (e.target === ov) finish(false); });
                    document.addEventListener('keydown', onKey);

                    const timer = setTimeout(() => finish(false), this.TIMEOUT);
                });
            },

            _template(appId, appName) {
                const appText = appName ? `${esc(appName)} (${esc(appId)})` : `Приложение ${esc(appId)}`;
                const scopes = this.SCOPES.map(s => `<li>${esc(s)}</li>`).join('');
                return `
                    <div class="fq-consent-box">
                        <div class="fq-consent-head">Авторизовать приложение?</div>
                        <div class="fq-consent-body">
                            <div>FQuest должен авторизовать приложение через OAuth на вашем аккаунте Discord:</div>
                            <div class="fq-consent-app">${appText}</div>
                            <div style="color:var(--fq-muted);">Запрашиваемые разрешения:</div>
                            <ul class="fq-consent-scopes">${scopes}</ul>
                            <div class="fq-consent-warn">FQuest отзывает разрешение сразу после завершения квеста.</div>
                            <label class="fq-consent-remember">
                                <input type="checkbox" id="fq-remember" class="native-cb"> Не спрашивать для этого приложения за сессию
                            </label>
                        </div>
                        <div class="fq-consent-actions">
                            <button id="fq-no" class="quest-pick-btn deselect" style="flex:1;">Отмена</button>
                            <button id="fq-yes" class="quest-pick-btn start" style="flex:1;">Авторизовать</button>
                        </div>
                    </div>`;
            },
        };
    },

    createSound(ctx) {
        const { RUNTIME } = ctx;
        return {
            _ctx: null,
            play(type) {
                if (!RUNTIME.playSound) return;
                try {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return;
                    if (!this._ctx || this._ctx.state === 'closed') this._ctx = new Ctx();
                    const o = this._ctx.createOscillator();
                    const g = this._ctx.createGain();
                    o.connect(g);
                    g.connect(this._ctx.destination);
                    o.type = 'sine';
                    const t0 = this._ctx.currentTime;
                    if (type === 'done') {
                        o.frequency.setValueAtTime(523.25, t0);
                        o.frequency.setValueAtTime(659.25, t0 + 0.12);
                        o.frequency.setValueAtTime(783.99, t0 + 0.24);
                        g.gain.setValueAtTime(0.55, t0);
                        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
                        o.start(t0);
                        o.stop(t0 + 0.6);
                    } else {
                        o.frequency.value = 880;
                        g.gain.setValueAtTime(0.45, t0);
                        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
                        o.start(t0);
                        o.stop(t0 + 0.2);
                    }
                } catch (_) {}
            },
        };
    },
};