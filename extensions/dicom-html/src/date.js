import moment from 'moment-timezone';

export const DICOM_DATE_FORMAT = 'YYYYMMDD';
// 070907.0705 represents a time of 7 hours, 9 minutes and 7.0705 seconds.
export const DICOM_TIME_FORMAT = 'HHmmss';

export function parseDateTimeFromDicomTag(dateString, timeString) {
  return parseDate(
    dateString + timeString,
    DICOM_DATE_FORMAT + DICOM_TIME_FORMAT,
    false
  );
}

export function parseDateFromDicomTag(dateString) {
  return parseDate(dateString, DICOM_DATE_FORMAT, false);
}

export function formatDate(date, isUtc = false, outputFormat = 'MM/DD/YYYY') {
  if (!moment(date).isValid()) {
    return '';
  }
  if (isUtc) {
    return moment.utc(date).format(outputFormat);
  }

  return moment(date).format(outputFormat);
}

export function parseDate(dateString, format = 'YYYY-MM-DD', utc = false) {
  if (!dateString) {
    return '';
  }

  const momentDate = utc
    ? moment.utc(dateString, format)
    : moment(dateString, format);

  return momentDate.isValid() ? momentDate.toDate() : undefined;
}
