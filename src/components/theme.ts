import { useEffect } from "react";

export const C = {
  ink: "#14181F",
  panel: "#1B212B",
  panelBorder: "#2A323E",
  paper: "#F1ECDF",
  paperEdge: "#E3DCC8",
  inkText: "#2A2620",
  muted: "#8B93A1",
  mutedDark: "#5B6472",
  verdigris: "#4FA898",
  verdigrisDeep: "#3A8577",
  amber: "#D89B3C",
  clay: "#B85C4A",
  clayDeep: "#95493A",
};

export function useFonts() {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(l);
    return () => {
      document.head.removeChild(l);
    };
  }, []);
}

export const displayFont = { fontFamily: "'Fraunces', serif" };
export const bodyFont = { fontFamily: "'IBM Plex Sans', sans-serif" };
export const monoFont = { fontFamily: "'IBM Plex Mono', monospace" };
