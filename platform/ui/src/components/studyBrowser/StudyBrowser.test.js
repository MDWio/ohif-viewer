import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudyBrowser } from './StudyBrowser';

jest.mock('./Thumbnail.js', () => ({ Thumbnail: () => null }));
jest.mock('./StudyBrowser.styl', () => ({}), { virtual: true });

const thumbnail = (uid, SeriesNumber) => ({
  displaySetInstanceUID: uid,
  SeriesNumber,
  SeriesDescription: 'Structured Report in JPEG Format',
});

const ctStudy = {
  StudyInstanceUID: '1.2.392.200036.9123.100.11.12.500005026.2015121409510556',
  StudyDescription: 'CT CHEST',
  thumbnails: [thumbnail('ct-1', 1), thumbnail('ct-995', 995)],
};

const reportStudy = {
  StudyInstanceUID: '1.2.840.138643.9019878.0.768.2020980',
  thumbnails: [thumbnail('report-995', 995)],
};

const headers = html => html.match(/class="study-header"/g) || [];

describe('StudyBrowser study headers', () => {
  it('renders no header for a single study', () => {
    const html = renderToStaticMarkup(<StudyBrowser studies={[ctStudy]} />);

    expect(headers(html)).toHaveLength(0);
  });

  it('renders one attributable header per study when several studies are merged', () => {
    const html = renderToStaticMarkup(
      <StudyBrowser studies={[ctStudy, reportStudy]} />
    );

    expect(headers(html)).toHaveLength(2);
    expect(html).toContain('CT CHEST');
    expect(html).toContain('Study 2');
    expect(html).toContain(
      `data-tooltip="Study Instance UID: ${reportStudy.StudyInstanceUID}"`
    );
    expect(html).toContain('data-tooltip="Study Description: CT CHEST');
    expect(html).toContain('1.2.840.138643.9019878.0.768.2020980');
  });
});
