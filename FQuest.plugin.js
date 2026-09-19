/**
 * @name FQuest
 * @author venyv
 * @description Автоматическое выполнение квестов Discord.
 * @version 5.2.0
 * @source https://github.com/venyv/fquest
 * @updateUrl https://raw.githubusercontent.com/venyv/fquest/main/FQuest.plugin.js
 */

module.exports = class FQuestLoader {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(meta.name);

        // ⚠️ ЗАМЕНИ на свой ник
        this.REPO_RAW = 'https://raw.githubusercontent.com/venyv/fquest/main/';
        this.MANIFEST_URL = this.REPO_RAW + 'manifest.json';
        this.LOADER_VERSION = '5.2.0';
        this.CACHE_KEY = 'fquest_module_cache_v1';

        this._instance = null;
    }

    async start() {
        this.api.Logger.info('[FQuest] Загрузчик запущен');
        try {
            const manifest = await this.fetchManifest();
            const cached = this.loadCache();

            if (cached && cached.version === manifest.version && this.verifyCache(cached, manifest)) {
                this.api.Logger.info(`[FQuest] Использую кэш v${manifest.version}`);
                await this.bootstrap(manifest, cached.modules, cached.css);
                return;
            }

            this.api.Logger.info(`[FQuest] Скачиваю модули v${manifest.version}...`);
            const modules = await this.downloadModules(manifest);
            const css = await this.downloadCSS(manifest);
            this.saveCache({ version: manifest.version, modules, css, manifest });
            await this.bootstrap(manifest, modules, css);
        } catch (e) {
            this.api.Logger.error('[FQuest] Ошибка загрузки:', e);
            const cached = this.loadCache();
            if (cached) {
                this.api.Logger.warn('[FQuest] Сеть недоступна, использую кэш v' + cached.version);
                await this.bootstrap(cached.manifest, cached.modules, cached.css);
            } else {
                this.api.UI.showNotice('FQuest: не удалось загрузить модули и кэш пуст.', { type: 'error' });
            }
        }
    }

    stop() {
        if (this._instance) {
            try { this._instance.stop(); } catch (e) { this.api.Logger.error(e); }
            this._instance = null;
        }
    }

    // ============ MANIFEST ============
    async fetchManifest() {
        const res = await this.rawFetch(this.MANIFEST_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error('manifest.json недоступен (HTTP ' + res.status + ')');
        const data = JSON.parse(await res.text());
        if (!data.version || !data.files) throw new Error('manifest.json повреждён');

        if (data.minLoader && this.compareVersions(this.LOADER_VERSION, data.minLoader) < 0) {
            throw new Error(`Требуется загрузчик ${data.minLoader}+ (у вас ${this.LOADER_VERSION}). Обновите плагин вручную.`);
        }
        return data;
    }

    // ============ DOWNLOAD ============
    async downloadModules(manifest) {
        const modules = {};
        const entries = Object.entries(manifest.files).filter(([p]) => p.startsWith('modules/'));
        for (const [path, meta] of entries) {
            const url = this.REPO_RAW + path;
            modules[path] = await this.fetchAndVerify(url, meta.hash);
        }
        return modules;
    }

    async downloadCSS(manifest) {
        const meta = manifest.files['FQuest.css'];
        if (!meta) return '';
        return await this.fetchAndVerify(this.REPO_RAW + 'FQuest.css', meta.hash);
    }

    async fetchAndVerify(url, expectedHash) {
        const res = await this.rawFetch(url + '?t=' + Date.now());
        if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
        const text = await res.text();
        const actualHash = await this.sha256(text);
        if (actualHash !== expectedHash) {
            throw new Error(`Хэш не совпал для ${url}\nОжидался: ${expectedHash}\nПолучен: ${actualHash}`);
        }
        return text;
    }

    async sha256(text) {
        const buf = new TextEncoder().encode(text);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
        return 'sha256-' + b64;
    }

    // ============ FETCH ============
    async rawFetch(url) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok || res.status !== 0) return res;
        } catch (_) { }

        const dn = window.DiscordNative;
        if (dn?.fileManager?.fetchURL) {
            const r = await dn.fileManager.fetchURL(url);
            const body = await r.text();
            return new Response(body, { status: r.status });
        }
        throw new Error('Не удалось выполнить запрос к ' + url);
    }

    // ============ CACHE ============
    loadCache() {
        try {
            const raw = localStorage.getItem(this.CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed.version || !parsed.modules) return null;
            return parsed;
        } catch (_) { return null; }
    }

    saveCache(data) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            this.api.Logger.warn('[FQuest] Не удалось сохранить кэш:', e);
        }
    }

    verifyCache(cached, manifest) {
        if (!cached.manifest?.files) return false;
        for (const [path, meta] of Object.entries(manifest.files)) {
            if (cached.manifest.files[path]?.hash !== meta.hash) return false;
        }
        return true;
    }

    // ============ BOOTSTRAP ============
    async bootstrap(manifest, moduleSources, css) {
        const moduleExports = {};

        const requireModule = (name) => {
            if (moduleExports[name]) return moduleExports[name];
            const key = 'modules/' + name.replace(/^\.\//, '');
            const src = moduleSources[key];
            if (!src) throw new Error(`Модуль не найден: ${name}`);
            const fn = new Function('module', 'exports', 'require', src + '\n//# sourceURL=fquest/' + key);
            const mod = { exports: {} };
            fn(mod, mod.exports, requireModule);
            moduleExports[name] = mod.exports;
            return mod.exports;
        };

        const coreSrc = moduleSources['modules/core.js'];
        if (!coreSrc) throw new Error('modules/core.js отсутствует в манифесте');

        const coreFn = new Function('module', 'exports', 'require',
            coreSrc + '\n//# sourceURL=fquest/modules/core.js');
        const coreMod = { exports: {} };
        coreFn(coreMod, coreMod.exports, requireModule);

        const FQuestClass = coreMod.exports.default || coreMod.exports;
        this._instance = new FQuestClass({
            meta: this.meta,
            api: this.api,
            modules: requireModule,
            css,
            manifest,
        });
        await this._instance.start();
    }

    compareVersions(a, b) {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if ((pa[i] || 0) > (pb[i] || 0)) return 1;
            if ((pa[i] || 0) < (pb[i] || 0)) return -1;
        }
        return 0;
    }
};