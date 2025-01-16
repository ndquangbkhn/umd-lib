export default {
    getApplications(state) {
        return state.Applications;
    },
    getCategories(state) {
        return state.Categories;
    },
    getSetting(state) {
        return state.Setting;
    },
    getRecentApps(state) {
        //cap nhat lai recentApps
        const favoriteApps = state.Applications.filter(x => x.LastAccess).slice(0, 10);

        if (favoriteApps.length < 10) {
            const otherApps = state.Applications.filter(x => x.IsFavorite && !favoriteApps.some(y=> y.ApplicationCode == x.ApplicationCode)).slice(0, 10 - favoriteApps.length);
            favoriteApps.push(...otherApps);
        }
        console.log('favoriteApps', favoriteApps);
        return favoriteApps;
    }

}