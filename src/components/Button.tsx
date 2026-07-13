import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "glass" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  style,
  className = "",
  ...props
}) => {
  const getStyles = () => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      borderRadius: "10px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "var(--transition-smooth)",
      border: "1px solid transparent",
      outline: "none",
      fontFamily: "inherit"
    };

    const sizes = {
      sm: { padding: "8px 14px", fontSize: "0.85rem" },
      md: { padding: "10px 18px", fontSize: "0.95rem" },
      lg: { padding: "14px 24px", fontSize: "1.05rem" }
    };

    const variants = {
      primary: {
        background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
        color: "#ffffff",
        boxShadow: "0 4px 15px rgba(168, 85, 247, 0.3)"
      },
      secondary: {
        background: "rgba(168, 85, 247, 0.15)",
        color: "var(--color-primary)",
        border: "1px solid rgba(168, 85, 247, 0.25)"
      },
      glass: {
        background: "var(--glass-bg)",
        color: "var(--text-primary)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(4px)"
      },
      danger: {
        background: "var(--color-error-bg)",
        color: "var(--color-error)",
        border: "1px solid rgba(239, 68, 68, 0.3)"
      }
    };

    return {
      ...base,
      ...sizes[size],
      ...variants[variant]
    };
  };

  const hoverStyle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.disabled) return;
    if (variant === "primary") {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 6px 20px rgba(168, 85, 247, 0.45)";
    } else if (variant === "secondary") {
      e.currentTarget.style.background = "rgba(168, 85, 247, 0.25)";
    } else if (variant === "glass") {
      e.currentTarget.style.background = "var(--glass-hover-bg)";
      e.currentTarget.style.borderColor = "var(--glass-border)";
    } else if (variant === "danger") {
      e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
    }
  };

  const leaveStyle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const current = getStyles() as any;
    e.currentTarget.style.transform = "none";
    e.currentTarget.style.boxShadow = current.boxShadow || "none";
    e.currentTarget.style.background = current.background;
    e.currentTarget.style.borderColor = current.border.split(" ")[2] || "transparent";
  };

  return (
    <button
      style={{
        ...getStyles(),
        opacity: props.disabled ? 0.6 : 1,
        pointerEvents: props.disabled ? "none" : "auto",
        ...style
      }}
      onMouseEnter={hoverStyle}
      onMouseLeave={leaveStyle}
      className={`custom-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
