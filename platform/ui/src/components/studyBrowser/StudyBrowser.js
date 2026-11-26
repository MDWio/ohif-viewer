import React from 'react';
import PropTypes from 'prop-types';
import { Thumbnail } from './Thumbnail.js';
import './StudyBrowser.styl';

function StudyBrowser(props) {
  const {
    studies,
    onThumbnailClick,
    onThumbnailDoubleClick,
    supportsDrag,
    showThumbnailProgressBar,
  } = props;

  return (
    <div className="study-browser">
      <div className="scrollable-study-thumbnails">
        {studies
          .map((study, studyIndex) => {
            const { StudyInstanceUID } = study;
            const header =
              studies.length > 1 ? getStudyHeader(study, studyIndex) : null;
            const thumbnailElements = study.thumbnails.map(
              (thumb, thumbIndex) => {
                // TODO: Thumb has more props than we care about?
                const {
                  active,
                  altImageText,
                  displaySetInstanceUID,
                  imageId,
                  derivedDisplaySetsNumber,
                  numImageFrames,
                  SeriesDescription,
                  SeriesNumber,
                  hasWarnings,
                  hasDerivedDisplaySets,
                } = thumb;

                if (altImageText === 'GrayscaleSoftcopyPresentationState') {
                  return;
                }

                return (
                  <div
                    key={thumb.displaySetInstanceUID}
                    className="thumbnail-container"
                    data-cy="thumbnail-list"
                  >
                    <Thumbnail
                      active={active}
                      supportsDrag={supportsDrag}
                      key={`${studyIndex}_${thumbIndex}`}
                      id={`${studyIndex}_${thumbIndex}`} // Unused?
                      // Study
                      StudyInstanceUID={StudyInstanceUID} // used by drop
                      // Thumb
                      altImageText={altImageText}
                      imageId={imageId}
                      derivedDisplaySetsNumber={derivedDisplaySetsNumber}
                      displaySetInstanceUID={displaySetInstanceUID} // used by drop
                      numImageFrames={numImageFrames}
                      SeriesDescription={SeriesDescription}
                      SeriesNumber={SeriesNumber}
                      hasWarnings={hasWarnings}
                      hasDerivedDisplaySets={hasDerivedDisplaySets}
                      // Events
                      onClick={onThumbnailClick.bind(
                        undefined,
                        displaySetInstanceUID
                      )}
                      onDoubleClick={onThumbnailDoubleClick}
                      showProgressBar={showThumbnailProgressBar}
                    />
                  </div>
                );
              }
            );

            if (!header) {
              return thumbnailElements;
            }

            return [
              <div
                key={`header_${StudyInstanceUID}`}
                className="study-header"
                data-cy="study-header"
              >
                <div
                  className="study-header-line study-header-text"
                  data-tooltip={header.textTooltip}
                >
                  <span>{header.text}</span>
                </div>
                <div
                  className="study-header-line study-header-uid"
                  data-tooltip={header.uidTooltip}
                >
                  {header.uid}
                </div>
              </div>,
              ...thumbnailElements,
            ];
          })
          .flat()}
      </div>
    </div>
  );
}

function getStudyHeader(study, studyIndex) {
  const { StudyInstanceUID, StudyDescription, StudyDate } = study;
  const title = StudyDescription || `Study ${studyIndex + 1}`;

  return {
    text: StudyDate ? `${title} (${StudyDate})` : title,
    textTooltip: `Study Description: ${StudyDescription ||
      '-'}\nStudy Date: ${StudyDate || '-'}`,
    uid: StudyInstanceUID,
    uidTooltip: `Study Instance UID: ${StudyInstanceUID}`,
  };
}

const noop = () => {};

StudyBrowser.propTypes = {
  studies: PropTypes.arrayOf(
    PropTypes.shape({
      StudyInstanceUID: PropTypes.string.isRequired,
      StudyDescription: PropTypes.string,
      StudyDate: PropTypes.string,
      thumbnails: PropTypes.arrayOf(
        PropTypes.shape({
          altImageText: PropTypes.string,
          displaySetInstanceUID: PropTypes.string.isRequired,
          imageId: PropTypes.string,
          derivedDisplaySetsNumber: PropTypes.number,
          numImageFrames: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string,
          ]),
          SeriesDescription: PropTypes.string,
          SeriesNumber: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string,
          ]),
          stackPercentComplete: PropTypes.number,
        })
      ),
    })
  ).isRequired,
  supportsDrag: PropTypes.bool,
  onThumbnailClick: PropTypes.func,
  onThumbnailDoubleClick: PropTypes.func,
  showThumbnailProgressBar: PropTypes.bool,
  viewportIndex: PropTypes.number,
};

StudyBrowser.defaultProps = {
  studies: [],
  supportsDrag: true,
  onThumbnailClick: noop,
  onThumbnailDoubleClick: noop,
  showThumbnailProgressBar: true,
};

export { StudyBrowser };
