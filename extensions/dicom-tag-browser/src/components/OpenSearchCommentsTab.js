import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './OpenSearchCommentsTab.css';
import {
  ES3GatewayApiUrl,
  httpRequestToS3Gateway,
} from '../../../../common/api';
import OHIF from '@ohif/core';

const { log } = OHIF;

const OpenSearchCommentsTab = ({
  studyMetadata,
  urlJsonData,
  UINotificationService,
  onClose,
}) => {
  const [comments, setComments] = useState('');
  const [originalComments, setOriginalComments] = useState('');
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
            log.error(
              `Study index ${studyIndex} is out of bounds for OpenSearch IDs array (length ${idArray.length}) in OpenSearchCommentsTab`
            );
            studyId = null;
          }
        } else {
          studyId = ids;
        }

        setOpenSearchId(studyId);

        if (index) {
          setOpenSearchIndex(index);
        }

        if (currentStudy.Comments) {
          setComments(currentStudy.Comments);
          setOriginalComments(currentStudy.Comments);
        } else {
          log.info('No Comments in study data');
        }
      } else {
        log.error('Current study not found in urlJsonData');
      }
    } catch (error) {
      log.error('Error loading existing comments:', error);
    }
  }, [studyInstanceUID, urlJsonData]);

  const haveCommentsChanged = () => {
    return comments !== originalComments;
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
      value: comments,
    };

    try {
      await httpRequestToS3Gateway(
        ES3GatewayApiUrl.OPENSEARCH_DOC_COMMENTS_UPDATE,
        body
      );

      setIsLoading(false);
      setOriginalComments(comments);

      studyData.Comments = comments;

      if (UINotificationService) {
        UINotificationService.show({
          title: 'OpenSearch Comments Updated',
          message: 'Study comments have been successfully updated.',
          type: 'success',
          autoClose: true,
        });
      }
    } catch (err) {
      setIsLoading(false);
      const errorMessage = 'Failed to update comments: ' + err.message;
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
      <div className="opensearch-comments-tab">
        <div className="opensearch-comments-content">
          <div className="comments-input-section">
            <label>Comments:</label>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Enter your comments here..."
              disabled={isLoading}
              rows={10}
            />
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
          disabled={isLoading || !haveCommentsChanged()}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </>
  );
};

OpenSearchCommentsTab.propTypes = {
  studyMetadata: PropTypes.object.isRequired,
  urlJsonData: PropTypes.object,
  UINotificationService: PropTypes.object,
  onClose: PropTypes.func,
};

export default OpenSearchCommentsTab;
