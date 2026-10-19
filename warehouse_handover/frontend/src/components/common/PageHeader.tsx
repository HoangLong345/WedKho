import React, { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  badge?: string;
  action?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  action,
}) => {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <div className="page-header-title-row">
          <h2 className="page-title">{title}</h2>
          {badge && <span className="page-badge">{badge}</span>}
        </div>
        <p className="page-desc">{description}</p>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
};
