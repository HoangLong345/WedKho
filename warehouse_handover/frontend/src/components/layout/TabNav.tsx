import React from "react";
import { TabType } from "../../types";
import { Building2, Boxes, LayoutGrid, ClipboardList, Truck } from "lucide-react";

interface TabNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface TabItem {
  id: TabType;
  label: string;
  number: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  {
    id: "LEASING",
    number: "1",
    label: "Đăng ký & Cho thuê kho",
    icon: <Building2 className="nav-tab-icon" size={18} strokeWidth={2} />,
  },
  {
    id: "INBOUND",
    number: "2",
    label: "Nhập hàng & Xếp Pallet",
    icon: <Boxes className="nav-tab-icon" size={18} strokeWidth={2} />,
  },
  {
    id: "MAP",
    number: "3",
    label: "Sơ đồ Mặt bằng Kệ",
    icon: <LayoutGrid className="nav-tab-icon" size={18} strokeWidth={2} />,
  },
  {
    id: "AUDIT",
    number: "4",
    label: "Nhật ký Vận hành",
    icon: <ClipboardList className="nav-tab-icon" size={18} strokeWidth={2} />,
  },
  {
    id: "OUTBOUND",
    number: "5",
    label: "Xuất kho",
    icon: <Truck className="nav-tab-icon" size={18} strokeWidth={2} />,
  },
];

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav className="saas-nav-tabs" aria-label="Điều hướng phân hệ kho">
      <div className="saas-nav-tabs-track">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`saas-nav-tab ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(tab.id)}
              type="button"
              role="tab"
              aria-selected={isActive}
            >
              <span className="saas-nav-tab-inner">
                {tab.icon}
                <span className="saas-nav-tab-text">
                  <span className="saas-nav-tab-num">{tab.number}.</span> {tab.label}
                </span>
              </span>
              <span className="saas-nav-tab-indicator" />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
