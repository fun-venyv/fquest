/* ============================================================
 *  FQuest · modules/profile.js
 *  Профиль пользователя (userId всегда берётся из Discord заново)
 * ============================================================ */

module.exports = {
    createProfile(ctx) {
        const { platform } = ctx;
        const PROFILE_KEY = 'fq_user_profile';

        return {
            /**
             * Загружает профиль из Storage.
             * @returns {{ userId: string, key: string, username?: string, avatar?: string, createdAt?: number } | null}
             */
            load() {
                try {
                    const raw = platform?.Data?.load?.(PROFILE_KEY);
                    if (raw) {
                        const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        if (p?.userId && p?.key) return p;
                    }
                } catch (_) {}

                try {
                    const raw = localStorage.getItem(PROFILE_KEY);
                    if (!raw) return null;
                    const p = JSON.parse(raw);
                    if (!p?.userId || !p?.key) return null;
                    return p;
                } catch (_) { return null; }
            },

            save(profile) {
                const data = { ...profile, createdAt: profile.createdAt || Date.now() };
                let ok1 = false, ok2 = false;

                try {
                    platform?.Data?.save?.(PROFILE_KEY, data);
                    ok1 = true;
                } catch (_) {}

                try {
                    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
                    ok2 = true;
                } catch (_) {}

                platform?.Logger?.info?.(`[Profile] save: platform=${ok1}, localStorage=${ok2}`);
                return ok1 || ok2;
            },

            clear() {
                try { platform?.Data?.delete?.(PROFILE_KEY); } catch (_) {}
                try { localStorage.removeItem(PROFILE_KEY); } catch (_) {}
            },

            getDiscordUser() {
                try {
                    const userStore = platform.Webpack.getStore('UserStore');
                    const u = userStore?.getCurrentUser?.();
                    if (!u) return null;
                    return {
                        id: u.id,
                        username: u.username,
                        globalName: u.globalName,
                        avatar: u.avatar,
                        avatarUrl: this.getAvatarUrl(u),
                    };
                } catch (e) {
                    platform.Logger.warn('[Profile] getDiscordUser failed:', e);
                    return null;
                }
            },

            getAvatarUrl(user) {
                if (!user) return null;
                try {
                    if (user.avatar) {
                        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
                        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
                    }
                    const idx = user.discriminator && user.discriminator !== '0'
                        ? parseInt(user.discriminator) % 5
                        : (BigInt(user.id) >> 22n) % 6n;
                    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
                } catch { return null; }
            },

            /**
             * Синхронизирует данные Discord в профиль.
             * ВАЖНО: реальный Discord ID ВСЕГДА берётся из UserStore,
             * не из localStorage.
             */
            syncDiscord() {
                const p = this.load();
                if (!p) return null;
                const u = this.getDiscordUser();
                if (!u) return p;

                // Если Discord ID реального пользователя НЕ совпадает с сохранённым —
                // это значит, что профиль скопирован чужой. СБРАСЫВАЕМ.
                if (p.userId && p.userId !== u.id) {
                    platform?.Logger?.warn?.(`[Profile] Discord ID mismatch! profile=${p.userId} real=${u.id}. Clearing.`);
                    this.clear();
                    return null;
                }

                const updated = {
                    ...p,
                    userId: u.id,   // всегда актуальный ID из Discord
                    username: u.globalName || u.username,
                    avatar: u.avatarUrl,
                };
                this.save(updated);
                return updated;
            },

            /**
             * Проверяет, что сохранённый профиль принадлежит текущему пользователю Discord.
             * @returns {boolean}
             */
            belongsToCurrentUser() {
                const p = this.load();
                if (!p) return false;
                const u = this.getDiscordUser();
                if (!u) return false;
                return p.userId === u.id;
            },

            maskKey(key) {
                if (!key) return '••••-••••-••••-••••';
                const parts = String(key).split('-');
                if (parts.length !== 4) return key;
                return `${parts[0]}-••••-••••-${parts[3]}`;
            },
        };
    },
};