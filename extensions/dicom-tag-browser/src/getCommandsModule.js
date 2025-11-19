import { utils } from '@ohif/core';
import OHIF from '@ohif/core';
import React from 'react';
import { TabComponents } from '@ohif/ui';
import DicomTagBrowser from './components/DicomTagBrowser';
import OpenSearchTagsTab from './components/OpenSearchTagsTab';
import OpenSearchCommentsTab from './components/OpenSearchCommentsTab';

const { studyMetadataManager } = utils;
const { log } = OHIF;

export default function getCommandsModule(servicesManager) {
  const actions = {
    openDICOMTagViewer({ viewports }) {
      const { activeViewportIndex, viewportSpecificData } = viewports;
      const activeViewportSpecificData =
        viewportSpecificData[activeViewportIndex];

      const {
        StudyInstanceUID,
        displaySetInstanceUID,
      } = activeViewportSpecificData;

      const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
      const displaySets = studyMetadata.getDisplaySets();

      const {
        UIModalService,
        UINotificationService,
      } = servicesManager.services;

      const isOpenSearchEnabled = checkIfOpenSearchEnabled();

      let urlJsonData;
      try {
        const metadataProvider = OHIF.cornerstone.metadataProvider;
        if (
          metadataProvider &&
          typeof metadataProvider.getUrlJson === 'function'
        ) {
          urlJsonData = metadataProvider.getUrlJson();
        }
      } catch (error) {
        log.error('Error getting urlJson:', error);
      }

      const tabs = [
        {
          name: 'DICOM Tags',
          Component: DicomTagBrowser,
          customProps: {
            displaySets,
            displaySetInstanceUID,
            studyMetadata,
          },
        },
      ];

      if (isOpenSearchEnabled) {
        tabs.push({
          name: 'OpenSearch Tags',
          Component: OpenSearchTagsTab,
          customProps: {
            studyMetadata,
            urlJsonData,
            UINotificationService,
          },
        });
        tabs.push({
          name: 'OpenSearch Comments',
          Component: OpenSearchCommentsTab,
          customProps: {
            studyMetadata,
            urlJsonData,
            UINotificationService,
          },
        });
      }

      const WrappedTagBrowser = function() {
        return (
          <TabComponents
            tabs={tabs}
            customProps={{
              onClose: () => UIModalService.hide(),
            }}
          />
        );
      };

      UIModalService.show({
        content: WrappedTagBrowser,
        title: `Tag Browser`,
        fullscreen: true,
        noScroll: true,
      });
    },
  };

  const definitions = {
    openDICOMTagViewer: {
      commandFn: actions.openDICOMTagViewer,
      storeContexts: ['servers', 'viewports'],
    },
  };

  return {
    actions,
    definitions,
  };
}

function checkIfOpenSearchEnabled() {
  return !!(
    window.config &&
    window.config.openSearchId &&
    window.config.openSearchIndex &&
    window.config.openSearchApiKey
  );
}
