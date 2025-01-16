export default {
    setCategories(state, categories) {
        state.Categories = categories;
    },
    setApplications(state, applications) {
        state.Applications = applications;
    },
    setSetting(state, setting) {
        state.Setting = setting;
    },
    setFavorite(state, { appCode, isFavorite }) {
        const app = state.Applications.find(x => x.ApplicationCode == appCode);
        if (app) {
            app.IsFavorite = isFavorite;
        }

        return app;
    } 
}