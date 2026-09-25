module.exports = {
    createTab(ctx) {
        return {
            render(container) {
                console.log('[FQuest] tab-quests.render:', {
                    tasksSize: ctx.Logger.tasks.size,
                    bodyChildren: container?.children?.length,
                    activeTab: ctx.RUNTIME.activeTab,
                });
                ctx.Logger.render();
                console.log('[FQuest] after Logger.render:', {
                    bodyChildren: container?.children?.length,
                    bodyHTML: container?.innerHTML?.slice(0, 200),
                });
            },
        };
    },
};