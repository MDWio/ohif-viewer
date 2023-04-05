/* eslint-disable no-console */
import React, { Component } from 'react';
import OHIF from '@ohif/core';
import PropTypes from 'prop-types';
import qs from 'querystring';

import { extensionManager } from './../App.js';
import ConnectedViewer from '../connectedComponents/ConnectedViewer';
import NotFound from '../routes/NotFound';

const { log, metadata, utils } = OHIF;
const { studyMetadataManager } = utils;
const { OHIFStudyMetadata } = metadata;

class StandaloneRouting extends Component {
  state = {
    studies: null,
    studyInstanceUIDs: null,
    seriesInstanceUIDs: null,
    error: null,
    loading: true,
  };

  static propTypes = {
    location: PropTypes.object,
    store: PropTypes.object,
    setServers: PropTypes.func,
  };

  parseQueryAndRetrieveDICOMWebData(query) {
    return new Promise((resolve, reject) => {
      const url = query.url;
      const json = query.json;
      const token = query.authToken;

      if (!url) {
        return reject(new Error('No URL was specified. Use ?url=$yourURL'));
      }

      if (url && json) {
        // Request is from OpenSearch Dashboards
        const data = JSON.parse(json);
        const metadataProvider = OHIF.cornerstone.metadataProvider;

        let StudyInstanceUID;
        let SeriesInstanceUID;

        data.studies[0].series[0].instances[0].url = 'dicomweb:' + url;

        for (const study of data.studies) {
          StudyInstanceUID = study.StudyInstanceUID;

          for (const series of study.series) {
            SeriesInstanceUID = series.SeriesInstanceUID;

            for (const instance of series.instances) {
              const { metadata: naturalizedDicom } = instance;

              metadataProvider.addInstance(naturalizedDicom);
              metadataProvider.addImageIdToUIDs(url, {
                StudyInstanceUID,
                SeriesInstanceUID,
                SOPInstanceUID: naturalizedDicom.SOPInstanceUID,
              });
            }
          }
        }

        resolve({ studies: data.studies, studyInstanceUIDs: [] });
      } else {
        // Define a request to the server to retrieve the study data
        // as JSON, given a URL that was in the Route
        const oReq = new XMLHttpRequest();

        // Add event listeners for request failure
        oReq.addEventListener('error', error => {
          log.warn('An error occurred while retrieving the JSON data');
          reject(error);
        });

        // When the JSON has been returned, parse it into a JavaScript Object
        // and render the OHIF Viewer with this data
        oReq.addEventListener('load', async event => {
          if (event.target.status === 404) {
            reject(new Error('No JSON data found'));
          }

          // Parse the response content
          // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseText
          if (!oReq.responseText) {
            log.warn('Response was undefined');
            reject(new Error('Response was undefined'));
          }

          const data = JSON.parse(oReq.responseText);
          // Parse data here and add to metadata provider.
          const metadataProvider = OHIF.cornerstone.metadataProvider;

          let StudyInstanceUID;
          let SeriesInstanceUID;

          for (const study of data.studies) {
            StudyInstanceUID = study.StudyInstanceUID;

            for (const series of study.series) {
              SeriesInstanceUID = series.SeriesInstanceUID;

              for (const instance of series.instances) {
                const { url: imageId, metadata: naturalizedDicom } = instance;

                // Add instance to metadata provider.
                metadataProvider.addInstance(naturalizedDicom);
                // Add imageId specific mapping to this data as the URL isn't necessarliy WADO-URI.
                metadataProvider.addImageIdToUIDs(imageId, {
                  StudyInstanceUID,
                  SeriesInstanceUID,
                  SOPInstanceUID: naturalizedDicom.SOPInstanceUID,
                });
              }
            }
          }

          resolve({ studies: data.studies, studyInstanceUIDs: [] });
        });

        // Open the Request to the server for the JSON data
        // In this case we have a server-side route called /api/
        // which responds to GET requests with the study data
        log.info(`Sending Request to: ${url}`);
        oReq.open('GET', url);
        oReq.setRequestHeader('Authorization', 'Basic ' + token);
        oReq.setRequestHeader('Accept', 'application/json');

        // Fire the request to the server
        oReq.send();
      }
    });
  }

  async componentDidMount() {
    try {
      let { search } = this.props.location;

      // Remove ? prefix which is included for some reason
      search = search.slice(1, search.length);
      const query = qs.parse(search);

      let {
        studies,
        studyInstanceUIDs,
        seriesInstanceUIDs,
      } = await this.parseQueryAndRetrieveDICOMWebData(query);

      if (studies) {
        const {
          studies: updatedStudies,
          studyInstanceUIDs: updatedStudiesInstanceUIDs,
        } = _mapStudiesToNewFormat(studies);
        studies = updatedStudies;
        studyInstanceUIDs = updatedStudiesInstanceUIDs;
      }

      this.setState({
        studies,
        studyInstanceUIDs,
        seriesInstanceUIDs,
        loading: false,
      });
    } catch (error) {
      this.setState({ error: error.message, loading: false });
    }
  }

  render() {
    const message = this.state.error
      ? `Error: ${JSON.stringify(this.state.error)}`
      : `Loading...`;
    if (this.state.error || this.state.loading) {
      return <NotFound message={message} showGoBackButton={this.state.error} />;
    }

    if (this.state.studies) {
      return <ConnectedViewer studies={this.state.studies} />;
    } else {
      const unknownError = `There happened error while loading viewer`;
      return <NotFound message={unknownError} />;
    }
  }
}

const _mapStudiesToNewFormat = studies => {
  studyMetadataManager.purge();

  /* Map studies to new format, update metadata manager? */
  const uniqueStudyUIDs = new Set();
  const updatedStudies = studies.map(study => {
    const studyMetadata = new OHIFStudyMetadata(study, study.StudyInstanceUID);

    const sopClassHandlerModules =
      extensionManager.modules['sopClassHandlerModule'];
    study.displaySets =
      study.displaySets ||
      studyMetadata.createDisplaySets(sopClassHandlerModules);

    studyMetadataManager.add(studyMetadata);
    uniqueStudyUIDs.add(study.StudyInstanceUID);

    return study;
  });

  return {
    studies: updatedStudies,
    studyInstanceUIDs: Array.from(uniqueStudyUIDs),
  };
};

export default StandaloneRouting;
