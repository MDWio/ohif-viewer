// Ordered list of migrations for persisted preferences. To change a factory
// preset in the future, update defaultState and append a migration here; the
// stored presetsVersion tells which ones a given user still needs.
const presetMigrations = [
  {
    version: 1,
    // Lung factory preset was W 150 / L -600; now W 1500 / L -600
    migrate: windowLevelData => {
      const lung = windowLevelData[3];
      const isUnmodifiedFactory =
        lung &&
        lung.description === 'Lung' &&
        String(lung.window) === '150' &&
        String(lung.level) === '-600';

      return isUnmodifiedFactory
        ? { ...windowLevelData, 3: { ...lung, window: '1500' } }
        : windowLevelData;
    },
  },
];

const CURRENT_PRESETS_VERSION =
  presetMigrations[presetMigrations.length - 1].version;

const defaultState = {
  presetsVersion: CURRENT_PRESETS_VERSION,
  windowLevelData: {
    1: { description: 'ST1', window: '664', level: '1165' },
    2: { description: 'Soft tissue', window: '550', level: '40' },
    3: { description: 'Lung', window: '1500', level: '-600' },
    4: { description: 'Liver', window: '150', level: '90' },
    5: { description: 'Bone', window: '2500', level: '480' },
    6: { description: 'Brain', window: '80', level: '40' },
    7: { description: 'Trest', window: '1', level: '1' },
    8: { description: '', window: '', level: '' },
    9: { description: '', window: '', level: '' },
    10: { description: '', window: '', level: '' },
  },
  generalPreferences: {
    // language: 'en-US'
  },
};

/**
 * Applies pending window level preset migrations to persisted preferences,
 * keeping any user customization intact.
 */
const migratePreferences = preferences => {
  const storedVersion = (preferences && preferences.presetsVersion) || 0;

  if (!preferences || storedVersion >= CURRENT_PRESETS_VERSION) {
    return preferences;
  }

  let windowLevelData = preferences.windowLevelData;

  if (windowLevelData) {
    for (const { version, migrate } of presetMigrations) {
      if (version > storedVersion) {
        windowLevelData = migrate(windowLevelData);
      }
    }
  }

  return {
    ...preferences,
    ...(windowLevelData && { windowLevelData }),
    presetsVersion: CURRENT_PRESETS_VERSION,
  };
};

const preferences = (state = defaultState, action) => {
  switch (action.type) {
    case 'SET_USER_PREFERENCES': {
      return Object.assign({}, state, action.state);
    }
    default:
      return state;
  }
};

export { defaultState, migratePreferences };
export default preferences;
