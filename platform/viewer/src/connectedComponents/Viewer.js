/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import OHIF, { MODULE_TYPES, DICOMSR } from '@ohif/core';
import { withDialog } from '@ohif/ui';
import moment from 'moment';

import ToolbarRow from './ToolbarRow.js';
import ConnectedStudyBrowser from './ConnectedStudyBrowser.js';
import ConnectedViewerMain from './ConnectedViewerMain.js';
import ErrorBoundaryDialog from './../components/ErrorBoundaryDialog';
import { extensionManager, servicesManager } from './../App.js';
import { ReconstructionIssues } from './../../../core/src/enums.js';

// Contexts
import AppContext from '../context/AppContext';

import './Viewer.css';
import StudyPrefetcher from '../components/StudyPrefetcher.js';
import StudyLoadingMonitor from '../components/StudyLoadingMonitor';
import SplitPanel from '../components/SplitPanel.js';
import SidePanel from '../components/SidePanel.js';

const { studyMetadataManager } = OHIF.utils;

class Viewer extends Component {
  static propTypes = {
    studies: PropTypes.arrayOf(
      PropTypes.shape({
        StudyInstanceUID: PropTypes.string.isRequired,
        StudyDate: PropTypes.string,
        PatientID: PropTypes.string,
        displaySets: PropTypes.arrayOf(
          PropTypes.shape({
            displaySetInstanceUID: PropTypes.string.isRequired,
            SeriesDescription: PropTypes.string,
            SeriesNumber: PropTypes.number,
            InstanceNumber: PropTypes.number,
            numImageFrames: PropTypes.number,
            Modality: PropTypes.string.isRequired,
            images: PropTypes.arrayOf(
              PropTypes.shape({
                getImageId: PropTypes.func.isRequired,
              })
            ),
          })
        ),
      })
    ),
    studyInstanceUIDs: PropTypes.array,
    activeServer: PropTypes.shape({
      type: PropTypes.string,
      wadoRoot: PropTypes.string,
    }),
    setLayout: PropTypes.func,
    onTimepointsUpdated: PropTypes.func,
    onMeasurementsUpdated: PropTypes.func,
    // window.store.getState().viewports.viewportSpecificData
    viewports: PropTypes.object.isRequired,
    // window.store.getState().viewports.activeViewportIndex
    activeViewportIndex: PropTypes.number.isRequired,
    isStudyLoaded: PropTypes.bool,
    isMultipleMode: PropTypes.bool,
    dialog: PropTypes.object,
  };

  constructor(props) {
    super(props);

    const { activeServer } = this.props;
    const server = Object.assign({}, activeServer);

    if (this.isMultipleMode()) {
      const numStudies = Math.min(this.props.studies.length, 4);
      if (numStudies <= 2) {
        this.setLayout(1, numStudies);
      } else if (numStudies === 3) {
        this.setLayout(2, 2);
      } else if (numStudies === 4) {
        this.setLayout(2, 2);
      }
    }

    const external = { servicesManager };

    OHIF.measurements.MeasurementApi.setConfiguration({
      dataExchange: {
        retrieve: server => DICOMSR.retrieveMeasurements(server, external),
        store: DICOMSR.storeMeasurements,
      },
      server,
    });

    OHIF.measurements.TimepointApi.setConfiguration({
      dataExchange: {
        retrieve: this.retrieveTimepoints,
        store: this.storeTimepoints,
        remove: this.removeTimepoint,
        update: this.updateTimepoint,
        disassociate: this.disassociateStudy,
      },
    });

    this._getActiveViewport = this._getActiveViewport.bind(this);
  }

  state = {
    isLeftSidePanelOpen: true,
    isRightSidePanelOpen: false,
    selectedRightSidePanel: '',
    selectedLeftSidePanel: 'studies', // TODO: Don't hardcode this
    thumbnails: [],
    otherThumbnails: [],
  };

  componentWillUnmount() {
    if (this.props.dialog) {
      this.props.dialog.dismissAll();
    }

    document.removeEventListener(
      'segmentationLoadingError',
      this._updateThumbnails
    );
  }

