/* FQuest · modules/http.js */

module.exports = {
    createHttp(ctx) {
        const getToken = () => {
            try {
                return BdApi.Webpack.getStore('AuthenticationStore')?.getToken?.() || null;
            } catch (_) {
                return null;
            }
        };

        const request = async (method, url, { query, body, headers } = {}) => {
            const token = getToken();
            if (!token) throw { status: 401, message: 'Нет токена авторизации' };

            let fullUrl = url.startsWith('http') ? url : `https://discord.com/api/v9${url.startsWith('/') ? '' : '/'}${url}`;
            if (query && typeof query === 'object') {
                const qs = new URLSearchParams(query).toString();
                fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
            }

            const reqHeaders = {
                'Authorization': token,
                'Accept': '*/*',
                ...(headers || {}),
            };

            let reqBody;
            if (body !== undefined) {
                reqHeaders['Content-Type'] = 'application/json';
                reqBody = JSON.stringify(body);
            }

            const res = await fetch(fullUrl, {
                method,
                headers: reqHeaders,
                body: reqBody,
                credentials: 'include',
            });

            const text = await res.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }

            if (!res.ok) {
                throw {
                    status: res.status,
                    statusCode: res.status,
                    body: data,
                    message: data?.message || `HTTP ${res.status}`,
                };
            }

            return {
                status: res.status,
                statusCode: res.status,
                ok: true,
                body: data,
                headers: res.headers,
            };
        };

        return {
            get:    (opts) => request('GET',    opts.url || opts, opts),
            post:   (opts) => request('POST',   opts.url || opts, opts),
            put:    (opts) => request('PUT',    opts.url || opts, opts),
            patch:  (opts) => request('PATCH',  opts.url || opts, opts),
            del:    (opts) => request('DELETE', opts.url || opts, opts),
        };
    },
};