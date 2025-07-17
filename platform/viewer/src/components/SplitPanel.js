import React from 'react';
import PropTypes from 'prop-types';
import ConnectedStudyBrowser from '../../ConnectedStudyBrowser.js';
import './SplitPanel.css';

function SplitPanel({
  topStudy,
  bottomStudy,
  topTitle,
  bottomTitle,
  viewportIndexTop,
  viewportIndexBottom,
  activeViewportIndex,
}) {
  const isTopActive = activeViewportIndex === viewportIndexTop;
  const isBottomActive = activeViewportIndex === viewportIndexBottom;

  return (
    <div className="split-panel">
      <div className={`split-panel-top ${isTopActive ? 'active' : 'inactive'}`}>
        <div className="split-panel-title">{topTitle}</div>
        <div className="split-panel-content">
          <ConnectedStudyBrowser
            studies={topStudy}
            studyMetadata={topStudy}
            viewportIndex={viewportIndexTop}
          />
        </div>
      </div>
      <div
        className={`split-panel-bottom ${
          isBottomActive ? 'active' : 'inactive'
        }`}
      >
        <div className="split-panel-title">{bottomTitle}</div>
        <div className="split-panel-content">
          <ConnectedStudyBrowser
            studies={bottomStudy}
            studyMetadata={bottomStudy}
            viewportIndex={viewportIndexBottom}
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
  activeViewportIndex: PropTypes.number,
};

export default SplitPanel;