  retrieveTimepoints = filter => {
    OHIF.log.info('retrieveTimepoints');

    // Get the earliest and latest study date
    let earliestDate = new Date().toISOString();
    let latestDate = new Date().toISOString();
    if (this.props.studies) {
      latestDate = new Date('1000-01-01').toISOString();
      this.props.studies.forEach(study => {
        const StudyDate = moment(study.StudyDate, 'YYYYMMDD').toISOString();
        if (StudyDate < earliestDate) {
          earliestDate = StudyDate;
        }
        if (StudyDate > latestDate) {
          latestDate = StudyDate;
        }
      });
    }

    // Return a generic timepoint
    return Promise.resolve([
      {
        timepointType: 'baseline',
        timepointId: 'TimepointId',
        studyInstanceUIDs: this.props.studyInstanceUIDs,
        PatientID: filter.PatientID,
        earliestDate,
        latestDate,
        isLocked: false,
      },
    ]);
  };

  storeTimepoints = timepointData => {
    OHIF.log.info('storeTimepoints');
    return Promise.resolve();
  };

  updateTimepoint = (timepointData, query) => {
    OHIF.log.info('updateTimepoint');
    return Promise.resolve();
  };

  removeTimepoint = timepointId => {
    OHIF.log.info('removeTimepoint');
    return Promise.resolve();
  };

  disassociateStudy = (timepointIds, StudyInstanceUID) => {
    OHIF.log.info('disassociateStudy');
    return Promise.resolve();
  };

  setLayout = (numRows, numColumns) => {
    if (this.props.setLayout) {
      this.props.setLayout(numRows, numColumns, this.props.viewports);
    }
  };

  onTimepointsUpdated = timepoints => {
    if (this.props.onTimepointsUpdated) {
      this.props.onTimepointsUpdated(timepoints);
    }
  };

  onMeasurementsUpdated = measurements => {
    if (this.props.onMeasurementsUpdated) {
      this.props.onMeasurementsUpdated(measurements);
    }
  };

  getDisplaySetInstanceUID = viewportIndex => {
    const viewport = this.props.viewports[viewportIndex];
    return viewport ? viewport.displaySetInstanceUID : undefined;
  };

  isMultipleMode = () => {
    return (
      this.props.studies &&
      this.props.studies.length >= 2 &&
      this.props.studies.length <= 4
    );
  };

  setThumbnails = activeDisplaySetInstanceUID => {
    const { studies } = this.props;
    this.setState({
      thumbnails: _mapStudiesToThumbnails(
        this.isMultipleMode() ? [studies[0]] : studies,
        activeDisplaySetInstanceUID
      ),
    });

    if (this.isMultipleMode()) {
      const otherThumbnails = [];
      for (let i = 1; i < Math.min(studies.length, 4); i++) {
        const activeDisplaySetInstanceUIDForViewport = this.getDisplaySetInstanceUID(
          i
        );
        otherThumbnails.push(
          ..._mapStudiesToThumbnails(
            [studies[i]],
            activeDisplaySetInstanceUIDForViewport
          )
        );
      }
      this.setState({
        otherThumbnails,
      });
    }
  };

  componentDidMount() {
    const { studies, isStudyLoaded } = this.props;
    const { TimepointApi, MeasurementApi } = OHIF.measurements;
    const currentTimepointId = 'TimepointId';

    const timepointApi = new TimepointApi(currentTimepointId, {
      onTimepointsUpdated: this.onTimepointsUpdated,
    });

    const measurementApi = new MeasurementApi(timepointApi, {
      onMeasurementsUpdated: this.onMeasurementsUpdated,
    });

    this.currentTimepointId = currentTimepointId;
    this.timepointApi = timepointApi;
    this.measurementApi = measurementApi;

    if (studies) {
      const PatientID = studies[0] && studies[0].PatientID;

      timepointApi.retrieveTimepoints({ PatientID });
      if (isStudyLoaded) {
        this.measurementApi.retrieveMeasurements(PatientID, [
          currentTimepointId,
        ]);
      }

      const activeDisplaySetInstanceUID = this.getDisplaySetInstanceUID(
        this.isMultipleMode() ? 0 : this.props.activeViewportIndex
      );
      this.setThumbnails(activeDisplaySetInstanceUID);
    }

    document.addEventListener(
      'segmentationLoadingError',
      this._updateThumbnails.bind(this),
      false
    );
  }

