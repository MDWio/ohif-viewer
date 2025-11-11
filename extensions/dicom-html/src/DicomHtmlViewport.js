/* eslint-disable no-case-declarations */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import dcmjs from 'dcmjs';
import TypedArrayProp from './TypedArrayProp';
import {
  formatDate,
  parseDateTimeFromDicomTag,
  parseDateFromDicomTag,
} from './date';
import { parseNames } from './parseNames';
import { PersonName } from './PersonName';
import { PersonNameNormalizer } from './PersonNameNormalizer';

import './DicomHtmlViewport.css';

function getRelationshipString(data) {
  switch (data.RelationshipType) {
    case 'HAS CONCEPT MOD':
      return 'Concept modifier: ';
    case 'HAS OBS CONTEXT':
      return 'Observation context: ';
    default:
      return '';
  }
}

const getMeaningString = data => {
  if (data.ConceptNameCodeSequence) {
    const conceptNameSequence = Array.isArray(data.ConceptNameCodeSequence)
      ? data.ConceptNameCodeSequence[0]
      : data.ConceptNameCodeSequence;

    const { CodeMeaning } = conceptNameSequence;

    return `${CodeMeaning}`;
  }

  return '';
};

function getValueString(data) {
  switch (data.ValueType) {
    case 'CODE':
      const conceptCodeSequence = Array.isArray(data.ConceptCodeSequence)
        ? data.ConceptCodeSequence[0]
        : data.ConceptCodeSequence;

      if (conceptCodeSequence) {
        const {
          CodeMeaning,
          CodeValue,
          CodingSchemeDesignator,
        } = conceptCodeSequence;
        return `${CodeMeaning} (${CodeValue}, ${CodingSchemeDesignator})`;
      }
      return '';

    case 'PNAME':
      return data.PersonName;

    case 'TEXT':
      return data.TextValue;

    case 'UIDREF':
      return data.UID;

    case 'NUM':
      const { MeasuredValueSequence } = data;
      if (MeasuredValueSequence && Array.isArray(MeasuredValueSequence)) {
        const measuredValue = MeasuredValueSequence[0];
        const numValue = measuredValue.NumericValue;
        const unitsSequence = measuredValue.MeasurementUnitsCodeSequence;
        if (unitsSequence && Array.isArray(unitsSequence)) {
          const codeValue = unitsSequence[0].CodeValue;
          const codeMeaning = unitsSequence[0].CodeMeaning;
          return `${numValue} ${codeMeaning || codeValue}`;
        }
        return `${numValue}`;
      } else if (MeasuredValueSequence) {
        const numValue = MeasuredValueSequence.NumericValue;
        const codeValue =
          MeasuredValueSequence.MeasurementUnitsCodeSequence.CodeValue;
        return `${numValue} ${codeValue || ''}`;
      }
      return '';
  }
}

function constructPlainValue(data) {
  const value = getValueString(data);

  if (value) {
    return getRelationshipString(data) + getMeaningString(data) + value;
  }
}

function constructContentSequence(data, header) {
  if (!data.ContentSequence) {
    return;
  }

  const items = data.ContentSequence.map(item => parseContent(item)).filter(
    item => item
  );

  if (!items.length) {
    return;
  }

  const result = {
    items,
  };

  if (header) {
    result.header = header;
  }

  return result;
}

function parseContent(data) {
  if (data.ValueType) {
    if (data.ValueType === 'CONTAINER') {
      const header = data.ConceptNameCodeSequence.CodeMeaning;

      return constructContentSequence(data, header);
    }

    return constructPlainValue(data);
  }

  if (data.ContentSequence) {
    return constructContentSequence(data);
  }
}

function normalizePersonName(rawPersonName) {
  const personName = new PersonName(rawPersonName);
  const normalizerPersonName = new PersonNameNormalizer(personName);
  const normalizedPersonName = normalizerPersonName.normalize();

  return parseNames(
    normalizedPersonName.getLastName(),
    normalizedPersonName.getFirstName(),
    normalizedPersonName.getMiddleName()
  );
}

function capitalizeOnlyFirstLetter(string) {
  if (!string) {
    return '';
  }

  string = string.toLowerCase();
  return (
    string
      .toLowerCase()
      .charAt(0)
      .toUpperCase() + string.slice(1)
  );
}

const { DicomMetaDictionary, DicomMessage } = dcmjs.data;

