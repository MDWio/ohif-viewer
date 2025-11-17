import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './OpenSearchTagsTab.css';
import {
  ES3GatewayApiUrl,
  httpRequestToS3Gateway,
} from '../../../../common/api';
import OHIF from '@ohif/core';

const { log } = OHIF;

const OpenSearchTagsTab = ({
  studyMetadata,
  urlJsonData,
  UINotificationService,
  onClose,
}) => {
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [originalTags, setOriginalTags] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [openSearchId, setOpenSearchId] = useState(null);
  const [openSearchIndex, setOpenSearchIndex] = useState(null);

  const studyData = studyMetadata.getData();
  const studyInstanceUID = studyMetadata.getStudyInstanceUID();

  const getOpenSearchId = () => {
    if (window.config && window.config.openSearchId) {
      return window.config.openSearchId;
    }
  };

  const getOpenSearchIndex = () => {
    if (window.config && window.config.openSearchIndex) {
      return window.config.openSearchIndex;
    }
  };

  useEffect(() => {
    try {
      if (!urlJsonData || !urlJsonData.studies) {
        log.error('No urlJsonData available');

        return;
      }

      const index = getOpenSearchIndex();

      const currentStudy = urlJsonData.studies.find(
        study => study.StudyInstanceUID === studyInstanceUID
      );

      if (currentStudy) {
        let studyId = null;

        const ids = getOpenSearchId();

        if (ids && ids.includes(',')) {
          const idArray = ids.split(',');
          const studyIndex = urlJsonData.studies.findIndex(
            s => s.StudyInstanceUID === studyInstanceUID
          );
          if (studyIndex >= 0 && studyIndex < idArray.length) {
            studyId = idArray[studyIndex];
          } else {
            log.error('Could not determine correct ID for study');
          }
        } else {
          studyId = ids;
        }

        setOpenSearchId(studyId);
        setOpenSearchIndex(index);

        if (currentStudy.Tags && Array.isArray(currentStudy.Tags)) {
          log.info('Loaded existing tags:', currentStudy.Tags);
          setTags(currentStudy.Tags);
          setSelectedTags([...currentStudy.Tags]);
          setOriginalTags([...currentStudy.Tags]);
        } else {
          log.info('No Tags in study data');
        }
      } else {
        log.error('Current study not found in urlJsonData');
      }
    } catch (error) {
      log.error('Error loading existing tags:', error);
    }

    setIsLoading(true);
    httpRequestToS3Gateway(ES3GatewayApiUrl.OPENSEARCH_SUGGESTED_TAGS_LIST)
      .then(response => {
        log.info('Loaded suggested tags:', response.data);
        setSuggestedTags(response.data);
        setIsLoading(false);
      })
      .catch(err => {
        setError('Failed to load suggested tags: ' + err.message);
        setIsLoading(false);
      });
  }, [studyInstanceUID, urlJsonData]);

  const handleTagToggle = tag => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddNewTag = () => {
    const trimmedTag = newTagInput.trim();

    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
      if (!suggestedTags.includes(trimmedTag)) {
        setSuggestedTags([...suggestedTags, trimmedTag]);
      }
      setNewTagInput('');
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      handleAddNewTag();
    }
  };

  const haveTagsChanged = () => {
    if (selectedTags.length !== originalTags.length) {
      return true;
    }

    const sortedSelected = [...selectedTags].sort();
    const sortedOriginal = [...originalTags].sort();

    return !sortedSelected.every((tag, index) => tag === sortedOriginal[index]);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    if (!openSearchId || !openSearchIndex) {
      const errorMsg = 'Missing OpenSearch document ID or index';
      setError(errorMsg);
      setIsLoading(false);
      log.error(errorMsg);

      return;
    }

    const body = {
      id: openSearchId,
      index: openSearchIndex,
      studyInstanceUID,
      value: selectedTags,
    };

    try {
      await httpRequestToS3Gateway(
        ES3GatewayApiUrl.OPENSEARCH_DOC_TAGS_UPDATE,
        body
      );

      setIsLoading(false);
      setTags(selectedTags);
      log.info('Tags successfully saved:', tags, '->', selectedTags);

      studyData.Tags = selectedTags;

      if (UINotificationService) {
        UINotificationService.show({
          title: 'OpenSearch Tags Updated',
          message: 'Study tags have been successfully updated.',
          type: 'success',
          autoClose: true,
        });
      }
    } catch (err) {
      setIsLoading(false);
      const errorMessage = 'Failed to update tags: ' + err.message;
      setError(errorMessage);

      if (UINotificationService) {
        UINotificationService.show({
          title: 'Error',
          message: errorMessage,
          type: 'error',
          autoClose: false,
        });
      }
    }
  };

  return (
    <>
      <div className="opensearch-tags-tab">
        <div className="opensearch-tags-content">
          <div className="tag-input-section">
            <label>Add New Tag:</label>
            <div className="tag-input-container">
              <input
                type="text"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter tag name..."
                disabled={isLoading}
              />
              <button
                className="btn-add"
                onClick={handleAddNewTag}
                disabled={isLoading || !newTagInput.trim()}
              >
                Add
              </button>
            </div>
          </div>

          <div className="selected-tags-section">
            <label>Selected Tags:</label>
            <div className="tags-container">
              {selectedTags.length === 0 ? (
                <p className="no-tags">No tags selected</p>
              ) : (
                selectedTags.map(tag => (
                  <span key={tag} className="tag tag-selected">
                    {tag}
                    <button
                      className="tag-remove"
                      onClick={() => handleTagToggle(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="suggested-tags-section">
            <label>Suggested Tags:</label>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <div className="tags-container">
                {suggestedTags
                  .filter(tag => !selectedTags.includes(tag))
                  .map(tag => (
                    <span
                      key={tag}
                      className="tag tag-suggested"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                      <span className="tag-add">+</span>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      <div className="tab-footer">
        <button className="btn-cancel" onClick={onClose} disabled={isLoading}>
          Cancel
        </button>
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={isLoading || !haveTagsChanged()}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </>
  );
};

OpenSearchTagsTab.propTypes = {
  studyMetadata: PropTypes.object.isRequired,
  urlJsonData: PropTypes.object,
  UINotificationService: PropTypes.object,
  onClose: PropTypes.func,
};

export default OpenSearchTagsTab;