  componentDidUpdate(prevProps) {
    const { studies, isStudyLoaded, activeViewportIndex } = this.props;

    const activeDisplaySetInstanceUID = this.getDisplaySetInstanceUID(
      this.isMultipleMode() ? 0 : this.props.activeViewportIndex
    );

    const prevActiveViewport =
      prevProps.viewports[
        this.isMultipleMode() ? 0 : prevProps.activeViewportIndex
      ];
    const prevActiveDisplaySetInstanceUID = prevActiveViewport
      ? prevActiveViewport.displaySetInstanceUID
      : undefined;

    if (
      studies !== prevProps.studies ||
      activeViewportIndex !== prevProps.activeViewportIndex ||
      activeDisplaySetInstanceUID !== prevActiveDisplaySetInstanceUID
    ) {
      this.setThumbnails(activeDisplaySetInstanceUID);
    }
    if (isStudyLoaded && isStudyLoaded !== prevProps.isStudyLoaded) {
      const PatientID = studies[0] && studies[0].PatientID;
      const { currentTimepointId } = this;

      this.timepointApi.retrieveTimepoints({ PatientID });
      this.measurementApi
        .retrieveMeasurements(PatientID, [currentTimepointId])
        .then(() => {
          this._updateThumbnails();
        });
    }
  }

  _updateThumbnails() {
    const { activeViewportIndex } = this.props;

    const activeDisplaySetInstanceUID = this.getDisplaySetInstanceUID(
      this.isMultipleMode() ? 0 : activeViewportIndex
    );
    this.setThumbnails(activeDisplaySetInstanceUID);
  }

  _getActiveViewport() {
    return this.props.viewports[this.props.activeViewportIndex];
  }

