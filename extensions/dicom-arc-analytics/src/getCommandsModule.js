import React from 'react';
import DicomArcAnalytics from './components/DicomArcAnalytics';

export default function getCommandsModule(servicesManager) {
  const actions = {
    openDICOMAnalyticsViewer() {
      const { UIModalService } = servicesManager.services;

      const WrappedDicomArcAnalytics = function() {
        return <DicomArcAnalytics />;
      };

      UIModalService.show({
        content: WrappedDicomArcAnalytics,
        title: `DICOM Arc Analytics`,
        fullscreen: false,
        noScroll: false,
      });
    },
  };

  const definitions = {
    openDICOMArcAnalytics: {
      commandFn: actions.openDICOMAnalyticsViewer,
      storeContexts: ['servers', 'viewports'],
    },
  };

  return {
    actions,
    definitions,
  };
}
