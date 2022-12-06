/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import React, { Component } from 'react';
import { metadata, utils, log } from '@ohif/core';
import PropTypes from 'prop-types';
import qs from 'querystring';

import { extensionManager } from './../App.js';
import filesToStudies from '../lib/filesToStudies';
import ConnectedViewer from '../connectedComponents/ConnectedViewer';
import NotFound from '../routes/NotFound';
import { result } from 'lodash';

const { studyMetadataManager } = utils;
const { OHIFStudyMetadata } = metadata;

class StandaloneRouting extends Component {
  static propTypes = {
    studies: PropTypes.array,
    location: PropTypes.object,
  };

  state = {
    studies: null,
    loading: false,
    error: null,
    loadedImages: 0,
    allImages: 0,
  };

  updateStudies = studies => {
    // Render the viewer when the data is ready
    studyMetadataManager.purge();

    // Map studies to new format, update metadata manager?
    const updatedStudies = studies.map(study => {
      const studyMetadata = new OHIFStudyMetadata(
        study,
        study.StudyInstanceUID
      );
      const sopClassHandlerModules =
        extensionManager.modules['sopClassHandlerModule'];

      study.displaySets =
        study.displaySets ||
        studyMetadata.createDisplaySets(sopClassHandlerModules);

      studyMetadata.forEachDisplaySet(displayset => {
        displayset.localFile = true;
      });

      studyMetadataManager.add(studyMetadata);

      return study;
    });

    this.setState({
      studies: updatedStudies,
    });
  };

  parseQueryAndRetrieveDICOMWebData(query) {
    return new Promise((resolve, reject) => {
      const url = query.url;
      const token = query.authToken;

      if (!url) {
        return reject(new Error('No URL was specified. Use ?url=$yourURL'));
      }

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

        if (data.success === false) {
          this.setState({ error: data.message, loading: false });
        }

        let studyFiles = [];
        // let promiseQueue = [];
        let i = 0;

        this.setState({ allImages: data.length });
        this.setState({ loading: true });

        for (const link of data) {
          let blob = await fetch(link).then(r => r.blob());
          const file = new File([blob], 'name' + i++);
          studyFiles.push(file);
          this.setState({ loadedImages: i });
        }

        this.setState({ loading: false });

        resolve({ studyFiles: studyFiles });

        // for (const link of data) {
        //   promiseQueue.push(fetch(link));
        // }

        // Promise.allSettled(promiseQueue).then(async results => {
        //   for (const result of results) {
        //     let blob = await result.value.blob();
        //     const file = new File([blob], 'name' + i++);
        //     studyFiles.push(file);
        //   }

        //   this.setState({ loading: false });

        //   resolve({ studyFiles });
        // });
      });

      // Open the Request to the server for the JSON data
      // In this case we have a server-side route called /api/
      // which responds to POST requests with the study data
      log.info(`Sending Request to: ${url}`);
      oReq.open('POST', url);
      oReq.setRequestHeader('Authorization', 'Basic ' + token);
      oReq.setRequestHeader('Accept', 'application/json');

      // Fire the request to the server
      oReq.send();
    });
  }

  async componentDidMount() {
    try {
      let { search } = this.props.location;

      // Remove ? prefix which is included for some reason
      search = search.slice(1, search.length);
      const query = qs.parse(search);

      let { studyFiles } = await this.parseQueryAndRetrieveDICOMWebData(query);
      const studies = await filesToStudies(studyFiles);
      const updatedStudies = this.updateStudies(studies);

      if (!updatedStudies) {
        console.log('no updated studies');
        return;
      }

      this.setState({ studies: updatedStudies, loading: false });
    } catch (error) {
      this.setState({ error: error.message, loading: false });
    }
  }

  render() {
    const message = this.state.error
      ? `Error: ${JSON.stringify(this.state.error)}`
      : `Loading... ${this.state.loadedImages} of ${this.state.allImages} images completed`;
    if (this.state.error || this.state.loading) {
      return <NotFound message={message} showGoBackButton={this.state.error} />;
    }

    return this.state.studies ? (
      <ConnectedViewer
        studies={this.state.studies}
        studyInstanceUIDs={
          this.state.studies && this.state.studies.map(a => a.StudyInstanceUID)
        }
      />
    ) : (
      <h3> Loading... </h3>
    );
  }
}

export default StandaloneRouting;
