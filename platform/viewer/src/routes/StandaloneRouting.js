/* eslint-disable no-undef */
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
    isDualMod: false,
  };

  static propTypes = {
    location: PropTypes.object,
    store: PropTypes.object,
    setServers: PropTypes.func,
  };

  parseQueryAndRetrieveDICOMWebData(query) {
    return new Promise((resolve, reject) => {
      const url = query.url;
      const username = query.username;
      const isDualMod = query.isDualMod === 'true';

      if (!url) {
        return reject(new Error('No URL was specified. Use ?url=$yourURL'));
      }

      const oReq = new XMLHttpRequest();

      oReq.addEventListener('error', error => {
        log.warn('An error occurred while retrieving the JSON data');
        reject(error);
      });

      oReq.addEventListener('load', async event => {
        if (event.target.status !== 201) {
          reject(new Error('Failed to retrieve data from S3 gateway'));
        }

        if (!oReq.responseText) {
          log.warn('Response was undefined');
          reject(new Error('Response was undefined'));
        }

        const data = JSON.parse(oReq.responseText);

        if (!data.studies || !data.studies.length) {
          log.warn('No studies were provided in the JSON data');
          reject(new Error('No studies were provided in the JSON data'));
        }

        this.fillMetadata(data);

        resolve({ studies: data.studies, studyInstanceUIDs: [], isDualMod });
      });

      log.info(`Sending Request to: ${url}`);
      oReq.open('POST', url);
      oReq.setRequestHeader('x-username', username);
      oReq.setRequestHeader('Accept', 'application/json');

      // Fire the request to the server
      oReq.send();
    });
  }

  fillMetadata(data) {
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

    metadataProvider.setUrlJson(data);
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
        isDualMod,
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
        isDualMod,
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
      return (
        <ConnectedViewer
          studies={this.state.studies}
          isDualMod={this.state.isDualMod}
        />
      );
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
