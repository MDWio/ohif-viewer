import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import { api } from 'dicomweb-client';
import DICOMWeb from '../DICOMWeb';

import errorHandler from '../errorHandler';
import getXHRRetryRequestHook from './xhrRetryRequestHook';

const getImageId = imageObj => {
  if (!imageObj) {
    return;
  }

  return typeof imageObj.getImageId === 'function'
    ? imageObj.getImageId()
    : imageObj.url;
};

const findImageIdOnStudies = (studies, displaySetInstanceUID) => {
  const study = studies.find(study => {
    const displaySet = study.displaySets.some(
      displaySet => displaySet.displaySetInstanceUID === displaySetInstanceUID
    );
    return displaySet;
  });
  const { series = [] } = study;
  const { instances = [] } = series[0] || {};
  const instance = instances[0];

  return getImageId(instance);
};

const someInvalidStrings = strings => {
  const stringsArray = Array.isArray(strings) ? strings : [strings];
  const emptyString = string => !string;
  let invalid = stringsArray.some(emptyString);
  return invalid;
};

const getImageInstance = dataset => {
  return dataset && dataset.images && dataset.images[0];
};

const getImageInstanceId = imageInstance => {
  return getImageId(imageInstance);
};

const fetchIt = (url, headers = DICOMWeb.getAuthorizationHeader()) => {
  return fetch(url, headers).then(response => response.arrayBuffer());
};

const cornerstoneRetriever = imageId => {
  return cornerstone.loadAndCacheImage(imageId).then(image => {
    return image && image.data && image.data.byteArray.buffer;
  });
};

const wadorsRetriever = (
  url,
  studyInstanceUID,
  seriesInstanceUID,
  sopInstanceUID,
  headers = DICOMWeb.getAuthorizationHeader(),
  errorInterceptor = errorHandler.getHTTPErrorHandler()
) => {
  const config = {
    url,
    headers,
    errorInterceptor,
    requestHooks: [getXHRRetryRequestHook()],
  };
  const dicomWeb = new api.DICOMwebClient(config);

  return dicomWeb.retrieveInstance({
    studyInstanceUID,
    seriesInstanceUID,
    sopInstanceUID,
  });
};

const getImageLoaderType = imageId => {
  const loaderRegExp = /^\w+\:/;
  const loaderType = loaderRegExp.exec(imageId);

  return (
    (loaderRegExp.lastIndex === 0 &&
      loaderType &&
      loaderType[0] &&
      loaderType[0].replace(':', '')) ||
    ''
  );
};

class DicomLoaderService {
  getLocalData(dataset, studies) {
    if (dataset && dataset.localFile) {
      // Use referenced imageInstance
      const imageInstance = getImageInstance(dataset);
      let imageId = getImageInstanceId(imageInstance);

      // or Try to get it from studies
      if (someInvalidStrings(imageId)) {
        imageId = findImageIdOnStudies(studies, dataset.displaySetInstanceUID);
      }

      if (!someInvalidStrings(imageId)) {
        return cornerstoneWADOImageLoader.wadouri.loadFileRequest(imageId);
      }
    }
  }

  async getDataByImageType(dataset, studies) {
    const imageInstance = getImageInstance(dataset);

    if (imageInstance) {
      const imageId = getImageInstanceId(imageInstance);
      let getDicomDataMethod = fetchIt;
      const loaderType = getImageLoaderType(imageId);

      switch (loaderType) {
        case 'dicomfile':
          getDicomDataMethod = cornerstoneRetriever.bind(this, imageId);
          break;
        case 'dicomweb': {
          const imageLink = imageId.replace('dicomweb:', '');
          let blob = await fetch(imageLink).then(r => r.blob());
          const file = new File([blob], 'name');

          const imagePath = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
          return cornerstoneWADOImageLoader.wadouri.loadFileRequest(imagePath);
        }
        case 'wadors':
          const url = imageInstance.getData().wadoRoot;
          const studyInstanceUID = imageInstance.getStudyInstanceUID();
          const seriesInstanceUID = imageInstance.getSeriesInstanceUID();
          const sopInstanceUID = imageInstance.getSOPInstanceUID();
          const invalidParams = someInvalidStrings([
            url,
            studyInstanceUID,
            seriesInstanceUID,
            sopInstanceUID,
          ]);
          if (invalidParams) {
            return;
          }

          getDicomDataMethod = wadorsRetriever.bind(
            this,
            url,
            studyInstanceUID,
            seriesInstanceUID,
            sopInstanceUID
          );
          break;
        case 'wadouri':
          // Strip out the image loader specifier
          imageId = imageId.substring(imageId.indexOf(':') + 1);

          if (someInvalidStrings(imageId)) {
            return;
          }
          getDicomDataMethod = fetchIt.bind(this, imageId);
          break;
      }

      return getDicomDataMethod();
    } else if (studies[0].displaySets[0].Modality === 'DOC') {
      const link = studies[0].series[0].instances[0].url.replace('dicomweb:', '');

      let blob = await fetch(link).then(r => r.blob());
      const file = new File([blob], 'name');

      const imagePath = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);

      return cornerstoneWADOImageLoader.wadouri.loadFileRequest(imagePath);
    }
  }

  getDataByDatasetType(dataset) {
    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      SOPInstanceUID,
      authorizationHeaders,
      wadoRoot,
      wadoUri,
    } = dataset;
    // Retrieve wadors or just try to fetch wadouri
    if (!someInvalidStrings(wadoRoot)) {
      return wadorsRetriever(
        wadoRoot,
        StudyInstanceUID,
        SeriesInstanceUID,
        SOPInstanceUID,
        authorizationHeaders
      );
    } else if (!someInvalidStrings(wadoUri)) {
      return fetchIt(wadoUri, { headers: authorizationHeaders });
    }
  }

  *getLoaderIterator(dataset, studies) {
    yield this.getLocalData(dataset, studies);
    yield this.getDataByImageType(dataset, studies);
    yield this.getDataByDatasetType(dataset);
  }

  findDicomDataPromise(dataset, studies) {
    const loaderIterator = this.getLoaderIterator(dataset, studies);
    // it returns first valid retriever method.
    for (const loader of loaderIterator) {
      if (loader) {
        return loader;
      }
    }

    // in case of no valid loader
    throw new Error('Invalid dicom data loader');
  }
}

const dicomLoaderService = new DicomLoaderService();

export default dicomLoaderService;
