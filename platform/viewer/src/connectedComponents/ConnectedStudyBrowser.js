/* eslint-disable prettier/prettier */
import OHIF from '@ohif/core';
import { connect } from 'react-redux';
import findDisplaySetByUID from './findDisplaySetByUID';
import { servicesManager } from './../App.js';
import { StudyBrowser } from '../../../ui/src/components/studyBrowser/StudyBrowser';

const { setActiveViewportSpecificData, setViewportActive } = OHIF.redux.actions;

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onThumbnailClick: displaySetInstanceUID => {
      let displaySet = findDisplaySetByUID(
        ownProps.studyMetadata,
        displaySetInstanceUID
      );

      const { LoggerService, UINotificationService } = servicesManager.services;

      if (displaySet.isDerived) {
        const { Modality } = displaySet;
        if (Modality === 'SEG' && servicesManager) {
          const onDisplaySetLoadFailureHandler = error => {
            const message =
              error.message.includes('orthogonal') ||
              error.message.includes('oblique')
                ? 'The segmentation has been detected as non coplanar,\
                If you really think it is coplanar,\
                please adjust the tolerance in the segmentation panel settings (at your own peril!)'
                : error.message;

            LoggerService.error({ error, message });
            UINotificationService.show({
              title: 'DICOM Segmentation Loader',
              message,
              type: 'error',
              autoClose: false,
            });
          };

          const {
            referencedDisplaySet,
            activatedLabelmapPromise,
          } = displaySet.getSourceDisplaySet(
            ownProps.studyMetadata,
            true,
            onDisplaySetLoadFailureHandler
          );
          displaySet = referencedDisplaySet;

          activatedLabelmapPromise.then(activatedLabelmapIndex => {
            const selectionFired = new CustomEvent(
              'extensiondicomsegmentationsegselected',
              {
                detail: { activatedLabelmapIndex: activatedLabelmapIndex },
              }
            );
            const segThumbnailSelected = new CustomEvent('segseriesselected');
            document.dispatchEvent(selectionFired);
            document.dispatchEvent(segThumbnailSelected);
          });
        } else if (Modality !== 'SR') {
          displaySet = displaySet.getSourceDisplaySet(ownProps.studyMetadata);
        }

        if (!displaySet) {
          const error = new Error(
            `Referenced series for ${Modality} dataset not present.`
          );
          const message = `Referenced series for ${Modality} dataset not present.`;
          LoggerService.error({ error, message });
          UINotificationService.show({
            autoClose: false,
            title: 'Fail to load series',
            message,
            type: 'error',
          });
        }
      }

      if (!displaySet) {
        const error = new Error('Source data not present');
        const message = 'Source data not present';
        LoggerService.error({ error, message });
        UINotificationService.show({
          autoClose: false,
          title: 'Fail to load series',
          message,
          type: 'error',
        });
      }

      if (displaySet.isSOPClassUIDSupported === false) {
        const error = new Error('Modality not supported');
        const message = 'Modality not supported';
        LoggerService.error({ error, message });
        UINotificationService.show({
          autoClose: false,
          title: 'Fail to load series',
          message,
          type: 'error',
        });
      }

      if (displaySet && displaySet.images[0] && displaySet.images[0]._data && displaySet.images[0]._data.metadata
        && displaySet.images[0]._data.metadata.PhotometricInterpretation === 'YBR_FULL') {
        const error = new Error(`Color mode 'YBR Full' is not supported`);
        const message = `Color mode 'YBR Full' is not supported`;
        LoggerService.error({ error, message });
        UINotificationService.show({
          autoClose: false,
          title: 'Fail to load series',
          message,
          type: 'error',
        });
      }

      if(Number.isInteger(ownProps.viewportIndex) && ownProps.viewportIndex >= 0) {
        dispatch(setViewportActive(ownProps.viewportIndex));
      }

      dispatch(setActiveViewportSpecificData(displaySet));
    },
  };
};

const ConnectedStudyBrowser = connect(
  null,
  mapDispatchToProps
)(StudyBrowser);

export default ConnectedStudyBrowser;
