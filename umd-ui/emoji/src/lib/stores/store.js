import { createStore } from "@core";
import state from "./state";
import getters from "./getters";
import actions from "./actions";
import mutations from "./mutations";

const store = createStore({
    state,
    getters,
    actions,
    mutations
});

export default store;