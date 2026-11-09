import actions from './actions.js';
import reducers from './reducers';
import localStorage from './localStorage.js';
import { migratePreferences } from './reducers/preferences';
import sessionStorage from './sessionStorage.js';

const redux = {
  reducers,
  actions,
  localStorage,
  sessionStorage,
  migratePreferences,
};

export default redux;
