import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`saas-empty-state ${className}`}>
      {icon && <div className="saas-empty-icon">{icon}</div>}
      <h3 className="saas-empty-title">{title}</h3>
      {description && <p className="saas-empty-desc">{description}</p>}
      {action && <div className="saas-empty-action">{action}</div>}
    </div>
  );
};
