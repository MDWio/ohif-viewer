import CornerstoneViewport from 'react-cornerstone-viewport';
import OHIF from '@ohif/core';
import { connect } from 'react-redux';
import throttle from 'lodash.throttle';
import { setEnabledElement } from './state';
import initSRTools from './tools/initSRTools';
import cornerstone from 'cornerstone-core';

const {
  setViewportActive,
  setViewportSpecificData,
  setActiveViewportSpecificData,
} = OHIF.redux.actions;
const {
  onAdded,
  onRemoved,
  onModified,
} = OHIF.measurements.MeasurementHandlers;

// TODO: Transition to enums for the action names so that we can ensure they stay up to date
// everywhere they're used.
const MEASUREMENT_ACTION_MAP = {
  added: onAdded,
  removed: onRemoved,
  modified: throttle(event => {
    return onModified(event);
  }, 300),
};

const mapStateToProps = (state, ownProps) => {
  let dataFromStore;

  // TODO: This may not be updated anymore :thinking:
  if (state.extensions && state.extensions.cornerstone) {
    dataFromStore = state.extensions.cornerstone;
  }

  // If this is the active viewport, enable prefetching.
  const { viewportIndex } = ownProps; //.viewportData;
  const isActive = viewportIndex === state.viewports.activeViewportIndex;
  const viewportSpecificData =
    state.viewports.viewportSpecificData[viewportIndex] || {};

  // CINE
  let isPlaying = false;
  let frameRate = 24;

  if (viewportSpecificData && viewportSpecificData.cine) {
    const cine = viewportSpecificData.cine;

    isPlaying = cine.isPlaying === true;
    frameRate = cine.cineFrameRate || frameRate;
  }

  const isDualViewportMode =
    state.viewerMode && state.viewerMode.isDualViewportMode;

  return {
    // layout: state.viewports.layout,
    isActive,
    // TODO: Need a cleaner and more versatile way.
    // Currently justing using escape hatch + commands
    // activeTool: activeButton && activeButton.command,
    ...dataFromStore,
    isStackPrefetchEnabled: ownProps.hasOwnProperty('isStackPrefetchEnabled')
      ? ownProps.isStackPrefetchEnabled
      : ownProps.stackPrefetch
      ? ownProps.stackPrefetch.enabled
      : isActive,
    isPlaying,
    frameRate,
    isDualViewportMode,
    //stack: viewportSpecificData.stack,
    // viewport: viewportSpecificData.viewport,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  const { viewportIndex } = ownProps;

  return {
    setViewportActive: () => {
      dispatch(setViewportActive(viewportIndex));

      if (window.store) {
        const state = window.store.getState();
        const viewportSpecificData =
          state.viewports.viewportSpecificData[viewportIndex];

        if (
          viewportSpecificData &&
          viewportSpecificData.displaySetInstanceUID
        ) {
          const { studies } = state;
          let displaySet = null;

          if (studies && studies.length > 0) {
            for (const study of studies) {
              if (study.displaySets) {
                displaySet = study.displaySets.find(
                  ds =>
                    ds.displaySetInstanceUID ===
                    viewportSpecificData.displaySetInstanceUID
                );

                if (displaySet) {
                  break;
                }
              }
            }
          }

          if (displaySet) {
            dispatch(setActiveViewportSpecificData(displaySet));
          }
        }
      }
    },

    setViewportSpecificData: data => {
      dispatch(setViewportSpecificData(viewportIndex, data));
    },

    /**
     * Our component "enables" the underlying dom element on "componentDidMount"
     * It listens for that event, and then emits the enabledElement. We can grab
     * a reference to it here, to make playing with cornerstone's native methods
     * easier.
     */
    onElementEnabled: event => {
      const enabledElement = event.detail.element;
      setEnabledElement(viewportIndex, enabledElement);
      dispatch(
        setViewportSpecificData(viewportIndex, {
          // TODO: Hack to make sure our plugin info is available from the outset
          plugin: 'cornerstone',
        })
      );
      initSRTools(enabledElement);

      let lastSeriesInstanceUID = null;

      const onNewImageForDefaults = event => {
        const imageId = event.detail.image.imageId;
        const seriesMetadata =
          cornerstone.metaData.get('generalSeriesModule', imageId) || {};
        const currentSeriesInstanceUID = seriesMetadata.seriesInstanceUID;

        if (
          currentSeriesInstanceUID &&
          currentSeriesInstanceUID !== lastSeriesInstanceUID
        ) {
          lastSeriesInstanceUID = currentSeriesInstanceUID;

          setTimeout(() => {
            if (window.store) {
              const state = window.store.getState();

              const isDualViewportMode =
                state.viewerMode && state.viewerMode.isDualViewportMode;

              if (!isDualViewportMode) {
                return;
              }

              const { preferences = {} } = state;

              const firstPreset =
                preferences.windowLevelData && preferences.windowLevelData[1];

              if (firstPreset && firstPreset.window && firstPreset.level) {
                const {
                  window: windowWidth,
                  level: windowCenter,
                } = firstPreset;

                let viewport = cornerstone.getViewport(enabledElement);
                if (viewport) {
                  viewport.voi = {
                    windowWidth: Number(windowWidth),
                    windowCenter: Number(windowCenter),
                  };
                  cornerstone.setViewport(enabledElement, viewport);
                }
              }
            }
          });
        }
      };

      enabledElement.addEventListener(
        cornerstone.EVENTS.NEW_IMAGE,
        onNewImageForDefaults
      );
    },

    onMeasurementsChanged: (event, action) => {
      return MEASUREMENT_ACTION_MAP[action](event);
    },
  };
};

const ConnectedCornerstoneViewport = connect(
  mapStateToProps,
  mapDispatchToProps
)(CornerstoneViewport);

export default ConnectedCornerstoneViewport;
