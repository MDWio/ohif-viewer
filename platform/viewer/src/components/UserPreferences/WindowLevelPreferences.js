import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { redux } from '@ohif/core';

import { TabFooter, useSnackbarContext } from '@ohif/ui';
import { useTranslation } from 'react-i18next';

import './WindowLevelPreferences.styl';
import { defaultState as preferencesDefaultState } from '@ohif/core/src/redux/reducers/preferences';

const { actions } = redux;

function WindowLevelPreferences({ onClose }) {
  const dispatch = useDispatch();

  const windowLevelData = useSelector(state => {
    const { preferences = {} } = state;
    const { windowLevelData } = preferences;

    return windowLevelData;
  });

  const [state, setState] = useState({
    values: { ...windowLevelData },
  });

  const { t } = useTranslation('UserPreferencesModal');
  const hasErrors = false;

  const onSave = () => {
    const invalid = Object.entries(state.values).some(([key, preset]) => {
      const desc = preset.description && preset.description.trim();
      const win =
        preset.window !== undefined && preset.window !== null
          ? preset.window.toString().trim()
          : '';
      const lvl =
        preset.level !== undefined && preset.level !== null
          ? preset.level.toString().trim()
          : '';

      if (desc) {
        return !win || !lvl;
      } else {
        return win || lvl;
      }
    });

    if (invalid) {
      snackbar.show({
        message: t(
          'Please fill in Window and Level for every preset with a Description, and leave all fields empty for unused presets.'
        ),
        type: 'warning',
      });

      return;
    }

    dispatch(actions.setUserPreferences({ windowLevelData: state.values }));

    onClose();

    snackbar.show({
      message: t('SaveMessage'),
      type: 'success',
    });
  };

  const snackbar = useSnackbarContext();

  const onResetPreferences = () => {
    const defaultPresets = preferencesDefaultState.windowLevelData;

    setState({ values: { ...defaultPresets } });
    dispatch(actions.setUserPreferences({ windowLevelData: defaultPresets }));

    snackbar.show({
      message: t('ResetMessage', 'Window Level presets have been reset.'),
      type: 'info',
    });
  };

  const handleInputChange = event => {
    const $target = event.target;
    const { key, inputname } = $target.dataset;
    const inputValue = $target.value;

    setState(prevState => ({
      ...prevState,
      values: {
        ...prevState.values,
        [key]: {
          ...prevState.values[key],
          [inputname]: inputValue,
        },
      },
    }));
  };

  return (
    <React.Fragment>
      <div className="WindowLevelPreferences">
        <div className="wlColumn">
          <div className="wlRow header">
            <div className="wlColumn preset">Preset</div>
            <div className="wlColumn description">Description</div>
            <div className="wlColumn window">Window</div>
            <div className="wlColumn level">Level</div>
          </div>
          {Object.keys(state.values).map((key, index) => {
            return (
              <div className="wlRow" key={key}>
                <div className="wlColumn preset">{key}</div>
                <div className="wlColumn description">
                  <input
                    type="text"
                    className="preferencesInput"
                    value={state.values[key].description}
                    data-key={key}
                    data-inputname="description"
                    onChange={handleInputChange}
                  />
                </div>
                <div className="wlColumn window">
                  <input
                    type="number"
                    className="preferencesInput"
                    value={state.values[key].window}
                    data-key={key}
                    data-inputname="window"
                    onChange={handleInputChange}
                  />
                </div>
                <div className="wlColumn level">
                  <input
                    type="number"
                    className="preferencesInput"
                    value={state.values[key].level}
                    data-key={key}
                    data-inputname="level"
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TabFooter
        onResetPreferences={onResetPreferences}
        onSave={onSave}
        onCancel={onClose}
        hasErrors={hasErrors}
        t={t}
      />
    </React.Fragment>
  );
}

WindowLevelPreferences.propTypes = {
  onClose: PropTypes.func,
};

export { WindowLevelPreferences };
