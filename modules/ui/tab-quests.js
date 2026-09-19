module.exports = {
    createTab(ctx) {
        return {
            render(container) {
                ctx.Logger.render();
            },
        };
    },
};