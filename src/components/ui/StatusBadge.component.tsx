import React from "react";

type Variant = "green" | "yellow" | "red" | "gray" | "blue" | "purple" | "orange";

const VARIANT_CLASS_MAP: Record<Variant, string> = {
  green: "text-green-600 bg-green-100",
  yellow: "text-yellow-600 bg-yellow-100",
  red: "text-red-600 bg-red-100",
  gray: "text-gray-600 bg-gray-100",
  blue: "text-blue-600 bg-blue-100",
  purple: "text-purple-600 bg-purple-100",
  orange: "text-orange-600 bg-orange-100",
};

interface Props {
  label?: React.ReactNode;
  variant?: Variant;
  className?: string;
  children?: React.ReactNode;
}

const StatusBadge: React.FC<Props> = ({ label, variant = "gray", className = "", children }) => {
  const classes =
    `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${VARIANT_CLASS_MAP[variant]} ${className}`.trim();
  return <span className={classes}>{label ?? children}</span>;
};

export default StatusBadge;
