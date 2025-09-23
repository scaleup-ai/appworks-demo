import React from "react";
import Button from "./Button.component";
import Card from "./Card.component";

interface Props {
  title?: string;
  message?: string;
  value?: string;
  placeholder?: string;
  showInput?: boolean;
  onChange?: (v: string) => void;
  onConfirm: (v: string | null) => void;
  ctaText?: string;
}

const TenantPrompt: React.FC<Props> = ({
  title = "Select Tenant",
  message,
  value = "",
  placeholder = "Tenant ID",
  showInput = true,
  onChange,
  onConfirm,
  ctaText = "Confirm",
}) => {
  return (
    <Card>
      <div className="p-6 text-center">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{title}</h2>
        {message && <p className="mb-6 text-gray-700">{message}</p>}
        {showInput && (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => {
              onConfirm(showInput ? value || null : null);
            }}
          >
            {ctaText}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TenantPrompt;
