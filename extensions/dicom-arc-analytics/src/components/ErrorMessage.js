import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({ message = '' }) => {
  return <div className="text-error-message">{message}</div>;
};

export default ErrorMessage;