function getMainData(data) {
  const root = [];

  // Main Header - Report
  const datetime = formatDate(
    parseDateTimeFromDicomTag(data.ContentDate, data.ContentTime),
    false,
    'MM/DD/YYYY HH:mm:ss'
  );
  const reportDate = data.InstitutionName
    ? `By ${data.InstitutionName} on ${datetime}`
    : `On ${datetime}`;
  root.push(
    <>
      <h2 className="secondary-color" key="report">
        Report
      </h2>
      <div className="report-date" key="reportDate">
        <nobr> {reportDate} </nobr>
      </div>
    </>
  );

  // Patient
  root.push(
    <>
      <h3 className="secondary-color" key="report">
        Patient
      </h3>
    </>
  );

  const patientName = normalizePersonName(data.PatientName);
  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Patient Name: </nobr>
        {patientName}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Patient ID: </nobr>
        {data.PatientID}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Patient Sex: </nobr>
        {data.PatientSex}
      </div>
    </>
  );

  const patientBirthDate = formatDate(
    parseDateFromDicomTag(data.PatientBirthDate),
    false,
    'MM/DD/YYYY'
  );
  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Patient DoB: </nobr>
        {patientBirthDate}
      </div>
    </>
  );

  // Study
  root.push(
    <>
      <h3 className="secondary-color" key="report">
        Study
      </h3>
    </>
  );

  const studyDateTime = formatDate(
    parseDateTimeFromDicomTag(data.StudyDate, data.StudyTime),
    false,
    'MM/DD/YYYY HH:mm:ss'
  );
  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Study Date: </nobr>
        {studyDateTime}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Study ID: </nobr>
        {data.StudyID}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Accession Number: </nobr>
        {data.AccessionNumber}
      </div>
    </>
  );

  const referringPhysicianName = normalizePersonName(
    data.ReferringPhysicianName
  );
  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Referring Physician: </nobr>
        {referringPhysicianName}
      </div>
    </>
  );

  // Report Status
  root.push(
    <>
      <h3 className="secondary-color" key="report">
        Report status
      </h3>
    </>
  );

  const completionFlag = capitalizeOnlyFirstLetter(data.CompletionFlag);
  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Completion Flag: </nobr>
        {completionFlag}
      </div>
    </>
  );

  const verificationFlag = capitalizeOnlyFirstLetter(data.VerificationFlag);
  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Verification Flag: </nobr>
        {verificationFlag}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Content Creator Name: </nobr>
        {data.ContentCreatorName}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Content Description: </nobr>
        {data.ContentDescription}
      </div>
    </>
  );

  // Manufacturer
  root.push(
    <>
      <h3 className="secondary-color" key="report">
        Manufacturer
      </h3>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Manufacturer: </nobr>
        {data.Manufacturer}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Manufacturer Model Name: </nobr>
        {data.ManufacturerModelName}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Device Identifier: </nobr>
        {data.UniqueDeviceIdentifier}
      </div>
    </>
  );

  root.push(
    <>
      <div key="patient">
        <nobr className="sr-title-field-color"> Software Versions: </nobr>
        {data.SoftwareVersions}
      </div>
    </>
  );

  // const patientValue = `${data.PatientName} (${data.PatientSex}, #${data.PatientID})`;
  // root.push(getMainDataItem('Patient', patientValue));

  // const studyValue = data.StudyDescription;
  // root.push(getMainDataItem('Study', studyValue));

  // const seriesValue = `${data.SeriesDescription} (#${data.SeriesNumber})`;
  // root.push(getMainDataItem('Series', seriesValue));

  // const manufacturerValue = `${data.Manufacturer} (${data.ManufacturerModelName}, #${data.DeviceSerialNumber})`;

  // root.push(getMainDataItem('Manufacturer', manufacturerValue));

  // const mainDataObjects = {
  //   CompletionFlag: 'Completion flag',
  //   VerificationFlag: 'Verification flag',
  // };

  // Object.keys(mainDataObjects).forEach(key => {
  //   if (!data[key]) {
  //     return;
  //   }

  //   const item = getMainDataItem(mainDataObjects[key], data[key]);

  //   root.push(item);
  // });

  // // TODO: Format these dates
  // const contentDateTimeValue = `${data.ContentDate} ${data.ContentTime}`;
  // root.push(getMainDataItem('Content Date/Time', contentDateTimeValue));

  root.push();

  return <div>{root}</div>;
}

