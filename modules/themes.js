/* ============================================================
 *  FQuest · modules/themes.js
 * ============================================================ */

module.exports = {
    createThemes(ctx) {
        const { RUNTIME, platform } = ctx;

        let _active = null;
        let _rafId = null;
        let _intervalId = null;
        let _canvas = null;
        let _resizeObserver = null;
        let _lastFrame = 0;
        let _themes = null;

        const visListener = () => {
            if (document.visibilityState !== 'visible') return;
            setTimeout(() => {
                try { _themes?.resume?.(); } catch (_) {}
            }, 200);
        };
        document.addEventListener('visibilitychange', visListener);

        const getRoot = () => document.getElementById('fquest-ui');

        _themes = {
            apply(theme) {
                this.clear();
                _active = theme;

                switch (theme) {
                    case 'cyberpunk':  this._startCyberpunk(); break;
                    case 'midnight':   this._startMidnight(); break;
                    case 'sakura':     this._startSakura(); break;
                    case 'starfield':  this._startStarfield(); break;
                    case 'lofi':       this._startLofi(); break;
                    default: break;
                }
            },

            clear() {
                if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
                if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }

                const root = getRoot();
                if (root) {
                    try {
                        root.querySelectorAll('canvas[id^="fq-"]').forEach(c => c.remove());
                    } catch (_) {}
                }
                _canvas = null;

                if (_resizeObserver) {
                    try { _resizeObserver.disconnect(); } catch (_) {}
                    _resizeObserver = null;
                }

                if (root) {
                    root.style.removeProperty('background-image');
                    root.style.removeProperty('background');
                    root.style.removeProperty('box-shadow');
                    root.style.removeProperty('filter');
                    root.style.removeProperty('mix-blend-mode');

                    const head = root.querySelector('#fquest-head');
                    if (head) {
                        head.style.removeProperty('transform');
                        head.style.removeProperty('text-shadow');
                    }
                }

                if (typeof this._onResize === 'function') {
                    this._onResize = null;
                }

                if (typeof this._starfieldCleanup === 'function') {
                    try { this._starfieldCleanup(); } catch (_) {}
                    this._starfieldCleanup = null;
                }

                _active = null;
            },

            getActive() { return _active; },

            pause() {
                if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
                if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
            },

            resume() {
                const t = _active;
                if (!t) return;
                const root = getRoot();
                if (!root || root.style.display === 'none') return;
                platform?.Logger?.info?.(`[Theme] resume for "${t}"`);
                this.apply(t);
            },

            _makeCanvas(id, opacity = 1, blend = 'normal') {
                const root = getRoot();
                if (!root) return null;
                _canvas = document.createElement('canvas');
                _canvas.id = id;
                _canvas.style.cssText = `
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 0;
                    opacity: ${opacity};
                    mix-blend-mode: ${blend};
                `;
                root.insertBefore(_canvas, root.firstChild);

                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const resize = () => {
                    if (!_canvas || !root) return;
                    const w = root.clientWidth;
                    const h = root.clientHeight;
                    if (w === 0 || h === 0) return;
                    _canvas.width = w * dpr;
                    _canvas.height = h * dpr;
                    _canvas.style.width = w + 'px';
                    _canvas.style.height = h + 'px';
                    const c = _canvas.getContext('2d');
                    c.setTransform(dpr, 0, 0, dpr, 0, 0);
                    c.globalAlpha = 1;
                    c.globalCompositeOperation = 'source-over';
                    c.filter = 'none';
                    if (typeof this._onResize === 'function') this._onResize(w, h);
                };
                resize();
                _resizeObserver = new ResizeObserver(resize);
                _resizeObserver.observe(root);
                return _canvas;
            },
            _startCyberpunk() {
                const root = getRoot();
                if (!root) return;

                _intervalId = setInterval(() => {
                    if (_active !== 'cyberpunk') return;
                    if (Math.random() > 0.75) {
                        const target = root.querySelector('#fquest-head') || root;
                        target.style.textShadow = `${(Math.random() * 4 - 2).toFixed(1)}px 0 #FF2C9C, ${(Math.random() * 4 - 2).toFixed(1)}px 0 #00FFF0`;
                        target.style.transform = `translate(${(Math.random() * 2 - 1).toFixed(1)}px, 0)`;
                        setTimeout(() => {
                            target.style.removeProperty('text-shadow');
                            target.style.removeProperty('transform');
                        }, 70 + Math.random() * 90);
                    }
                }, 700);

                let t = 0;
                const pulse = () => {
                    if (_active !== 'cyberpunk') return;
                    t += 0.05;
                    const hue = 300 + Math.sin(t) * 30;
                    const glow = 12 + Math.sin(t * 1.3) * 6;
                    root.style.boxShadow = `0 24px 80px rgba(0,0,0,.85), 0 0 ${glow}px hsl(${hue}, 100%, 60%), 0 0 0 1px hsla(${hue}, 100%, 60%, .4) inset`;
                    _rafId = requestAnimationFrame(pulse);
                };
                _rafId = requestAnimationFrame(pulse);
            },
            _startMidnight() {
                const root = getRoot();
                if (!root) return;

                const canvas = this._makeCanvas('fq-midnight-canvas', 0.9);
                if (!canvas) return;
                const c2d = canvas.getContext('2d');

                let W = root.clientWidth, H = root.clientHeight;
                this._onResize = (w, h) => { W = w; H = h; };

                const blobs = [
                    { hue: 320, sat: 70, lit: 65, r: 0.55, ox: 0.25, oy: 0.30, vx: 0.00018, vy: 0.00011, phase: 0 },
                    { hue: 270, sat: 75, lit: 60, r: 0.50, ox: 0.70, oy: 0.65, vx: -0.00015, vy: 0.00013, phase: Math.PI * 0.6 },
                    { hue: 195, sat: 70, lit: 55, r: 0.45, ox: 0.55, oy: 0.85, vx: 0.00012, vy: -0.00014, phase: Math.PI * 1.3 },
                ];

                const t0 = performance.now();
                const draw = (ts) => {
                    if (_active !== 'midnight') return;
                    if (ts - _lastFrame < 40) { _rafId = requestAnimationFrame(draw); return; }
                    _lastFrame = ts;

                    const elapsed = ts - t0;
                    c2d.clearRect(0, 0, W, H);
                    c2d.globalCompositeOperation = 'lighter';

                    for (const b of blobs) {
                        const cx = W * (b.ox + Math.sin(elapsed * b.vx + b.phase) * 0.18);
                        const cy = H * (b.oy + Math.cos(elapsed * b.vy + b.phase) * 0.18);
                        const radius = Math.max(W, H) * b.r;
                        const grad = c2d.createRadialGradient(cx, cy, 0, cx, cy, radius);
                        grad.addColorStop(0, `hsla(${b.hue}, ${b.sat}%, ${b.lit}%, 0.35)`);
                        grad.addColorStop(0.5, `hsla(${b.hue}, ${b.sat}%, ${b.lit}%, 0.12)`);
                        grad.addColorStop(1, `hsla(${b.hue}, ${b.sat}%, ${b.lit}%, 0)`);
                        c2d.fillStyle = grad;
                        c2d.beginPath();
                        c2d.arc(cx, cy, radius, 0, Math.PI * 2);
                        c2d.fill();
                    }
                    c2d.globalCompositeOperation = 'source-over';
                    _rafId = requestAnimationFrame(draw);
                };
                _rafId = requestAnimationFrame(draw);
            },

            _startSakura() {
                const root = getRoot();
                if (!root) return;

                const canvas = this._makeCanvas('fq-sakura', 1.0);
                if (!canvas) return;
                const c2d = canvas.getContext('2d');

                let W = root.clientWidth, H = root.clientHeight;

                const tree = generateSakuraTree();

                let bgCanvas = null;
                let bgCtx = null;

                const renderStatic = () => {
                    if (!bgCanvas) {
                        bgCanvas = document.createElement('canvas');
                        bgCtx = bgCanvas.getContext('2d');
                    }
                    bgCanvas.width = W;
                    bgCanvas.height = H;
                    bgCtx.clearRect(0, 0, W, H);
                    drawSakuraTreeStatic(bgCtx, W, H, tree);
                };
                renderStatic();

                const MAX_PETALS = 35;
                const petals = [];

                const spawnPetal = () => ({
                    x: Math.random() * W,
                    y: -10 - Math.random() * 200,
                    size: 3 + Math.random() * 3.5,
                    fallSpeed: 0.35 + Math.random() * 0.55,
                    wobbleAmp: 1 + Math.random() * 2,
                    wobbleFreq: 0.0008 + Math.random() * 0.0015,
                    wobblePhase: Math.random() * Math.PI * 2,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.03,
                    driftX: (Math.random() * 2 - 1) * 0.18,
                    hue: 335 + Math.random() * 15,
                    sat: 68 + Math.random() * 18,
                    lit: 82 + Math.random() * 10,
                    baseAlpha: 0.55 + Math.random() * 0.4,
                });

                for (let i = 0; i < MAX_PETALS; i++) {
                    const p = spawnPetal();
                    p.y = Math.random() * H;
                    petals.push(p);
                }

                const FRAME_MS = 40;

                const draw = (ts) => {
                    if (_active !== 'sakura') return;
                    if (ts - _lastFrame < FRAME_MS) { _rafId = requestAnimationFrame(draw); return; }
                    _lastFrame = ts;

                    c2d.clearRect(0, 0, W, H);

                    const swayX = Math.sin(ts * 0.0006) * 2.5;
                    const swayY = Math.sin(ts * 0.0008) * 1.2;
                    c2d.drawImage(bgCanvas, swayX, swayY);

                    for (let i = petals.length - 1; i >= 0; i--) {
                        const p = petals[i];
                        p.y += p.fallSpeed;
                        p.x += Math.sin(ts * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp * 0.25 + p.driftX;
                        p.rot += p.rotSpeed;

                        let alpha = p.baseAlpha;
                        if (p.y > H * 0.75) {
                            alpha *= Math.max(0, 1 - (p.y - H * 0.75) / (H * 0.3));
                        }

                        if (p.y > H + 20 || alpha <= 0.02) {
                            petals[i] = spawnPetal();
                            continue;
                        }

                        drawPetalShape(c2d, p, alpha);
                    }

                    _rafId = requestAnimationFrame(draw);
                };
                _rafId = requestAnimationFrame(draw);

                this._onResize = (w, h) => {
                    W = w; H = h;
                    renderStatic();
                };
            },

            _startStarfield() {
                const root = getRoot();
                if (!root) return;

                const canvas = this._makeCanvas('fq-starfield', 1.0);
                if (!canvas) return;
                const c2d = canvas.getContext('2d');

                let W = root.clientWidth, H = root.clientHeight;
                this._onResize = (w, h) => { W = w; H = h; };

                const layers = [
                    { count: 70, depth: 0.4, sizeMin: 0.3, sizeMax: 0.8, alpha: 0.55 },
                    { count: 40, depth: 0.7, sizeMin: 0.6, sizeMax: 1.3, alpha: 0.8 },
                    { count: 18, depth: 1.0, sizeMin: 0.9, sizeMax: 2.0, alpha: 1.0 },
                ];
                const stars = [];
                for (const L of layers) {
                    for (let i = 0; i < L.count; i++) {
                        stars.push({
                            x: Math.random() * W,
                            y: Math.random() * H,
                            size: L.sizeMin + Math.random() * (L.sizeMax - L.sizeMin),
                            depth: L.depth,
                            baseAlpha: L.alpha,
                            twinkleSpeed: 0.0004 + Math.random() * 0.0012,
                            twinklePhase: Math.random() * Math.PI * 2,
                            hue: 200 + Math.random() * 60,
                            vx: (0.08 + Math.random() * 0.08) * L.depth,
                            vy: (0.03 + Math.random() * 0.04) * L.depth,
                            driftPhase: Math.random() * Math.PI * 2,
                            driftFreq: 0.00015 + Math.random() * 0.00025,
                        });
                    }
                }

                const nebulas = [
                    { ox: 0.25, oy: 0.35, r: 0.7, hue: 250, alpha: 0.10 },
                    { ox: 0.75, oy: 0.55, r: 0.6, hue: 210, alpha: 0.08 },
                    { ox: 0.5,  oy: 0.85, r: 0.65, hue: 300, alpha: 0.07 },
                ];

                const COMET_INTERVAL_MS = 10000;
                const COMET_TRAVEL_MS = 2200;
                let activeComet = null;
                let nextCometAt = performance.now() + 2000 + Math.random() * 3000;

                const spawnComet = () => {
                    const fromTop = Math.random() > 0.5;
                    const hue = 190 + Math.random() * 80;
                    const speed = 0.8 + Math.random() * 0.4;

                    let x0, y0, x1, y1;
                    if (fromTop) {
                        x0 = -100;
                        y0 = Math.random() * H * 0.4;
                        x1 = W + 100;
                        y1 = y0 + H * (0.4 + Math.random() * 0.4);
                    } else {
                        x0 = Math.random() * W * 0.3;
                        y0 = -100;
                        x1 = x0 + W * (0.5 + Math.random() * 0.4);
                        y1 = H + 100;
                    }

                    activeComet = {
                        x: x0, y: y0, startX: x0, startY: y0, endX: x1, endY: y1,
                        startTime: performance.now(),
                        duration: COMET_TRAVEL_MS / speed,
                        hue,
                        size: 1.6 + Math.random() * 1.4,
                        tailLength: 80 + Math.random() * 70,
                    };
                };

                let mouseX = 0.5, mouseY = 0.5;
                const onMove = (e) => {
                    if (_active !== 'starfield') return;
                    mouseX = e.clientX / innerWidth;
                    mouseY = e.clientY / innerHeight;
                };
                document.addEventListener('mousemove', onMove);
                this._starfieldCleanup = () => document.removeEventListener('mousemove', onMove);

                const t0 = performance.now();
                const draw = (ts) => {
                    if (_active !== 'starfield') return;
                    if (ts - _lastFrame < 40) { _rafId = requestAnimationFrame(draw); return; }
                    _lastFrame = ts;
                    const elapsed = ts - t0;

                    c2d.clearRect(0, 0, W, H);

                    const px = (mouseX - 0.5) * -25;
                    const py = (mouseY - 0.5) * -25;

                    c2d.globalCompositeOperation = 'lighter';
                    for (const n of nebulas) {
                        const cx = W * n.ox + px * 0.3;
                        const cy = H * n.oy + py * 0.3;
                        const r = Math.max(W, H) * n.r;
                        const grad = c2d.createRadialGradient(cx, cy, 0, cx, cy, r);
                        grad.addColorStop(0, `hsla(${n.hue}, 70%, 55%, ${n.alpha})`);
                        grad.addColorStop(0.5, `hsla(${n.hue}, 70%, 45%, ${n.alpha * 0.4})`);
                        grad.addColorStop(1, `hsla(${n.hue}, 70%, 40%, 0)`);
                        c2d.fillStyle = grad;
                        c2d.beginPath();
                        c2d.arc(cx, cy, r, 0, Math.PI * 2);
                        c2d.fill();
                    }

                    for (const s of stars) {
                        const breath = 0.85 + Math.sin(elapsed * s.driftFreq + s.driftPhase) * 0.15;
                        s.x += s.vx * breath;
                        s.y += s.vy * breath;

                        if (s.x > W + 4) { s.x = -4; s.y = Math.random() * H; }
                        if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }
                        if (s.x < -4) s.x = W + 4;
                        if (s.y < -4) s.y = H + 4;

                        const twinkle = 0.7 + Math.sin(elapsed * s.twinkleSpeed + s.twinklePhase) * 0.3;
                        const a = s.baseAlpha * twinkle;
                        const dx = s.x + px * s.depth;
                        const dy = s.y + py * s.depth;

                        if (s.size > 1.2) {
                            c2d.shadowColor = `hsla(${s.hue}, 90%, 80%, ${a * 0.9})`;
                            c2d.shadowBlur = s.size * 5;
                        } else {
                            c2d.shadowBlur = 0;
                        }

                        c2d.fillStyle = `hsla(${s.hue}, 90%, 95%, ${a})`;
                        c2d.beginPath();
                        c2d.arc(dx, dy, s.size, 0, Math.PI * 2);
                        c2d.fill();
                    }
                    c2d.shadowBlur = 0;

                    if (!activeComet && ts >= nextCometAt) {
                        spawnComet();
                    }

                    if (activeComet) {
                        const c = activeComet;
                        const p = (ts - c.startTime) / c.duration;

                        if (p >= 1) {
                            activeComet = null;
                            nextCometAt = ts + COMET_INTERVAL_MS + (Math.random() * 4000 - 2000);
                        } else {
                            const ease = p;
                            c.x = c.startX + (c.endX - c.startX) * ease;
                            c.y = c.startY + (c.endY - c.startY) * ease;

                            const dx = c.endX - c.startX;
                            const dy = c.endY - c.startY;
                            const len = Math.hypot(dx, dy) || 1;
                            const ux = dx / len;
                            const uy = dy / len;

                            let fade = 1;
                            if (p < 0.15) fade = p / 0.15;
                            else if (p > 0.85) fade = (1 - p) / 0.15;

                            const tailX = c.x - ux * c.tailLength;
                            const tailY = c.y - uy * c.tailLength;

                            const tailGrad = c2d.createLinearGradient(c.x, c.y, tailX, tailY);
                            tailGrad.addColorStop(0,    `hsla(${c.hue}, 100%, 85%, ${0.95 * fade})`);
                            tailGrad.addColorStop(0.15, `hsla(${c.hue}, 100%, 75%, ${0.7 * fade})`);
                            tailGrad.addColorStop(0.4,  `hsla(${c.hue + 15}, 90%, 65%, ${0.4 * fade})`);
                            tailGrad.addColorStop(0.7,  `hsla(${c.hue + 25}, 80%, 55%, ${0.15 * fade})`);
                            tailGrad.addColorStop(1,    `hsla(${c.hue + 40}, 70%, 50%, 0)`);

                            c2d.strokeStyle = tailGrad;
                            c2d.lineWidth = c.size * 1.2;
                            c2d.lineCap = 'round';
                            c2d.shadowColor = `hsla(${c.hue}, 100%, 70%, ${fade})`;
                            c2d.shadowBlur = 18;

                            c2d.beginPath();
                            c2d.moveTo(c.x, c.y);
                            c2d.lineTo(tailX, tailY);
                            c2d.stroke();

                            c2d.strokeStyle = `hsla(${c.hue}, 100%, 95%, ${0.5 * fade})`;
                            c2d.lineWidth = c.size * 0.5;
                            c2d.shadowBlur = 10;
                            c2d.beginPath();
                            c2d.moveTo(c.x, c.y);
                            c2d.lineTo(c.x - ux * c.tailLength * 0.5, c.y - uy * c.tailLength * 0.5);
                            c2d.stroke();

                            c2d.shadowColor = `hsla(${c.hue}, 100%, 80%, ${fade})`;
                            c2d.shadowBlur = 25;
                            c2d.fillStyle = `hsla(0, 0%, 100%, ${fade})`;
                            c2d.beginPath();
                            c2d.arc(c.x, c.y, c.size * 0.8, 0, Math.PI * 2);
                            c2d.fill();

                            const coreGrad = c2d.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 6);
                            coreGrad.addColorStop(0, `hsla(${c.hue}, 100%, 90%, ${0.6 * fade})`);
                            coreGrad.addColorStop(0.5, `hsla(${c.hue}, 100%, 70%, ${0.2 * fade})`);
                            coreGrad.addColorStop(1, `hsla(${c.hue}, 100%, 60%, 0)`);
                            c2d.fillStyle = coreGrad;
                            c2d.beginPath();
                            c2d.arc(c.x, c.y, c.size * 6, 0, Math.PI * 2);
                            c2d.fill();

                            c2d.shadowBlur = 0;
                        }
                    }

                    c2d.globalCompositeOperation = 'source-over';
                    _rafId = requestAnimationFrame(draw);
                };
                _rafId = requestAnimationFrame(draw);
            },

            _startLofi() {
                const root = getRoot();
                if (!root) return;

                const canvas = this._makeCanvas('fq-lofi', 1.0);
                if (!canvas) return;
                const c2d = canvas.getContext('2d');

                let W = root.clientWidth, H = root.clientHeight;
                this._onResize = (w, h) => { W = w; H = h; };

                let bgCanvas = null;
                let bgCtx = null;

                const renderBg = () => {
                    if (!bgCanvas) {
                        bgCanvas = document.createElement('canvas');
                        bgCtx = bgCanvas.getContext('2d');
                    }
                    bgCanvas.width = W;
                    bgCanvas.height = H;
                    bgCtx.clearRect(0, 0, W, H);

                    const grad = bgCtx.createLinearGradient(0, 0, W, H);
                    grad.addColorStop(0, 'hsl(280, 40%, 8%)');
                    grad.addColorStop(0.35, 'hsl(320, 35%, 12%)');
                    grad.addColorStop(0.65, 'hsl(260, 40%, 10%)');
                    grad.addColorStop(1, 'hsl(220, 35%, 7%)');
                    bgCtx.fillStyle = grad;
                    bgCtx.fillRect(0, 0, W, H);

                    bgCtx.globalCompositeOperation = 'lighter';
                    const spots = [
                        { x: 0.15, y: 0.25, r: 0.55, hue: 330, alpha: 0.10 },
                        { x: 0.75, y: 0.45, r: 0.60, hue: 280, alpha: 0.08 },
                        { x: 0.40, y: 0.80, r: 0.50, hue: 200, alpha: 0.06 },
                        { x: 0.85, y: 0.15, r: 0.45, hue: 320, alpha: 0.07 },
                    ];
                    for (const s of spots) {
                        const cx = W * s.x;
                        const cy = H * s.y;
                        const r = Math.max(W, H) * s.r;
                        const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
                        g.addColorStop(0, `hsla(${s.hue}, 70%, 70%, ${s.alpha})`);
                        g.addColorStop(0.5, `hsla(${s.hue}, 65%, 55%, ${s.alpha * 0.4})`);
                        g.addColorStop(1, `hsla(${s.hue}, 60%, 45%, 0)`);
                        bgCtx.fillStyle = g;
                        bgCtx.beginPath();
                        bgCtx.arc(cx, cy, r, 0, Math.PI * 2);
                        bgCtx.fill();
                    }
                    bgCtx.globalCompositeOperation = 'source-over';
                };
                renderBg();

                const MAX_PARTICLES = 45;
                const particles = [];

                const spawnParticle = () => ({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    size: 1 + Math.random() * 3.5,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: -0.1 - Math.random() * 0.35,
                    wobbleAmp: 0.3 + Math.random() * 0.8,
                    wobbleFreq: 0.0006 + Math.random() * 0.0012,
                    wobblePhase: Math.random() * Math.PI * 2,
                    hue: 300 + Math.random() * 80,
                    sat: 60 + Math.random() * 25,
                    lit: 78 + Math.random() * 12,
                    baseAlpha: 0.35 + Math.random() * 0.45,
                    pulseSpeed: 0.0005 + Math.random() * 0.001,
                    pulsePhase: Math.random() * Math.PI * 2,
                });

                for (let i = 0; i < MAX_PARTICLES; i++) {
                    particles.push(spawnParticle());
                }

                const FRAME_MS = 40;

                const draw = (ts) => {
                    if (_active !== 'lofi') return;
                    if (ts - _lastFrame < FRAME_MS) { _rafId = requestAnimationFrame(draw); return; }
                    _lastFrame = ts;

                    c2d.clearRect(0, 0, W, H);
                    c2d.drawImage(bgCanvas, 0, 0);

                    c2d.globalCompositeOperation = 'lighter';

                    for (let i = particles.length - 1; i >= 0; i--) {
                        const p = particles[i];

                        p.x += p.vx + Math.sin(ts * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp * 0.05;
                        p.y += p.vy;

                        if (p.y < -20 || p.x < -20 || p.x > W + 20) {
                            particles[i] = spawnParticle();
                            particles[i].y = H + 10;
                            particles[i].x = Math.random() * W;
                            continue;
                        }

                        const pulse = 0.7 + Math.sin(ts * p.pulseSpeed + p.pulsePhase) * 0.3;
                        const a = p.baseAlpha * pulse;
                        const r = p.size * pulse;

                        const grad = c2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
                        grad.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${a})`);
                        grad.addColorStop(0.4, `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${a * 0.4})`);
                        grad.addColorStop(1, `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, 0)`);
                        c2d.fillStyle = grad;
                        c2d.beginPath();
                        c2d.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
                        c2d.fill();

                        c2d.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit + 10}%, ${a * 0.9})`;
                        c2d.beginPath();
                        c2d.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
                        c2d.fill();
                    }

                    c2d.globalCompositeOperation = 'source-over';
                    _rafId = requestAnimationFrame(draw);
                };
                _rafId = requestAnimationFrame(draw);

                this._onResize = (w, h) => {
                    W = w; H = h;
                    renderBg();
                };
            },
        };

        return _themes;
    },
};

