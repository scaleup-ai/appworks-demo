import React from "react";
import Button from "./Button.component";
import { getXeroAuthUrl, capturePostAuthRedirect } from "../../apis/xero.api";

interface Props {
  label?: string;
  className?: string;
  onClick?: () => void;
}

const ConnectButton: React.FC<Props> = ({ label = "Connect Xero", className = "", onClick }) => {
  const handle = () => {
    if (onClick) return onClick();
    try {
      capturePostAuthRedirect();
      window.location.href = getXeroAuthUrl();
    } catch {
      window.location.href = "/auth";
    }
  };

  return (
    <Button onClick={handle} className={className}>
      {label}
    </Button>
  );
};

export default ConnectButton;