import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";

interface ThemeSwitcherProps {
  theme: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, onThemeChange }) => {
  const modes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];

  const getIcon = (mode: "light" | "dark" | "system") => {
    switch (mode) {
      case "light": return <Sun size={14} />;
      case "dark": return <Moon size={14} />;
      case "system": return <Monitor size={14} />;
    }
  };

  const getLabel = (mode: "light" | "dark" | "system") => {
    switch (mode) {
      case "light": return "Terang";
      case "dark": return "Gelap";
      case "system": return "Sistem";
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        background: "rgba(255, 255, 255, 0.05)",
        padding: "3px",
        borderRadius: "8px",
        border: "1px solid var(--panel-border)",
        alignItems: "center",
        gap: "2px"
      }}
    >
      {modes.map((mode) => {
        const isActive = theme === mode;
        return (
          <button
            key={mode}
            onClick={() => onThemeChange(mode)}
            title={`Mode ${getLabel(mode)}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              background: isActive ? "var(--color-primary)" : "transparent",
              color: isActive ? "#ffffff" : "var(--text-secondary)",
              transition: "var(--transition-smooth)"
            }}
          >
            {getIcon(mode)}
          </button>
        );
      })}
    </div>
  );
};