  render() {
    let VisiblePanelLeft;
    const panelExtensions = extensionManager.modules[MODULE_TYPES.PANEL];

    panelExtensions.forEach(panelExt => {
      panelExt.module.components.forEach(comp => {
        if (comp.id === this.state.selectedLeftSidePanel) {
          VisiblePanelLeft = comp.component;
        }
      });
    });

    return (
      <>
        {/* HEADER */}
        {/* <WhiteLabelingContext.Consumer>
          {whiteLabeling => (
            <UserManagerContext.Consumer>
              {userManager => (
                <AppContext.Consumer>
                  {appContext => (
                    <ConnectedHeader
                      linkText={
                        appContext.appConfig.showStudyList
                          ? 'Study List'
                          : undefined
                      }
                      linkPath={
                        appContext.appConfig.showStudyList ? '/' : undefined
                      }
                      userManager={userManager}
                    >
                      {whiteLabeling &&
                        whiteLabeling.createLogoComponentFn &&
                        whiteLabeling.createLogoComponentFn(React)}
                    </ConnectedHeader>
                  )}
                </AppContext.Consumer>
              )}
            </UserManagerContext.Consumer>
          )}
        </WhiteLabelingContext.Consumer> */}
        {/* TOOLBAR */}
        <ErrorBoundaryDialog context="ToolbarRow">
          <ToolbarRow
            isMultipleMode={this.isMultipleMode()}
            activeViewport={
              this.props.viewports[this.props.activeViewportIndex]
            }
            isLeftSidePanelOpen={this.state.isLeftSidePanelOpen}
            isRightSidePanelOpen={this.state.isRightSidePanelOpen}
            selectedLeftSidePanel={
              this.state.isLeftSidePanelOpen
                ? this.state.selectedLeftSidePanel
                : ''
            }
            selectedRightSidePanel={
              this.state.isRightSidePanelOpen
                ? this.state.selectedRightSidePanel
                : ''
            }
            handleSidePanelChange={(side, selectedPanel) => {
              const sideClicked = side && side[0].toUpperCase() + side.slice(1);
              const openKey = `is${sideClicked}SidePanelOpen`;
              const selectedKey = `selected${sideClicked}SidePanel`;
              const updatedState = Object.assign({}, this.state);

              const isOpen = updatedState[openKey];
              const prevSelectedPanel = updatedState[selectedKey];
              // RoundedButtonGroup returns `null` if selected button is clicked
              const isSameSelectedPanel =
                prevSelectedPanel === selectedPanel || selectedPanel === null;

              updatedState[selectedKey] = selectedPanel || prevSelectedPanel;

              const isClosedOrShouldClose = !isOpen || isSameSelectedPanel;
              if (isClosedOrShouldClose) {
                updatedState[openKey] = !updatedState[openKey];
              }

              this.setState(updatedState);
            }}
            studies={this.props.studies}
          />
        </ErrorBoundaryDialog>
        <AppContext.Consumer>
          {appContext => <StudyLoadingMonitor studies={this.props.studies} />}
        </AppContext.Consumer>
        {/* VIEWPORTS + SIDEPANELS */}
        <div className="FlexboxLayout">
          {/* LEFT */}
          <ErrorBoundaryDialog context="LeftSidePanel">
            <SidePanel from="left" isOpen={this.state.isLeftSidePanelOpen}>
              <AppContext.Consumer>
                {appContext => {
                  const { appConfig } = appContext;
                  const { studyPrefetcher } = appConfig;
                  const { studies } = this.props;
                  const studyCount = studies.length;
                  const { thumbnails } = this.state;

                  if (VisiblePanelLeft) {
                    return (
                      <VisiblePanelLeft
                        viewports={this.props.viewports}
                        studies={this.props.studies}
                        activeIndex={this.props.activeViewportIndex}
                      />
                    );
                  }

                  switch (studyCount) {
                    case 2: {
                      const isActive = this.props.activeViewportIndex === 0;

                      return (
                        <div
                          className={`study-browser-panel ${
                            isActive ? 'active' : 'inactive'
                          }`}
                        >
                          <ConnectedStudyBrowser
                            studies={thumbnails}
                            studyMetadata={
                              this.isMultipleMode() ? [studies[0]] : studies
                            }
                            viewportIndex={0}
                            showThumbnailProgressBar={
                              studyPrefetcher &&
                              studyPrefetcher.enabled &&
                              studyPrefetcher.displayProgress
                            }
                          />
                        </div>
                      );
                    }

                    case 3:
                    case 4: {
                      const mappedStudies = _mapStudiesToThumbnails(studies);

                      return (
                        <SplitPanel
                          topStudy={[mappedStudies[0]]}
                          bottomStudy={[mappedStudies[2]]}
                          viewportIndexTop={0}
                          viewportIndexBottom={2}
                          topStudyMetadata={[studies[0]]}
                          bottomStudyMetadata={[studies[2]]}
                          activeViewportIndex={this.props.activeViewportIndex}
                          showThumbnailProgressBar={
                            studyPrefetcher &&
                            studyPrefetcher.enabled &&
                            studyPrefetcher.displayProgress
                          }
                        />
                      );
                    }

                    default: {
                      const isActive = this.props.activeViewportIndex === 0;

                      return (
                        <div
                          className={`study-browser-panel ${
                            isActive ? 'active' : 'inactive'
                          }`}
                        >
                          <ConnectedStudyBrowser
                            studies={thumbnails}
                            studyMetadata={
                              this.isMultipleMode() ? [studies[0]] : studies
                            }
                            viewportIndex={0}
                            showThumbnailProgressBar={
                              studyPrefetcher &&
                              studyPrefetcher.enabled &&
                              studyPrefetcher.displayProgress
                            }
                          />
                        </div>
                      );
                    }
                  }
                }}
              </AppContext.Consumer>
            </SidePanel>
          </ErrorBoundaryDialog>

          {/* MAIN */}
          <div className={classNames('main-content')}>
            <ErrorBoundaryDialog context="ViewerMain">
              <AppContext.Consumer>
                {appContext => {
                  const { appConfig } = appContext;
                  const { studyPrefetcher } = appConfig;
                  const { studies } = this.props;

                  return (
                    studyPrefetcher &&
                    studyPrefetcher.enabled && (
                      <StudyPrefetcher
                        studies={studies}
                        options={studyPrefetcher}
                      />
                    )
                  );
                }}
              </AppContext.Consumer>
              <ConnectedViewerMain
                studies={this.props.studies}
                isStudyLoaded={this.props.isStudyLoaded}
              />
            </ErrorBoundaryDialog>
          </div>

          {/* RIGHT */}
          {this.isMultipleMode() && (
            <ErrorBoundaryDialog context="RightSidePanel">
              <SidePanel from="right" isOpen={this.state.isLeftSidePanelOpen}>
                <AppContext.Consumer>
                  {appContext => {
                    const { appConfig } = appContext;
                    const { studyPrefetcher } = appConfig;
                    const { studies } = this.props;
                    const studyCount = studies.length;
                    const { otherThumbnails } = this.state;

                    if (VisiblePanelLeft) {
                      return (
                        <VisiblePanelLeft
                          viewports={this.props.viewports}
                          studies={this.props.studies}
                          activeIndex={this.props.activeViewportIndex}
                        />
                      );
                    }

                    switch (studyCount) {
                      case 2: {
                        const isActive = this.props.activeViewportIndex === 1;

                        return (
                          <div
                            className={`study-browser-panel ${
                              isActive ? 'active' : 'inactive'
                            }`}
                          >
                            <ConnectedStudyBrowser
                              studies={otherThumbnails}
                              studyMetadata={[studies[1]]}
                              viewportIndex={1}
                              showThumbnailProgressBar={
                                studyPrefetcher &&
                                studyPrefetcher.enabled &&
                                studyPrefetcher.displayProgress
                              }
                            />
                          </div>
                        );
                      }

                      case 3: {
                        const mappedStudies = _mapStudiesToThumbnails(studies);
                        const isActive = this.props.activeViewportIndex === 1;

                        return (
                          <div
                            className={`study-browser-panel ${
                              isActive ? 'active' : 'inactive'
                            }`}
                          >
                            <ConnectedStudyBrowser
                              studies={[mappedStudies[1]]}
                              studyMetadata={[studies[1]]}
                              viewportIndex={1}
                              showThumbnailProgressBar={
                                studyPrefetcher &&
                                studyPrefetcher.enabled &&
                                studyPrefetcher.displayProgress
                              }
                            />
                          </div>
                        );
                      }

                      case 4: {
                        const mappedStudies = _mapStudiesToThumbnails(studies);

                        return (
                          <SplitPanel
                            topStudy={[mappedStudies[1]]}
                            bottomStudy={[mappedStudies[3]]}
                            viewportIndexTop={1}
                            viewportIndexBottom={3}
                            topStudyMetadata={[studies[1]]}
                            bottomStudyMetadata={[studies[3]]}
                            activeViewportIndex={this.props.activeViewportIndex}
                            showThumbnailProgressBar={
                              studyPrefetcher &&
                              studyPrefetcher.enabled &&
                              studyPrefetcher.displayProgress
                            }
                          />
                        );
                      }

                      default: {
                        const isActive = this.props.activeViewportIndex === 1;

                        return (
                          <div
                            className={`study-browser-panel ${
                              isActive ? 'active' : 'inactive'
                            }`}
                          >
                            <ConnectedStudyBrowser
                              studies={otherThumbnails}
                              studyMetadata={studies.slice(1)}
                              viewportIndex={1}
                              showThumbnailProgressBar={
                                studyPrefetcher &&
                                studyPrefetcher.enabled &&
                                studyPrefetcher.displayProgress
                              }
                            />
                          </div>
                        );
                      }
                    }
                  }}
                </AppContext.Consumer>
              </SidePanel>
            </ErrorBoundaryDialog>
          )}

          {/* RIGHT */}
          {/* <ErrorBoundaryDialog context="RightSidePanel">
            <SidePanel from="right" isOpen={this.state.isRightSidePanelOpen}>
              {VisiblePanelRight && (
                <VisiblePanelRight
                  isOpen={this.state.isRightSidePanelOpen}
                  viewports={this.props.viewports}
                  studies={this.props.studies}
                  activeIndex={this.props.activeViewportIndex}
                  activeViewport={
                    this.props.viewports[this.props.activeViewportIndex]
                  }
                  getActiveViewport={this._getActiveViewport}
                />
              )}
            </SidePanel>
          </ErrorBoundaryDialog> */}
        </div>
      </>
    );
  }
}

