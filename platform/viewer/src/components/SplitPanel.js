import React from 'react';
import PropTypes from 'prop-types';
import ConnectedStudyBrowser from '../connectedComponents/ConnectedStudyBrowser.js';
import './SplitPanel.css';

const SplitPanel = React.memo(function SplitPanel({
  topStudy,
  bottomStudy,
  viewportIndexTop,
  viewportIndexBottom,
  topStudyMetadata,
  bottomStudyMetadata,
  activeViewportIndex,
  showThumbnailProgressBar,
}) {
  const isTopActive = activeViewportIndex === viewportIndexTop;
  const isBottomActive = activeViewportIndex === viewportIndexBottom;

  return (
    <div className="split-panel">
      <div className={`split-panel-top ${isTopActive ? 'active' : 'inactive'}`}>
        <div className="split-panel-content">
          <ConnectedStudyBrowser
            studies={topStudy}
            studyMetadata={topStudyMetadata}
            viewportIndex={viewportIndexTop}
            showThumbnailProgressBar={showThumbnailProgressBar}
          />
        </div>
      </div>
      <div
        className={`split-panel-bottom ${isBottomActive ? 'active' : 'inactive'
          }`}
      >
        <div className="split-panel-content">
          <ConnectedStudyBrowser
            studies={bottomStudy}
            studyMetadata={bottomStudyMetadata}
            viewportIndex={viewportIndexBottom}
            showThumbnailProgressBar={showThumbnailProgressBar}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.topStudy === nextProps.topStudy &&
    prevProps.bottomStudy === nextProps.bottomStudy &&
    prevProps.topStudyMetadata === nextProps.topStudyMetadata &&
    prevProps.bottomStudyMetadata === nextProps.bottomStudyMetadata &&
    prevProps.viewportIndexTop === nextProps.viewportIndexTop &&
    prevProps.viewportIndexBottom === nextProps.viewportIndexBottom &&
    prevProps.activeViewportIndex === nextProps.activeViewportIndex &&
    prevProps.showThumbnailProgressBar === nextProps.showThumbnailProgressBar
  );
});

SplitPanel.propTypes = {
  topStudy: PropTypes.arrayOf(PropTypes.object),
  bottomStudy: PropTypes.arrayOf(PropTypes.object),
  topTitle: PropTypes.string,
  bottomTitle: PropTypes.string,
  viewportIndexTop: PropTypes.number,
  viewportIndexBottom: PropTypes.number,
  topStudyMetadata: PropTypes.arrayOf(PropTypes.object),
  bottomStudyMetadata: PropTypes.arrayOf(PropTypes.object),
  activeViewportIndex: PropTypes.number,
  showThumbnailProgressBar: PropTypes.bool,
};

export default SplitPanel;
