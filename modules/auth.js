/* ============================================================
 *  FQuest · modules/auth.js
 *  Авторизация по ключу продукта через Python backend
 * ============================================================ */

module.exports = {
    createAuth(ctx) {
        const { platform } = ctx;

        const API_URL = 'https://include-outside-victor-addresses.trycloudflare.com/';

        const TIMEOUT_MS = 10000;
        const KEY_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

        const fetchJSON = async (path, body) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

            try {
                const res = await fetch(`${API_URL}${path}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                const data = await res.json();
                return data;
            } catch (e) {
                if (e.name === 'AbortError') return { ok: false, reason: 'timeout' };
                return { ok: false, reason: 'network', error: e.message };
            } finally {
                clearTimeout(timer);
            }
        };

        return {
            KEY_REGEX,

            isValidFormat(key) {
                return KEY_REGEX.test(String(key || '').trim().toUpperCase());
            },

            normalize(key) {
                return String(key || '').trim().toUpperCase();
            },

            async verify(userId, key) {
                const k = this.normalize(key);
                if (!this.isValidFormat(k)) return { ok: false, reason: 'invalid-format' };
                return fetchJSON('/auth/verify', { userId, key: k });
            },

            async register(userId, key) {
                const k = this.normalize(key);
                if (!this.isValidFormat(k)) return { ok: false, reason: 'invalid-format' };

                let username = null, avatar = null;
                try {
                    const userStore = platform.Webpack.getStore('UserStore');
                    const u = userStore?.getCurrentUser?.();
                    if (u) {
                        username = u.globalName || u.username;
                        avatar = u.avatar;
                    }
                } catch (_) {}

                return fetchJSON('/auth/register', { userId, key: k, username, avatar });
            },

            async heartbeat(userId, key) {
                const k = this.normalize(key);
                if (!this.isValidFormat(k)) return { ok: false, reason: 'invalid-format' };
                return fetchJSON('/auth/heartbeat', { userId, key: k });
            },

            reasonText(reason) {
                return {
                    'invalid-format':     'Неверный формат ключа. Ожидается XXXX-XXXX-XXXX-XXXX',
                    'invalid':            'Ключ не существует',
                    'busy':               'Этот ключ уже привязан к другому аккаунту',
                    'not-registered':     'Ключ не зарегистрирован',
                    'already-registered': 'Ваш Discord уже привязан к другому ключу',
                    'banned':             'Ваш аккаунт заблокирован',
                    'network':            'Сервер недоступен. Проверьте подключение',
                    'timeout':            'Превышено время ожидания ответа сервера',
                    'rate-limit':         'Слишком много попыток. Подождите минуту',
                    'server-error':       'Ошибка сервера. Попробуйте позже',
                    'server-misconfigured': 'Сервер не настроен',
                    'invalid-user-id':    'Некорректный Discord ID',
                }[reason] || 'Ошибка авторизации';
            },
        };
    },
};