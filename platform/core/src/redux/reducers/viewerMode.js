import { SET_DUAL_VIEWPORT_MODE } from '../constants/ActionTypes';

const defaultState = {
  isDualViewportMode: false,
};

const viewerMode = (state = defaultState, action) => {
  switch (action.type) {
    case SET_DUAL_VIEWPORT_MODE:
      return {
        ...state,
        isDualViewportMode: action.isDualViewportMode,
      };
    default:
      return state;
  }
};

export default viewerMode;
