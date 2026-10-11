module.exports = {
    createErrorHandler(ctx) {
        return {
            RETRYABLE: new Set([429, 500, 502, 503, 504, 408]),
            CLIENT_ERRORS: new Set([400, 403, 404, 409, 410]),
            classify(error) {
                const status = error?.status ?? error?.statusCode;
                return {
                    isRetryable: this.RETRYABLE.has(status),
                    isClientError: this.CLIENT_ERRORS.has(status),
                    status,
                    message: error?.message ?? error?.body?.message ?? `HTTP ${status ?? 'НЕИЗВЕСТНО'}`,
                };
            },
            isSkippableQuest(error) {
                const s = error?.status;
                return s === 404 || s === 403 || s === 410;
            },
        };
    },

    createTraffic(ctx) {
        return {
            queue: [], processing: false,
            async enqueue(url, body) {
                if (!ctx.RUNTIME.running) return Promise.reject(new Error("Остановлено"));
                return new Promise((resolve, reject) => {
                    this.queue.push({ url, body, resolve, reject, attempts: 0 });
                    this.process();
                });
            },
            async process() {
                if (this.processing || this.queue.length === 0) return;
                this.processing = true;
                while (this.queue.length > 0) {
                    if (!ctx.RUNTIME.running) {
                        this.queue.forEach(req => req.reject(new Error("Остановлено")));
                        this.queue = []; this.processing = false; return;
                    }
                    const req = this.queue.shift();
                    try {
                        const res = await ctx.Mods.api.post({ url: req.url, body: req.body });
                        req.resolve(res);
                    } catch (e) {
                        req.reject(e);
                    }
                    await ctx.sleep(ctx.rnd(1200, 1800));
                }
                this.processing = false;
            },
        };
    },
};