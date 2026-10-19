import React from "react";
import { TabType } from "../../types";
import { TabNav } from "./TabNav";
import { Bell, User, Warehouse } from "lucide-react";

interface HeaderProps {
  activeLeasesCount: number;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeLeasesCount,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="saas-header-wrapper">
      {/* 1. TOP BRAND & SYSTEM STATUS BAR */}
      <div className="saas-topbar">
        <div className="saas-topbar-inner">
          {/* Bên trái: Logo + Tên hệ thống + Mô tả ngắn */}
          <div className="saas-brand">
            <div className="saas-logo-box" title="U-BWMS - U&I Bonded Warehouse Management System">
              <Warehouse className="saas-logo-icon" size={24} strokeWidth={2.2} />
            </div>
            <div className="saas-brand-text">
              <div className="saas-brand-title-row">
                <h1 className="saas-brand-title">U-BWMS</h1>
              </div>
              <p className="saas-brand-subtitle">
                U&I Bonded Warehouse Management System - Optimization Module
              </p>
            </div>
          </div>

          {/* Bên phải: Trạng thái PostgreSQL nhỏ gọn + Thông số nhanh + Thông báo + Tài khoản */}
          <div className="saas-topbar-right">

            {/* Thông số quy mô kho */}
            <div className="saas-scale-pill">
              <span className="saas-scale-text">24 Dãy · 1.697 Khoang</span>
            </div>

            {/* Đối tác đang thuê */}
            <div className="saas-tenants-pill">
              <span className="saas-tenants-label">Đối tác thuê:</span>
              <strong className="saas-tenants-val">{activeLeasesCount}</strong>
            </div>

            <div className="saas-divider-v" />

            {/* Nút thông báo */}
            <button
              type="button"
              className="saas-icon-btn"
              title="Thông báo hệ thống"
              aria-label="Thông báo"
            >
              <Bell size={18} strokeWidth={2} />
              <span className="saas-notif-dot" />
            </button>

            {/* Tài khoản người dùng */}
            <div className="saas-user-profile" title="Tài khoản Quản trị viên Kho">
              <div className="saas-user-avatar">
                <User size={16} strokeWidth={2.2} />
              </div>
              <div className="saas-user-info">
                <span className="saas-user-name">Quản trị viên</span>
                <span className="saas-user-role">Vận hành kho</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION BAR LIỀN MẠCH NGAY BÊN DƯỚI */}
      <div className="saas-navbar">
        <div className="saas-navbar-inner">
          <TabNav activeTab={activeTab} onSelectTab={onSelectTab} />
        </div>
      </div>
    </header>
  );
};
