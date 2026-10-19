import React from "react";

export type BadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  icon,
  className = "",
  size = "md",
}) => {
  return (
    <span className={`saas-badge saas-badge-${variant} saas-badge-${size} ${className}`}>
      {icon && <span className="saas-badge-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
