/* FQuest · modules/ui/changelog.js
 * История версий — данные для вкладки "Обновления" */

module.exports = {
    CHANGELOG: [
        {
            version: 'v6.0.0',
            date: '2026-10-11',
            type: 'major',
            title: 'Глобальное обновление',
            sections: [
                {
                    kind: 'new',
                    label: 'Добавлено',
                    icon: '✨',
                    items: [
                        '🌐 Кросс-платформенность: BetterDiscord + Vencord',
                        '🔑 Авторизация по ключу продукта (Python backend)',
                        '👤 Профиль пользователя в сайдбаре (аватар, ник, ключ)',
                        '📊 Дашборд Orbs с графиком и переключателем периодов',
                        '🔥 Auto-refresh статистики раз в 5 сек',
                        '🌸 Новая тема «Сакура» с покачивающейся веткой',
                        '✨ Тема «Starfield» — звёзды, туманности, кометы',
                        '🎧 Тема «Lofi» — пастельные частицы',
                        '🔄 Кнопка обновления квестов в шапке',
                        '⌨️ Горячие клавиши Ctrl+1..6 для вкладок',
                        '💾 Экспорт / импорт настроек',
                        '📈 Прогресс-бар в splash-экране',
                        '🎬 Анимация загрузки при авторизации',
                    ],
                },
                {
                    kind: 'improved',
                    label: 'Улучшено',
                    icon: '⚡',
                    items: [
                        '🎨 Оформление статистики под современный dashboard',
                        '🌙 Midnight Blossom — дрейфующие туманные пятна',
                        '💜 Cyberpunk — усиленный глитч',
                        '🔔 Уведомления о новых квестах + badge',
                    ],
                },
                {
                    kind: 'fixed',
                    label: 'Исправлено',
                    icon: '🐛',
                    items: [
                        'Окно не перемещалось во время авторизации',
                        'Клик по фону модалки закрывал её',
                        'Отмена ввода ключа пускала в программу',
                        'JS-темы не перезапускались после сворачивания',
                        'Утечки стилей между темами',
                        'Серая шапка в светлой теме',
                        'Долгая загрузка модулей Discord',
                    ],
                },
                {
                    kind: 'security',
                    label: 'Безопасность',
                    icon: '🔒',
                    items: [
                        'HMAC-подпись тикетов (защита от fetch override)',
                        'Унифицированные ответы (нет enumeration)',
                        'Rate limit 30 запросов/мин',
                        'Discord ID берётся из UserStore, не из localStorage',
                        'Защита от XSS и prototype pollution',
                        'Обфускация критичных модулей (auth, profile, core, tasks)',
                        'Отключены Swagger/OpenAPI',
                    ],
                },
                {
                    kind: 'removed',
                    label: 'Удалено',
                    icon: '🗑',
                    items: [
                        'Темы Aurora Glass, Aurora Waves, Stormveil, Matrix',
                        'Admin-токен и admin-роуты',
                        'Mock-режим авторизации',
                        'KPI «Забрано» и «Streak» из статистики',
                        'tsParticles (возврат на canvas)',
                    ],
                },
            ],
        },
        {
            version: 'v5.3.4',
            date: '2026-09-26',
            type: 'design',
            sections: [
                {
                    kind: 'improved',
                    label: 'Улучшено',
                    icon: '⚡',
                    items: [
                        'Анимация при переключении тем',
                        'Новые темы: Sakura, Storm, Light',
                    ],
                },
            ],
        },
        {
            version: 'v5.3.3',
            date: '2026-09-22',
            type: 'fixed',
            sections: [
                {
                    kind: 'fixed',
                    label: 'Исправлено',
                    icon: '🐛',
                    items: [
                        'Переписан метод получения заданий в tasks.js',
                    ],
                },
            ],
        },
        {
            version: 'v5.3.2',
            date: '2026-09-20',
            type: 'removed',
            sections: [
                {
                    kind: 'removed',
                    label: 'Удалено',
                    icon: '🗑',
                    items: [
                        'Настройки «Авто-участие» и «Случайная задержка»',
                        'Профили настроек и импорт/экспорт JSON',
                    ],
                },
            ],
        },
    ],

    getLatest() {
        return this.CHANGELOG[0];
    },

    getTypeLabel(type) {
        return {
            new: 'Новое',
            improved: 'Улучшено',
            fixed: 'Исправлено',
            design: 'Дизайн',
            removed: 'Удалено',
            major: 'Глобальное обновление',
            security: 'Безопасность',
        }[type] || type;
    },

    getSectionIcon(kind) {
        return {
            new: '✨',
            improved: '⚡',
            fixed: '🐛',
            removed: '🗑',
            security: '🔒',
        }[kind] || '•';
    },
};