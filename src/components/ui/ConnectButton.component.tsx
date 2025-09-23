import React from "react";
import Button from "./Button.component";

interface Props {
  label?: string;
  className?: string;
  onClick?: () => void;
}

const ConnectButton: React.FC<Props> = ({ label = "Connect Xero", className = "", onClick }) => {
  const handle = () => {
    if (onClick) return onClick();
    import("../../apis/xero.api")
      .then(({ getXeroAuthUrl, capturePostAuthRedirect }) => {
        try {
          capturePostAuthRedirect();
        } catch {}
        window.location.href = getXeroAuthUrl();
      })
      .catch(() => {
        // fallback
        window.location.href = "/auth";
      });
  };

  return (
    <Button onClick={handle} className={className}>
      {label}
    </Button>
  );
};

export default ConnectButton;