function generateSakuraTree() {
    const trunk = {
        start: { x: 1.05, y: -0.05 },
        cp1:   { x: 1.00, y: 0.00 },
        cp2:   { x: 0.96, y: 0.06 },
        end:   { x: 0.92, y: 0.12 },
        thickness: 4,
    };

    const forkPoint = { x: 0.92, y: 0.08 };

    const allBranches = [];
    const allBlossoms = [];

    const rootDirections = [
        { angle: Math.PI * 0.65, len: 0.18, thick: 2.0 },
        { angle: Math.PI * 0.80, len: 0.20, thick: 1.8 },
        { angle: Math.PI * 0.95, len: 0.20, thick: 1.6 },
        { angle: Math.PI * 1.10, len: 0.18, thick: 1.5 },
        { angle: Math.PI * 1.25, len: 0.16, thick: 1.4 },
        { angle: Math.PI * 1.40, len: 0.14, thick: 1.3 },
    ];

    const longBranches = [
        { start: { x: 1.10, y: -0.20 }, cp1: { x: 1.02, y: -0.05 }, cp2: { x: 0.85, y: 0.02 }, end: { x: 0.68, y: 0.06 }, thickness: 1.6 },
        { start: { x: 1.08, y: -0.10 }, cp1: { x: 0.98, y: 0.05 },  cp2: { x: 0.80, y: 0.10 }, end: { x: 0.60, y: 0.16 }, thickness: 1.5 },
        { start: { x: 1.05, y: 0.00 },  cp1: { x: 1.00, y: 0.10 },  cp2: { x: 0.92, y: 0.20 }, end: { x: 0.80, y: 0.28 }, thickness: 1.4 },
        { start: { x: 1.02, y: 0.08 },  cp1: { x: 0.98, y: 0.20 },  cp2: { x: 0.86, y: 0.30 }, end: { x: 0.72, y: 0.38 }, thickness: 1.3 },
    ];

    for (const lb of longBranches) {
        allBranches.push({
            start: lb.start,
            cp1: lb.cp1,
            cp2: lb.cp2,
            end: lb.end,
            thickness: lb.thickness,
            level: 1,
        });

        const numBlossoms = 30 + Math.floor(Math.random() * 12);
        for (let i = 0; i < numBlossoms; i++) {
            const tt = 0.15 + Math.random() * 0.85;
            const mt = 1 - tt;
            const bx = mt * mt * mt * lb.start.x + 3 * mt * mt * tt * lb.cp1.x + 3 * mt * tt * tt * lb.cp2.x + tt * tt * tt * lb.end.x;
            const by = mt * mt * mt * lb.start.y + 3 * mt * mt * tt * lb.cp1.y + 3 * mt * tt * tt * lb.cp2.y + tt * tt * tt * lb.end.y;

            const offset = 0.016;
            allBlossoms.push({
                x: bx + (Math.random() - 0.5) * offset,
                y: by + (Math.random() - 0.5) * offset,
                size: 0.005 + Math.random() * 0.004,
                rotation: Math.random() * Math.PI * 2,
                hue: 338 + Math.random() * 12,
                sat: 55 + Math.random() * 12,
                lit: 75 + Math.random() * 8,
                scale: 0.9 + Math.random() * 0.2,
            });
        }
    }

    const growBranch = (startX, startY, angle, length, thickness, level, maxLevel) => {
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const curve = (Math.random() - 0.5) * 0.05;

        const cp1 = {
            x: startX + (midX - startX) * 0.5 + Math.cos(angle + Math.PI / 2) * curve,
            y: startY + (midY - startY) * 0.5 + Math.sin(angle + Math.PI / 2) * curve,
        };
        const cp2 = {
            x: midX + (endX - midX) * 0.5 + Math.cos(angle + Math.PI / 2) * curve * 0.5,
            y: midY + (endY - midY) * 0.5 + Math.sin(angle + Math.PI / 2) * curve * 0.5,
        };

        allBranches.push({
            start: { x: startX, y: startY },
            cp1, cp2,
            end: { x: endX, y: endY },
            thickness,
            level,
        });

        if (level >= maxLevel - 1) {
            const numBlossoms = 14 + Math.floor(Math.random() * 6);
            for (let i = 0; i < numBlossoms; i++) {
                const tt = 0.25 + Math.random() * 0.75;
                const mt = 1 - tt;
                const bx = mt * mt * mt * startX + 3 * mt * mt * tt * cp1.x + 3 * mt * tt * tt * cp2.x + tt * tt * tt * endX;
                const by = mt * mt * mt * startY + 3 * mt * mt * tt * cp1.y + 3 * mt * tt * tt * cp2.y + tt * tt * tt * endY;

                const offset = 0.018;
                allBlossoms.push({
                    x: bx + (Math.random() - 0.5) * offset,
                    y: by + (Math.random() - 0.5) * offset,
                    size: 0.005 + Math.random() * 0.004,
                    rotation: Math.random() * Math.PI * 2,
                    hue: 338 + Math.random() * 12,
                    sat: 55 + Math.random() * 12,
                    lit: 75 + Math.random() * 8,
                    scale: 0.9 + Math.random() * 0.2,
                });
            }
        } else {
            const childCount = 3 + Math.floor(Math.random() * 2);
            for (let i = 0; i < childCount; i++) {
                const tt = 0.35 + Math.random() * 0.55;
                const mt = 1 - tt;
                const bx = mt * mt * mt * startX + 3 * mt * mt * tt * cp1.x + 3 * mt * tt * tt * cp2.x + tt * tt * tt * endX;
                const by = mt * mt * mt * startY + 3 * mt * mt * tt * cp1.y + 3 * mt * tt * tt * cp2.y + tt * tt * tt * endY;

                const spread = (Math.random() - 0.5) * Math.PI * 0.6;
                const newAngle = angle + spread;
                const newLen = length * (0.55 + Math.random() * 0.20);
                const newThick = thickness * 0.6;

                growBranch(bx, by, newAngle, newLen, newThick, level + 1, maxLevel);
            }
        }
    };

    for (const dir of rootDirections) {
        growBranch(forkPoint.x, forkPoint.y, dir.angle, dir.len, dir.thick, 0, 2);
    }

    return { trunk, allBranches, allBlossoms };
}

