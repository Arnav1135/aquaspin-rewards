
import fs from "fs";

let panel = fs.readFileSync("src/components/AIGameEnginePanel.tsx", "utf-8");

const exitButton = `
      {/* 
        CRITICAL AAA FIX: Permanent EXIT AGE control.
        Always fixed, highest Z-index, visible across all devices.
      */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          bottom: "env(safe-area-inset-bottom, 2rem)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999999,
          padding: "1rem 2rem",
          backgroundColor: "#dc2626",
          color: "white",
          border: "2px solid #ef4444",
          borderRadius: "9999px",
          fontWeight: "900",
          fontSize: "1.25rem",
          letterSpacing: "0.1em",
          boxShadow: "0 0 30px rgba(220, 38, 38, 0.8)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}
      >
        <X size={24} /> EXIT AGE
      </button>
`;

if (!panel.includes("EXIT AGE")) {
  panel = panel.replace(
    "<div className=\"w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full overflow-y-auto\">",
    exitButton + "\n      <div className=\"w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full overflow-y-auto\">"
  );
  fs.writeFileSync("src/components/AIGameEnginePanel.tsx", panel);
  console.log("AGE Panel upgraded with EXIT AGE.");
}

