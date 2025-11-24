const ES3GatewayApiUrl = {
  OPENSEARCH_DOC_COMMENTS_UPDATE: '/api/opensearch/doc/comments/update',
  OPENSEARCH_DOC_TAGS_UPDATE: '/api/opensearch/doc/tags/update',
  OPENSEARCH_SUGGESTED_TAGS_LIST: '/api/opensearch/tags/list',
  OPENSEARCH_JSON_GET: '/api/opensearch/json/get',
};

const parseErrorResponse = (responseText, statusCode, defaultMessage) => {
  let errorMessage = defaultMessage;

  try {
    if (responseText) {
      const errorData = JSON.parse(responseText);
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    }
  } catch (parseError) {
    // If parsing fails, use the default message
  }

  if (statusCode === 401) {
    errorMessage = 'Authentication failed: ' + errorMessage;
  }

  return errorMessage;
};

const httpRequestToS3Gateway = (apiUrl, body) => {
  const getS3GatewayUrl = () => {
    if (window.config && window.config.s3GatewayUrl) {
      return window.config.s3GatewayUrl;
    }
  };

  const baseUrl = getS3GatewayUrl();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${baseUrl}${apiUrl}`;

    xhr.addEventListener('error', () => {
      reject(
        new Error(
          `The url: '${url}' is not reachable. Please verify the url is correct and the S3 Gateway service is running.`
        )
      );
    });

    xhr.addEventListener('load', () => {
      if (!xhr.responseText) {
        reject(new Error('Response was undefined'));

        return;
      }

      if (xhr.status === 401) {
        const authErrorMessage = parseErrorResponse(
          xhr.responseText,
          401,
          'Please verify that you are logged into OpenSearch Dashboards and have proper permissions.'
        );

        reject(new Error(authErrorMessage));

        return;
      }

      if (xhr.status !== 200 && xhr.status !== 201) {
        try {
          const parsedResponseText = JSON.parse(xhr.responseText);
          reject(
            new Error(
              parsedResponseText.message ||
                `Request failed with status code: ${xhr.status}`
            )
          );
        } catch {
          reject(
            new Error(
              `Request failed with status code: ${xhr.status}, ${xhr.responseText}`
            )
          );
        }

        return;
      }

      try {
        const data = JSON.parse(xhr.responseText);
        resolve({ data });
      } catch (err) {
        reject(new Error('Failed to parse response JSON'));
      }
    });

    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

    // Include credentials to send cookies automatically
    xhr.withCredentials = true;

    xhr.send(body ? JSON.stringify(body) : undefined);
  });
};

export { ES3GatewayApiUrl, httpRequestToS3Gateway, parseErrorResponse };
