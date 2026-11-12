import React from "react";

interface FormAlertProps {
  message: string | null;
}

const FormAlert: React.FC<FormAlertProps> = ({ message }) => {
  if (!message) return null;
  return <div className="alert alert-danger">{message}</div>;
};

export default FormAlert;
