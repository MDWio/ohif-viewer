import React from 'react';
import PropTypes from 'prop-types';
import DicomTagBrowser from './DicomTagBrowser';
import OpenSearchTagsTab from './OpenSearchTagsTab';
import './TagBrowserTabs.css';

/**
 * Tab Components wrapper for Tag Browser
 * Displays DICOM Tags, OpenSearch Tags and OpenSearch Comments in separate tabs
 */
function TagBrowserTabs({
  displaySets,
  displaySetInstanceUID,
  studyMetadata,
  onClose,
  isOpenSearchEnabled,
}) {
  const [currentTab, setCurrentTab] = React.useState(0);

  const tabs = [
    {
      name: 'DICOM Tags',
      Component: DicomTagBrowser,
      props: {
        displaySets,
        displaySetInstanceUID,
      },
    },
  ];

  if (isOpenSearchEnabled) {
    tabs.push({
      name: 'OpenSearch Tags',
      Component: OpenSearchTagsTab,
      props: {
        studyMetadata,
        onClose,
      },
    });
  }

  return (
    <div className="tag-browser-tabs">
      <div className="tab-headers">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-header ${index === currentTab ? 'active' : ''}`}
            onClick={() => setCurrentTab(index)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`tab-pane ${index === currentTab ? 'active' : ''}`}
            style={{ display: index === currentTab ? 'block' : 'none' }}
          >
            <tab.Component {...tab.props} />
          </div>
        ))}
      </div>
    </div>
  );
}

TagBrowserTabs.propTypes = {
  displaySets: PropTypes.array.isRequired,
  displaySetInstanceUID: PropTypes.string.isRequired,
  studyMetadata: PropTypes.object,
  onClose: PropTypes.func,
  isOpenSearchEnabled: PropTypes.bool,
};

TagBrowserTabs.defaultProps = {
  isOpenSearchEnabled: false,
};

export default TagBrowserTabs;