function drawSakuraTreeStatic(c2d, W, H, tree) {
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';

    // Тёмный ствол
    c2d.strokeStyle = '#0F080C';
    c2d.lineWidth = Math.max(2, W * (tree.trunk.thickness / 800));
    c2d.beginPath();
    c2d.moveTo(tree.trunk.start.x * W, tree.trunk.start.y * H);
    c2d.bezierCurveTo(
        tree.trunk.cp1.x * W, tree.trunk.cp1.y * H,
        tree.trunk.cp2.x * W, tree.trunk.cp2.y * H,
        tree.trunk.end.x * W, tree.trunk.end.y * H
    );
    c2d.stroke();

    // Тёмные ветки
    const sortedBranches = [...tree.allBranches].sort((a, b) => b.thickness - a.thickness);

    for (const b of sortedBranches) {
        c2d.strokeStyle = b.level <= 1 ? '#150A10' : '#1A0E14';
        c2d.lineWidth = Math.max(0.5, W * (b.thickness / 1000));

        c2d.beginPath();
        c2d.moveTo(b.start.x * W, b.start.y * H);
        c2d.bezierCurveTo(
            b.cp1.x * W, b.cp1.y * H,
            b.cp2.x * W, b.cp2.y * H,
            b.end.x * W, b.end.y * H
        );
        c2d.stroke();
    }

    const sortedBlossoms = [...tree.allBlossoms].sort((a, b) => a.y - b.y);
    for (const blossom of sortedBlossoms) {
        drawBlossomAt(c2d, blossom.x * W, blossom.y * H, W, blossom);
    }
}