export default withDialog(Viewer);

/**
 * Async function to check if the displaySet has any derived one
 *
 * @param {*object} displaySet
 * @param {*object} study
 * @returns {bool}
 */
const _checkForDerivedDisplaySets = async function(displaySet, study) {
  let derivedDisplaySetsNumber = 0;
  if (
    displaySet.Modality &&
    !['SEG', 'SR', 'RTSTRUCT'].includes(displaySet.Modality)
  ) {
    const studyMetadata = studyMetadataManager.get(study.StudyInstanceUID);

    const derivedDisplaySets = studyMetadata.getDerivedDatasets({
      referencedSeriesInstanceUID: displaySet.SeriesInstanceUID,
    });

    derivedDisplaySetsNumber = derivedDisplaySets.length;
  }

  return derivedDisplaySetsNumber > 0;
};

/**
 * Async function to check if there are any inconsistences in the series.
 *
 * For segmentation returns any error during loading.
 *
 * For reconstructable 3D volume:
 * 1) Is series multiframe?
 * 2) Do the frames have different dimensions/number of components/orientations?
 * 3) Has the series any missing frames or irregular spacing?
 * 4) Is the series 4D?
 *
 * If not reconstructable, MPR is disabled.
 * The actual computations are done in isDisplaySetReconstructable.
 *
 * @param {*object} displaySet
 * @returns {[string]} an array of strings containing the warnings
 */
