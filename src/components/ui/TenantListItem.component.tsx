import React from "react";

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
}

const TenantListItem: React.FC<Props> = ({ title, subtitle, meta }) => {
  return (
    <li className="p-2 border rounded bg-gray-50">
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
      {meta && <div className="mt-1 text-xs text-gray-400">{meta}</div>}
    </li>
  );
};

export default TenantListItem;
