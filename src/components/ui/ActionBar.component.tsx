import React from "react";

interface Props {
  children?: React.ReactNode;
  className?: string;
}

const ActionBar: React.FC<Props> = ({ children, className = "" }) => {
  return <div className={`flex gap-2 ${className}`}>{children}</div>;
};

export default ActionBar;