const _checkForSeriesInconsistencesWarnings = async function(displaySet) {
  const inconsistencyWarnings = [];

  if (displaySet.Modality !== 'SEG') {
    // warnings already checked and cached in displaySet
    if (displaySet.inconsistencyWarnings) {
      return displaySet.inconsistencyWarnings;
    }

    if (
      displaySet.reconstructionIssues &&
      displaySet.reconstructionIssues.length !== 0
    ) {
      displaySet.reconstructionIssues.forEach(warning => {
        switch (warning) {
          case ReconstructionIssues.DATASET_4D:
            inconsistencyWarnings.push('The dataset is 4D.');
            break;
          case ReconstructionIssues.VARYING_IMAGESDIMENSIONS:
            inconsistencyWarnings.push(
              'The dataset frames have different dimensions (rows, columns).'
            );
            break;
          case ReconstructionIssues.VARYING_IMAGESCOMPONENTS:
            inconsistencyWarnings.push(
              'The dataset frames have different components (Sample per pixel).'
            );
            break;
          case ReconstructionIssues.VARYING_IMAGESORIENTATION:
            inconsistencyWarnings.push(
              'The dataset frames have different orientation.'
            );
            break;
          case ReconstructionIssues.IRREGULAR_SPACING:
            inconsistencyWarnings.push(
              'The dataset frames have different pixel spacing.'
            );
            break;
          case ReconstructionIssues.MULTIFFRAMES:
            inconsistencyWarnings.push('The dataset is a multiframes.');
            break;
          default:
            break;
        }
      });
      inconsistencyWarnings.push(
        'The datasets is not a reconstructable 3D volume. MPR mode is not available.'
      );
    }

    if (
      displaySet.missingFrames &&
      (!displaySet.reconstructionIssues ||
        (displaySet.reconstructionIssues &&
          !displaySet.reconstructionIssues.find(
            warn => warn === ReconstructionIssues.DATASET_4D
          )))
    ) {
      inconsistencyWarnings.push(
        'The datasets is missing frames: ' + displaySet.missingFrames + '.'
      );
    }

    if (displaySet.isSOPClassUIDSupported === false) {
      inconsistencyWarnings.push('The datasets is not supported.');
    }
    displaySet.inconsistencyWarnings = inconsistencyWarnings;
  } else {
    if (displaySet.loadError) {
      inconsistencyWarnings.push(displaySet.segLoadErrorMessagge);
      displaySet.inconsistencyWarnings = inconsistencyWarnings;
    }
  }

  return inconsistencyWarnings;
};

