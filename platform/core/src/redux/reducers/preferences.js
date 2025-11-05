const defaultState = {
  windowLevelData: {
    1: { description: 'ST1', window: '664', level: '1165' },
    2: { description: 'Soft tissue', window: '550', level: '40' },
    3: { description: 'Lung', window: '150', level: '-600' },
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

const preferences = (state = defaultState, action) => {
  switch (action.type) {
    case 'SET_USER_PREFERENCES': {
      return Object.assign({}, state, action.state);
    }
    default:
      return state;
  }
};

export { defaultState };
export default preferences;
