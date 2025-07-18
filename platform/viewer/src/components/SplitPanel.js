import React from 'react';
import PropTypes from 'prop-types';
import ConnectedStudyBrowser from '../connectedComponents/ConnectedStudyBrowser.js';
import './SplitPanel.css';

function SplitPanel({
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
        className={`split-panel-bottom ${
          isBottomActive ? 'active' : 'inactive'
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
}

SplitPanel.propTypes = {
  topStudy: PropTypes.any,
  bottomStudy: PropTypes.any,
  topTitle: PropTypes.string,
  bottomTitle: PropTypes.string,
  viewportIndexTop: PropTypes.number,
  viewportIndexBottom: PropTypes.number,
  topStudyMetadata: PropTypes.any,
  bottomStudyMetadata: PropTypes.any,
  activeViewportIndex: PropTypes.number,
  showThumbnailProgressBar: PropTypes.bool,
};

export default SplitPanel;
