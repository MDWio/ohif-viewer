const BLANK_SLOTS_MIN = 10;

// Ordered list of migrations for persisted preferences. To change a factory
// preset in the future, update defaultState and append a migration here; the
// stored presetsVersion tells which ones a given user still needs.
const presetMigrations = [
  {
    version: 1,
    // Lung factory preset was W 150 / L -600; now W 1500 / L -600
    // Matched by content, not slot: older stored layouts have different slots
    migrate: windowLevelData => {
      const migrated = {};

      for (const [slot, preset] of Object.entries(windowLevelData)) {
        const isUnmodifiedFactory =
          preset &&
          preset.description === 'Lung' &&
          String(preset.window) === '150' &&
          String(preset.level) === '-600';

        migrated[slot] = isUnmodifiedFactory
          ? { ...preset, window: '1500' }
          : preset;
      }

      return migrated;
    },
  },
  {
    version: 2,
    // Soft tissue W 550 -> 350 (L 40), Liver W 150 / L 90 -> W 200 / L 60,
    // and the non-standard ST1 / Trest factory presets are removed.
    // Only unmodified factory presets (matched by content) are touched; the
    // remaining presets are moved up to fill the gaps, keeping their order.
    migrate: windowLevelData => {
      const slotCount = Math.max(
        Object.keys(windowLevelData).length,
        BLANK_SLOTS_MIN
      );
      const presets = [];

      const slots = Object.keys(windowLevelData).sort(
        (a, b) => Number(a) - Number(b)
      );

      for (const slot of slots) {
        const preset = windowLevelData[slot];

        if (
          isFactoryPreset(preset, 'ST1', '664', '1165') ||
          isFactoryPreset(preset, 'Trest', '1', '1')
        ) {
          continue;
        }

        if (isFactoryPreset(preset, 'Soft tissue', '550', '40')) {
          presets.push({ ...preset, window: '350' });
        } else if (isFactoryPreset(preset, 'Liver', '150', '90')) {
          presets.push({ ...preset, window: '200', level: '60' });
        } else {
          presets.push(preset);
        }
      }

      const migrated = {};

      for (let i = 0; i < slotCount; i++) {
        migrated[i + 1] = presets[i] || {
          description: '',
          window: '',
          level: '',
        };
      }

      return migrated;
    },
  },
];

const CURRENT_PRESETS_VERSION =
  presetMigrations[presetMigrations.length - 1].version;

const defaultState = {
  presetsVersion: CURRENT_PRESETS_VERSION,
  windowLevelData: {
    1: { description: 'Soft tissue', window: '350', level: '40' },
    2: { description: 'Lung', window: '1500', level: '-600' },
    3: { description: 'Liver', window: '200', level: '60' },
    4: { description: 'Bone', window: '2500', level: '480' },
    5: { description: 'Brain', window: '80', level: '40' },
    6: { description: '', window: '', level: '' },
    7: { description: '', window: '', level: '' },
    8: { description: '', window: '', level: '' },
    9: { description: '', window: '', level: '' },
    10: { description: '', window: '', level: '' },
  },
  generalPreferences: {
    // language: 'en-US'
  },
};

const isFactoryPreset = (preset, description, window, level) =>
  !!preset &&
  preset.description === description &&
  String(preset.window) === window &&
  String(preset.level) === level;

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
