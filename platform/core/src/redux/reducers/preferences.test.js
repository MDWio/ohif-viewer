import { Reducer } from 'redux-testkit';

import reducer, { defaultState, migratePreferences } from './preferences';
import { SET_USER_PREFERENCES } from './../constants/ActionTypes.js';

describe('preferences reducer', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, {})).toEqual(defaultState);
  });

  it('should set user preferences state and properly merge with current state', () => {
    const initialState = defaultState;

    const action = {
      type: SET_USER_PREFERENCES,
      state: { generalPreferences: { language: 'es' } },
    };

    const expectedState = {
      presetsVersion: defaultState.presetsVersion,
      windowLevelData: defaultState.windowLevelData,
      generalPreferences: {
        language: 'es',
      },
    };

    Reducer(reducer)
      .withState(initialState)
      .expect(action)
      .toReturnState(expectedState);
  });

  describe('migratePreferences', () => {
    const blank = { description: '', window: '', level: '' };
    const factoryV1 = lung => ({
      1: { description: 'ST1', window: '664', level: '1165' },
      2: { description: 'Soft tissue', window: '550', level: '40' },
      3: lung,
      4: { description: 'Liver', window: '150', level: '90' },
      5: { description: 'Bone', window: '2500', level: '480' },
      6: { description: 'Brain', window: '80', level: '40' },
      7: { description: 'Trest', window: '1', level: '1' },
      8: blank,
      9: blank,
      10: blank,
    });
    const migrate = windowLevelData =>
      migratePreferences({ windowLevelData, generalPreferences: {} });

    it('upgrades unmodified legacy factory presets to the current defaults', () => {
      const result = migrate(
        factoryV1({ description: 'Lung', window: '150', level: '-600' })
      );

      expect(result.windowLevelData).toEqual(defaultState.windowLevelData);
      expect(result.presetsVersion).toBe(defaultState.presetsVersion);
    });

    it('upgrades the previous factory layout (Lung already 1500)', () => {
      const result = migratePreferences({
        presetsVersion: 1,
        windowLevelData: factoryV1({
          description: 'Lung',
          window: '1500',
          level: '-600',
        }),
      });

      expect(result.windowLevelData).toEqual(defaultState.windowLevelData);
    });

    it('migrates presets stored in different slots (older layout)', () => {
      const result = migrate({
        1: { description: 'Soft tissue', window: '550', level: '40' },
        2: { description: 'Lung', window: '150', level: '-600' },
        3: { description: 'Liver', window: '150', level: '90' },
      });

      expect(result.windowLevelData[1].window).toBe('350');
      expect(result.windowLevelData[2].window).toBe('1500');
      expect(result.windowLevelData[3]).toEqual({
        description: 'Liver',
        window: '200',
        level: '60',
      });
    });

    it('keeps customized presets and still updates the untouched ones', () => {
      const customLung = { description: 'Lung', window: '1200', level: '-500' };
      const customSoft = {
        description: 'Soft tissue',
        window: '400',
        level: '50',
      };
      const myPreset = { description: 'Mine', window: '100', level: '20' };
      const layout = factoryV1(customLung);
      layout[2] = customSoft;
      layout[8] = myPreset;

      const result = migrate(layout).windowLevelData;

      expect(result[1]).toEqual(customSoft);
      expect(result[2]).toEqual(customLung);
      expect(result[3]).toEqual({
        description: 'Liver',
        window: '200',
        level: '60',
      });
      expect(result[6]).toEqual(myPreset);
      expect(Object.keys(result)).toHaveLength(10);
    });

    it('keeps a customized ST1 / Trest slot', () => {
      const layout = factoryV1({
        description: 'Lung',
        window: '1500',
        level: '-600',
      });
      layout[1] = { description: 'ST1', window: '700', level: '1100' };
      layout[7] = { description: 'Trest', window: '5', level: '5' };

      const result = migratePreferences({
        presetsVersion: 1,
        windowLevelData: layout,
      }).windowLevelData;

      expect(result[1]).toEqual(layout[1]);
      expect(Object.values(result)).toContainEqual(layout[7]);
    });

    it('does nothing for already migrated preferences', () => {
      const current = { ...defaultState };

      expect(migratePreferences(current)).toBe(current);
    });
  });
});
