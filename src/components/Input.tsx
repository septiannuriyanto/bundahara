import React, { useState, useEffect } from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string | number;
  onChange: (value: number) => void;
  isCurrency?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  isCurrency = false,
  type = "text",
  style,
  className = "",
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState("");

  const formatNumber = (numStr: string) => {
    // Remove non-digit characters
    const cleanStr = numStr.replace(/\D/g, "");
    if (!cleanStr) return "";
    return parseInt(cleanStr, 10).toLocaleString("id-ID");
  };

  const parseNumber = (formattedStr: string): number => {
    const cleanStr = formattedStr.replace(/\D/g, "");
    return cleanStr ? parseInt(cleanStr, 10) : 0;
  };

  useEffect(() => {
    if (isCurrency) {
      const valStr = value !== undefined && value !== null ? value.toString() : "";
      setDisplayValue(formatNumber(valStr));
    } else {
      setDisplayValue(value !== undefined && value !== null ? value.toString() : "");
    }
  }, [value, isCurrency]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (isCurrency) {
      const formatted = formatNumber(rawVal);
      setDisplayValue(formatted);
      onChange(parseNumber(formatted));
    } else {
      setDisplayValue(rawVal);
      // Fallback for regular input types
      const parsedNum = parseFloat(rawVal);
      onChange(isNaN(parsedNum) ? 0 : parsedNum);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setDisplayValue(rawVal);
    // When not currency, we just pass the input value or parse it
    if (type === "number") {
      const parsed = parseFloat(rawVal);
      onChange(isNaN(parsed) ? 0 : parsed);
    } else {
      // Just pass as is (cast callback to string via any if needed, but since our onChange expects number, we only use this Input wrapper for numeric inputs or wrap it)
      const parsed = parseFloat(rawVal);
      onChange(isNaN(parsed) ? 0 : parsed);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "6px" }} className={className}>
      {label && <label>{label}</label>}
      <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
        {isCurrency && (
          <span
            style={{
              position: "absolute",
              left: "16px",
              fontWeight: "600",
              color: "var(--color-primary)",
              pointerEvents: "none",
              fontSize: "0.95rem"
            }}
          >
            Rp
          </span>
        )}
        <input
          type={isCurrency ? "text" : type}
          value={displayValue}
          onChange={isCurrency ? handleInputChange : handleTextChange}
          style={{
            paddingLeft: isCurrency ? "42px" : "16px",
            ...style
          }}
          {...props}
        />
      </div>
    </div>
  );
};

// Also define a helper for plain text input fields
interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  style,
  className = "",
  ...props
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "6px" }} className={className}>
      {label && <label>{label}</label>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          paddingLeft: "16px",
          ...style
        }}
        {...props}
      />
    </div>
  );
};
