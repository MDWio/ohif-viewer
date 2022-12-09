export function parseNames(nameLast, nameFirst, nameMiddle) {
  const name =
    `${nameLast || ''}` +
    `${nameLast ? ',' : ''} ` +
    `${nameFirst || ''} ` +
    `${nameMiddle || ''}`.replace(/\s\s+/g, ' '); // removing double spaces;

  return name.trim().replace(/,+$/, '');
}
