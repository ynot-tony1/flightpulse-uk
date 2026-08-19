/**
 * Sets data-theme on <html> before first paint to avoid a flash of the
 * wrong theme. Runs as an inline script (not a React effect) specifically
 * because it must execute before hydration.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("flightpulse-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