/**
 * Checks if display set is active, i.e. if the series is currently shown
 * in the active viewport.
 *
 * For data display set, this functions checks if the active
 * display set instance uid in the current active viewport is the same of the
 * thumbnail one.
 *
 * For derived modalities (e.g., SEG and RTSTRUCT), the function gets the
 * reference display set and then checks the reference uid with the active
 * display set instance uid.
 *
 * @param {displaySet} displaySet
 * @param {Study[]} studies
 * @param {string} activeDisplaySetInstanceUID
 * @returns {boolean} is active.
 */
const _isDisplaySetActive = function(
  displaySet,
  studies,
  activeDisplaySetInstanceUID
) {
  let active = false;

  const { displaySetInstanceUID } = displaySet;

  // TO DO: in the future, we could possibly support new modalities
  // we should have a list of all modalities here, instead of having hard coded checks
  if (
    displaySet.Modality !== 'SEG' &&
    displaySet.Modality !== 'RTSTRUCT' &&
    displaySet.Modality !== 'SR'
  ) {
    active = activeDisplaySetInstanceUID === displaySetInstanceUID;
  } else if (displaySet.Modality === 'SR') {
    active = activeDisplaySetInstanceUID === displaySetInstanceUID;

    if (!active && displaySet.getSourceDisplaySet) {
      const referencedDisplaySet = displaySet.getSourceDisplaySet(
        studies,
        false
      );
      if (referencedDisplaySet && referencedDisplaySet.length !== 0) {
        for (let i = 0; i < referencedDisplaySet.length; i++) {
          if (
            referencedDisplaySet[i].displaySetInstanceUID ===
            activeDisplaySetInstanceUID
          ) {
            active = true;
            break;
          }
        }
      }
    }
  } else if (displaySet.getSourceDisplaySet) {
    if (displaySet.Modality === 'SEG') {
      const { referencedDisplaySet } = displaySet.getSourceDisplaySet(
        studies,
        false
      );
      active = referencedDisplaySet
        ? activeDisplaySetInstanceUID ===
          referencedDisplaySet.displaySetInstanceUID
        : false;
    } else {
      const referencedDisplaySet = displaySet.getSourceDisplaySet(
        studies,
        false
      );
      active = referencedDisplaySet
        ? activeDisplaySetInstanceUID ===
          referencedDisplaySet.displaySetInstanceUID
        : false;
    }
  }

  return active;
};

/**
 * What types are these? Why do we have "mapping" dropped in here instead of in
 * a mapping layer?
 *
 * TODO[react]:
 * - Add showStackLoadingProgressBar option
 *
 * @param {Study[]} studies
 * @param {string} activeDisplaySetInstanceUID
 */
const _mapStudiesToThumbnails = function(studies, activeDisplaySetInstanceUID) {
  return studies.map(study => {
    const { StudyInstanceUID } = study;
    const thumbnails = study.displaySets.map(displaySet => {
      const {
        displaySetInstanceUID,
        SeriesDescription,
        numImageFrames,
        SeriesNumber,
      } = displaySet;

      let imageId;
      let altImageText;

      if (displaySet.Modality && displaySet.Modality === 'SEG') {
        altImageText = 'SEG';
      } else if (displaySet.Modality && displaySet.Modality === 'SR') {
        altImageText = 'SR';
      } else if (displaySet.images && displaySet.images.length) {
        const imageIndex = Math.floor(displaySet.images.length / 2);
        imageId = displaySet.images[imageIndex].getImageId();
      } else if (displaySet.isSOPClassUIDSupported === false) {
        altImageText = displaySet.SOPClassUIDNaturalized;
      } else {
        altImageText = displaySet.Modality ? displaySet.Modality : 'UN';
      }

      const hasWarnings = _checkForSeriesInconsistencesWarnings(displaySet);

      const hasDerivedDisplaySets = _checkForDerivedDisplaySets(
        displaySet,
        study
      );

      return {
        active: _isDisplaySetActive(
          displaySet,
          studies,
          activeDisplaySetInstanceUID
        ),
        imageId,
        altImageText,
        displaySetInstanceUID,
        SeriesDescription,
        numImageFrames,
        SeriesNumber,
        hasWarnings,
        hasDerivedDisplaySets,
      };
    });

    return {
      StudyInstanceUID,
      thumbnails,
    };
  });
};
