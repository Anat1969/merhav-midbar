import React from "react";

const PrintHeader: React.FC = () => {
  return (
    <div className="print-header">
      <div style={{ fontWeight: 700, fontSize: 14 }}>דשבורד — אדריכלית העיר</div>
      <div style={{ color: "#888", fontSize: 12 }}>{new Date().toLocaleDateString("he-IL")}</div>
    </div>
  );
};

export default PrintHeader;
