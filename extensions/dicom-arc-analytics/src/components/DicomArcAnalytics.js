/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { cornerstone as OHIFCornerstone } from '@ohif/core';
import './DicomArcAnalytics.css';
import OHIF from '@ohif/core';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import ServiceSelect from './ServiceSelect';
import ServiceSelectItem from './ServiceSelectItem';

const { log } = OHIF;
const { metadataProvider } = OHIFCornerstone;

const DicomArcAnalytics = ({ displaySets }) => {
  const [state, setState] = useState({
    login: '',
    password: '',
    error: '',
    token: '',
    isLoading: false,
    services: [],
    selectedService: null,
    config: null,
  });

  let url = 'http://localhost:8000';
  const urlJson = metadataProvider.getUrlJson();
  const api = {
    auth: '/api/auth',
    servicesList: '/api/services/list',
    servicesSend: '/api/services/send',
  };

  const save = (field, value) => {
    setState(state => ({ ...state, [field]: value }));
  };

  useEffect(() => {
    if (!urlJson.studies) {
      return;
    }

    if (
      window.config.arcAnalyticsExtensionConfig &&
      window.config.arcAnalyticsExtensionConfig.serviceUrl
    ) {
      save('config', window.config.arcAnalyticsExtensionConfig);
      url = window.config.arcAnalyticsExtensionConfig.serviceUrl;
    }

    if (localStorage.getItem('token')) {
      try {
        save('token', localStorage.getItem('token'));
        getServicesListApi();
      } catch (e) {
        save('isLoading', false);
        save('error', e);
      }
    }
  }, []);

  function authenticateApi() {
    const xhr = createXhrRequest('POST', url + api.auth, false);

    if (!xhr) {
      return;
    }

    xhr.onload = function(response) {
      if (response.target.status === 200) {
        save('error', '');
        save('token', response.target.responseText);
        localStorage.setItem('token', response.target.responseText);
        try {
          getServicesListApi();
        } catch (e) {
          save('error', e);
        }
      } else {
        save('error', response.target.responseText);
      }
      save('isLoading', false);
    };

    xhr.onerror = function(response) {
      save('error', `Connection error: ${response.target.responseText}`);
      save('isLoading', false);
    };

    const body = { login: state.login, password: state.password };

    save('isLoading', true);
    xhr.send(JSON.stringify(body));
  }

  function getServicesListApi() {
    const xhr = createXhrRequest('POST', url + api.servicesList);

    if (!xhr) {
      return;
    }

    xhr.onload = function(response) {
      if (response.target.status === 200) {
        save('error', '');
        try {
          if (response.target.responseText) {
            const res = JSON.parse(response.target.responseText);
            if (Array.isArray(res.services) && res.services.length > 0) {
              const mappedServices = res.services.map(service => ({
                title: service.name,
                value: service.id,
                description: service.description,
                onClick: () => save('selectedService', service.id),
              }));
              save('services', mappedServices);
              save('selectedService', mappedServices[0].value);
            }
          }
        } catch (e) {
          save('error', e);
        }
      } else if (response.target.status === 401) {
        logOut();
        save('error', 'Authorization token is not valid');
      } else {
        save('error', response.target.responseText);
      }
      save('isLoading', false);
    };

    xhr.onerror = function(response) {
      save('error', `Connection error: ${response.target.responseText}`);
      save('isLoading', false);
    };

    save('isLoading', true);
    xhr.send();
  }

  function sendToServiceApi() {
    const xhr = createXhrRequest('POST', url + api.servicesSend);

    if (!xhr) {
      return;
    }

    xhr.onerror = function(response) {
      save('error', `Connection error: ${response.target.responseText}`);
      save('isLoading', false);
    };

    xhr.onload = function(response) {
      if (response.target.status === 200) {
        save('error', '');
        try {
          if (response.target.responseText) {
            const res = JSON.parse(response.target.responseText);
            openNewViewerJson(res);
          }
        } catch (e) {
          save('error', e);
        }
      } else if (response.target.status === 401) {
        logOut();
        save('error', 'Authorization token is not valid');
      } else {
        save('error', response.target.responseText);
      }
      save('isLoading', false);
    };

    if (!urlJson) {
      save('error', 'No urlJson');
      return;
    }

    const body = { serviceId: state.selectedService, studies: urlJson };

    save('isLoading', true);
    xhr.send(JSON.stringify(body));
  }

  function createXhrRequest(method, url, auth = true) {
    const xhr = new XMLHttpRequest();

    log.info(`Sending Request to: ${url}`);
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');

    if (!auth) {
      return xhr;
    }

    if (!localStorage.getItem('token')) {
      save('error', 'No auth token');
      return;
    } else {
      xhr.setRequestHeader(
        'Authorization',
        'Bearer ' + localStorage.getItem('token')
      );
    }

    return xhr;
  }

  function logOut() {
    setState({
      login: '',
      password: '',
      error: '',
      token: '',
      isLoading: false,
      services: [],
      selectedService: null,
    });

    localStorage.removeItem('token');
  }

  function openNewViewerJson(json) {
    const jsonStr = JSON.stringify(json);
    const encodedStr = encodeURIComponent(jsonStr);
    const url = `/viewer?json=${encodedStr}`;
    window.open(url, '_self');
  }

  const selectedServiceValue = state.services.find(
    service => service.value === state.selectedService
  );

  return (
    (!urlJson.studies && <ErrorMessage message="No json is provided" />) ||
    (state.isLoading && (
      <LoadingIndicator expand height="70px" width="70px" />
    )) ||
    (!state.token && (
      <div>
        <form>
          <label>Login</label>
          <input
            type="text"
            name="login"
            className="form-control control-margin"
            onChange={event => save('login', event.target.value)}
            value={state.login}
          ></input>
          <label> Password </label>
          <input
            type="password"
            name="password"
            className="form-control control-margin"
            onChange={event => save('password', event.target.value)}
            value={state.password}
          ></input>
          {state.error && <ErrorMessage message={state.error} />}
          <button
            className="btn btn-primary control-margin"
            onClick={authenticateApi}
          >
            Authenticate
          </button>
        </form>
      </div>
    )) || (
      <div className="wrap-select">
        <div className="justify-right">
          <button
            className="btn btn-primary btn-header"
            onClick={getServicesListApi}
          >
            Refresh list
          </button>
          <button className="btn btn-primary btn-header" onClick={logOut}>
            Log Out
          </button>
        </div>
        <ServiceSelect
          value={selectedServiceValue}
          formatOptionLabel={ServiceSelectItem}
          options={state.services}
        />
        {state.error && <ErrorMessage message={state.error} />}
        <button
          className="btn btn-primary btn-footer"
          onClick={sendToServiceApi}
        >
          Send To Service
        </button>
      </div>
    )
  );
};

export default DicomArcAnalytics;