function drawBlossomAt(c2d, x, y, W, blossom) {
    const size = blossom.size * W;

    c2d.save();
    c2d.translate(x, y);
    c2d.rotate(blossom.rotation);
    c2d.scale(blossom.scale, blossom.scale);

    const baseHue = blossom.hue;
    const baseSat = blossom.sat;
    const baseLit = blossom.lit;

    c2d.fillStyle = `hsla(${baseHue - 10}, ${baseSat}%, ${baseLit - 30}%, 0.15)`;
    c2d.beginPath();
    c2d.arc(0, 0, size * 0.85, 0, Math.PI * 2);
    c2d.fill();

    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * size * 0.42;
        const py = Math.sin(angle) * size * 0.42;

        const grad = c2d.createRadialGradient(
            px - size * 0.1, py - size * 0.1, 0,
            px, py, size * 0.42
        );
        grad.addColorStop(0, `hsl(${baseHue}, ${baseSat}%, ${baseLit + 6}%)`);
        grad.addColorStop(0.55, `hsl(${baseHue}, ${baseSat}%, ${baseLit}%)`);
        grad.addColorStop(1, `hsl(${baseHue - 8}, ${baseSat + 5}%, ${baseLit - 12}%)`);

        c2d.fillStyle = grad;
        c2d.beginPath();
        c2d.arc(px, py, size * 0.36, 0, Math.PI * 2);
        c2d.fill();

        c2d.strokeStyle = `hsla(${baseHue - 15}, ${baseSat}%, ${baseLit - 25}%, 0.4)`;
        c2d.lineWidth = Math.max(0.3, size * 0.04);
        c2d.beginPath();
        c2d.arc(px, py, size * 0.36, 0, Math.PI * 2);
        c2d.stroke();

        c2d.strokeStyle = `hsla(${baseHue + 5}, ${baseSat - 10}%, ${baseLit - 15}%, 0.5)`;
        c2d.lineWidth = Math.max(0.2, size * 0.025);
        c2d.beginPath();
        c2d.moveTo(px * 0.55, py * 0.55);
        c2d.lineTo(px * 1.15, py * 1.15);
        c2d.stroke();
    }

    const coreGrad = c2d.createRadialGradient(0, 0, 0, 0, 0, size * 0.22);
    coreGrad.addColorStop(0, 'rgba(255, 240, 248, 0.95)');
    coreGrad.addColorStop(0.6, 'rgba(255, 220, 235, 0.85)');
    coreGrad.addColorStop(1, 'rgba(240, 190, 210, 0.7)');
    c2d.fillStyle = coreGrad;
    c2d.beginPath();
    c2d.arc(0, 0, size * 0.18, 0, Math.PI * 2);
    c2d.fill();

    c2d.fillStyle = `hsla(20, 60%, 45%, 0.85)`;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const r = size * 0.10;
        c2d.beginPath();
        c2d.arc(Math.cos(a) * r, Math.sin(a) * r, size * 0.03, 0, Math.PI * 2);
        c2d.fill();
    }

    c2d.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c2d.beginPath();
    c2d.arc(-size * 0.08, -size * 0.08, size * 0.06, 0, Math.PI * 2);
    c2d.fill();

    c2d.restore();
}

function drawPetalShape(c2d, p, alpha) {
    c2d.save();
    c2d.translate(p.x, p.y);
    c2d.rotate(p.rot);

    c2d.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${alpha})`;

    c2d.beginPath();
    c2d.moveTo(-p.size, 0);
    c2d.quadraticCurveTo(-p.size * 0.3, -p.size * 0.65, p.size * 0.7, -p.size * 0.1);
    c2d.quadraticCurveTo(p.size, 0, p.size * 0.7, p.size * 0.1);
    c2d.quadraticCurveTo(-p.size * 0.3, p.size * 0.65, -p.size, 0);
    c2d.closePath();
    c2d.fill();

    c2d.restore();
}