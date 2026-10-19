import React from "react";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  highlight = false,
  className = "",
}) => {
  return (
    <div className={`saas-stat-card ${highlight ? "highlight" : ""} ${className}`}>
      <div className="saas-stat-header">
        <span className="saas-stat-title">{title}</span>
        {icon && <span className="saas-stat-icon">{icon}</span>}
      </div>
      <div className="saas-stat-value">{value}</div>
      {subtitle && <div className="saas-stat-subtitle">{subtitle}</div>}
    </div>
  );
};
