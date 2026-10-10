/* ============================================================
 *  FQuest · modules/react-runtime.js
 * ============================================================ */

module.exports = {
    createReactRuntime(ctx) {
        const { platform } = ctx;

        let React = null;
        let ReactDOM = null;
        let available = false;
        let source = 'none';

        // === 1. Vencord ===
        try {
            const vCommon = window.Vencord?.Webpack?.Common;
            if (vCommon?.React && vCommon?.ReactDOM) {
                React = vCommon.React;
                ReactDOM = vCommon.ReactDOM;
                available = true;
                source = 'vencord';
            }
        } catch (_) {}

        // === 2. BetterDiscord (через webpack) ===
        if (!available) {
            try {
                const mod = platform.Webpack.getModule(
                    (m) => m?.createElement && m?.Component && m?.useState,
                    { searchExports: true }
                );
                if (mod) {
                    React = mod;
                    // ReactDOM ищем отдельно
                    const domMod = platform.Webpack.getModule(
                        (m) => m?.render && m?.createPortal,
                        { searchExports: true }
                    );
                    ReactDOM = domMod || { render: null, createPortal: null };
                    available = true;
                    source = 'betterdiscord';
                }
            } catch (_) {}
        }

        // === 3. Fallback: пробуем из webpackChunkdiscord_app напрямую ===
        if (!available) {
            try {
                let wpRequire;
                webpackChunkdiscord_app.push([[Symbol()], {}, (r) => { wpRequire = r; }]);
                webpackChunkdiscord_app.pop();
                const modules = Object.values(wpRequire.c).map(m => m?.exports).filter(Boolean);

                const rMod = modules.find(m => m?.createElement && m?.Component && m?.useState);
                if (rMod) {
                    React = rMod;
                    const domMod = modules.find(m => m?.render && m?.createPortal);
                    ReactDOM = domMod || { render: null, createPortal: null };
                    available = true;
                    source = 'webpack-direct';
                }
            } catch (_) {}
        }

        platform?.Logger?.info?.(`[React] Runtime: ${source} (available: ${available})`);

        return {
            isAvailable() { return available; },
            getSource() { return source; },
            getReact() { return React; },
            getReactDOM() { return ReactDOM; },

            /**
             * Рендерит React-компонент в контейнер.
             * Если React недоступен — вызывает fallbackFn(container).
             */
            render(container, ComponentFn, props, fallbackFn) {
                if (!available || !React) {
                    if (typeof fallbackFn === 'function') return fallbackFn(container);
                    container.innerHTML = '<div class="fq-empty">React недоступен</div>';
                    return null;
                }

                try {
                    // Создаём изолированный root-контейнер
                    const mount = document.createElement('div');
                    mount.className = 'fq-react-root';
                    mount.style.cssText = 'display: contents;';
                    container.innerHTML = '';
                    container.appendChild(mount);

                    // Используем классический ReactDOM.render — совместим с Discord
                    if (ReactDOM?.render) {
                        ReactDOM.render(React.createElement(ComponentFn, props || {}), mount);
                    } else {
                        // Fallback: ручной рендер через createElement (без DOM-диффинга)
                        const element = React.createElement(ComponentFn, props || {});
                        // Простейший рендер в DOM — только для тестов
                        mount.appendChild(this._renderToDOM(element));
                    }

                    return mount;
                } catch (e) {
                    platform?.Logger?.warn?.('[React] render failed:', e);
                    if (typeof fallbackFn === 'function') return fallbackFn(container);
                    return null;
                }
            },

            /**
             * Уничтожает React-root.
             */
            unmount(container) {
                if (!available || !ReactDOM?.unmountComponentAtNode) return;
                try {
                    const mount = container.querySelector('.fq-react-root');
                    if (mount) ReactDOM.unmountComponentAtNode(mount);
                } catch (_) {}
            },

            // === Хелперы, чтобы не писать React.createElement везде ===

            /**
             * h('div', { className: 'x' }, 'Hello')
             */
            h(tag, props, ...children) {
                if (!React) return null;
                const flatChildren = children.flat(Infinity).filter(c => c != null && c !== false);
                return React.createElement(tag, props, ...flatChildren);
            },

            /**
             * Хук-обёртки. Используй через runtime.getReact().useState()
             * или через прямое обращение к React.
             */
            get hooks() {
                if (!React) return {};
                return {
                    useState: React.useState,
                    useEffect: React.useEffect,
                    useRef: React.useRef,
                    useMemo: React.useMemo,
                    useCallback: React.useCallback,
                    useReducer: React.useReducer,
                };
            },

            // Простейший рендер React-элемента в DOM (без реконсиляции)
            _renderToDOM(element) {
                if (!element) return document.createTextNode('');
                if (typeof element === 'string' || typeof element === 'number') {
                    return document.createTextNode(String(element));
                }
                if (Array.isArray(element)) {
                    const frag = document.createDocumentFragment();
                    for (const el of element) frag.appendChild(this._renderToDOM(el));
                    return frag;
                }
                if (typeof element.type === 'function') {
                    return this._renderToDOM(element.type(element.props || {}));
                }

                const el = document.createElement(element.type);
                const props = element.props || {};
                for (const [k, v] of Object.entries(props)) {
                    if (k === 'children') continue;
                    if (k === 'className') el.className = v;
                    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
                    else if (k.startsWith('on') && typeof v === 'function') {
                        el.addEventListener(k.slice(2).toLowerCase(), v);
                    } else if (v != null) el.setAttribute(k, v);
                }
                const children = props.children;
                if (children != null) {
                    const arr = Array.isArray(children) ? children : [children];
                    for (const c of arr) el.appendChild(this._renderToDOM(c));
                }
                return el;
            },
        };
    },
};