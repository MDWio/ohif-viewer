window.config = {
  routerBasename: '/',
  extensions: [],
  showStudyList: false,
  filterQueryParam: false,
  disableServersCache: false,
  studyPrefetcher: {
    enabled: true,
    order: 'closest',
    displaySetCount: 3,
    preventCache: false,
    prefetchDisplaySetsTimeout: 300,
    maxNumPrefetchRequests: 100,
    displayProgress: true,
    includeActiveDisplaySet: true,
  },
  servers: {},
  cornerstoneExtensionConfig: {},
  // Following property limits number of simultaneous series metadata requests.
  // For http/1.x-only servers, set this to 5 or less to improve
  //  on first meaningful display in viewer
  // If the server is particularly slow to respond to series metadata
  //  requests as it extracts the metadata from raw files everytime,
  //  try setting this to even lower value
  // Leave it undefined for no limit, suitable for HTTP/2 enabled servers
  // maxConcurrentMetadataRequests: 5,
};
