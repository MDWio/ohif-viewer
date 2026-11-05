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
    const legacy = lung => ({
      windowLevelData: { ...defaultState.windowLevelData, 3: lung },
    });

    it('updates the unmodified legacy Lung preset and stamps the version', () => {
      const result = migratePreferences(
        legacy({ description: 'Lung', window: '150', level: '-600' })
      );

      expect(result.windowLevelData[3].window).toBe('1500');
      expect(result.presetsVersion).toBe(defaultState.presetsVersion);
    });

    it('keeps customized Lung presets', () => {
      const custom = { description: 'Lung', window: '1200', level: '-500' };
      const result = migratePreferences(legacy(custom));

      expect(result.windowLevelData[3]).toEqual(custom);
    });

    it('does nothing for already migrated preferences', () => {
      const current = { ...defaultState };

      expect(migratePreferences(current)).toBe(current);
    });
  });
});