const getContentSequence = (data, level = 1) => {
  const root = [];
  let keyCounter = 0;

  // Handle ValueType entries (NUM, TEXT, CODE, PNAME, UIDREF, CONTAINER)
  if (data.ValueType) {
    if (data.ValueType === 'CONTAINER') {
      // For containers, show header and process ContentSequence
      let header;
      if (data.ConceptNameCodeSequence) {
        const { CodeMeaning } = data.ConceptNameCodeSequence;
        header = `${CodeMeaning}`;
      }

      if (header) {
        root.push(
          <div
            className="sr-header"
            key={`header-${level}-${keyCounter++}-${header}`}
          >
            <nobr className="sr-header-color">{header}</nobr>
          </div>
        );
      }

      if (data.ContentSequence) {
        if (Array.isArray(data.ContentSequence)) {
          data.ContentSequence.forEach((item, index) => {
            root.push(
              <div key={`content-${level}-${keyCounter++}-${index}`}>
                {getContentSequence(item, level + 1)}
              </div>
            );
          });
        } else {
          root.push(
            <div key={`content-${level}-${keyCounter++}-single`}>
              {getContentSequence(data.ContentSequence, level + 1)}
            </div>
          );
        }
      }
    } else {
      // For other value types (NUM, TEXT, CODE, PNAME, UIDREF), display the value
      const plainValue = getValueString(data);
      const header = getRelationshipString(data) + getMeaningString(data);
      if (plainValue) {
        root.push(
          <div
            className="sr-header"
            key={`value-${level}-${keyCounter++}-${plainValue}`}
          >
            <nobr className="sr-title-field-color">{header}: </nobr>
            {plainValue}
          </div>
        );
      }
    }
  } else if (data.ContentSequence) {
    // Handle ContentSequence without ValueType
    if (Array.isArray(data.ContentSequence)) {
      data.ContentSequence.forEach((item, index) => {
        root.push(
          <div key={`content-novalue-${level}-${keyCounter++}-${index}`}>
            {getContentSequence(item, level + 1)}
          </div>
        );
      });
    } else {
      root.push(
        <div key={`content-novalue-${level}-${keyCounter++}-single`}>
          {getContentSequence(data.ContentSequence, level + 1)}
        </div>
      );
    }
  } else {
    // Fallback: iterate through all keys (original logic for non-SR standard data)
    Object.keys(data).forEach(key => {
      const value = data[key];

      let content;
      if (value instanceof Object) {
        content = getContentSequence(value, level + 1);
      } else if (key === 'TextValue') {
        content = (
          <div
            className="sr-header"
            key={`text-${level}-${keyCounter++}-${key}`}
          >
            <nobr className="sr-header-color">
              {data.ConceptNameCodeSequence.CodeMeaning}:{' '}
            </nobr>{' '}
            {data[key]}
          </div>
        );
      }

      if (content) {
        root.push(
          <div key={`obj-${level}-${keyCounter++}-${key}`}>{content}</div>
        );
      }
    });
  }

  return <div>{root}</div>;
};

// function getMainDataItem(key, value) {
//   return (
//     <div key={key}>
//       <b className="sr-title-field-color">{key}</b>: {value}
//     </div>
//   );
// }

class DicomHtmlViewport extends Component {
  state = {
    content: null,
    error: null,
  };

  static propTypes = {
    byteArray: TypedArrayProp.uint8,
    setViewportActive: PropTypes.func.isRequired,
    viewportIndex: PropTypes.number.isRequired,
    activeViewportIndex: PropTypes.number.isRequired,
  };

  componentDidMount() {
    this.setContentFromByteArray(this.props.byteArray);
  }

  setContentFromByteArray(byteArray) {
    const arrayBuffer = byteArray.buffer;
    const dicomData = DicomMessage.readFile(arrayBuffer);
    const dataset = DicomMetaDictionary.naturalizeDataset(dicomData.dict);
    dataset._meta = DicomMetaDictionary.namifyDataset(dicomData.meta);
    dataset._meta = DicomMetaDictionary.naturalizeDataset(dataset._meta);

    const mainData = getMainData(dataset);
    const contentSequence = getContentSequence(dataset);
    const content = (
      <>
        {mainData}
        {<hr className="sr-hr" key={'hr'} />}
        {contentSequence}
      </>
    );

    this.setState({
      content,
    });
  }

  setViewportActiveHandler = () => {
    const {
      setViewportActive,
      viewportIndex,
      activeViewportIndex,
    } = this.props;

    if (viewportIndex !== activeViewportIndex) {
      setViewportActive(viewportIndex);
    }
  };

  render() {
    const { content, error } = this.state;

    return (
      <div
        data-cy="dicom-html-viewport"
        className="DicomHtmlViewport"
        onClick={this.setViewportActiveHandler}
        onScroll={this.setViewportActiveHandler}
      >
        {content}
        {error && <h2>{JSON.stringify(error)}</h2>}
      </div>
    );
  }
}

export default DicomHtmlViewport;
