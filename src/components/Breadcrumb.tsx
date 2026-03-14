// [UPGRADE: Section 4] Breadcrumb navigation component
import React from "react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ items }) => (
  <nav
    className="flex items-center gap-1.5 px-4 py-2 text-sm border-b border-[#1E3A6E] bg-[#0F2044]"
    dir="rtl"
    aria-label="breadcrumb"
  >
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="text-[#4A5568] select-none">›</span>}
        {item.href && i < items.length - 1 ? (
          <Link
            to={item.href}
            className="text-[#B8C5D6] hover:text-[#C9A84C] transition-colors text-base"
          >
            {item.label}
          </Link>
        ) : (
          <span className="text-[#C9A84C] font-bold text-base">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);
