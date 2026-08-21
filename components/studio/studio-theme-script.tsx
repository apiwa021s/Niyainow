/**
 * Applies the stored Studio Light/Dark choice to <html> before the first
 * paint of any /studio route — same technique as
 * components/reader/reader-prefs-script.tsx, and for the same reason: a
 * React-driven `data-studio-theme` prop necessarily runs after paint, which
 * is exactly what showed up as a stuck-dark editor on a fresh navigation
 * (React's hydration-mismatch recovery for this attribute wasn't reliably
 * repainting it). A blocking inline script has nothing to hydrate against,
 * so there is no mismatch to recover from in the first place.
 *
 * Deliberately not in the root <head> (components/reader/reader-prefs-script.tsx
 * lives there): this only matters under /studio, so it's rendered from
 * app/studio/layout.tsx instead of running on every page on the site.
 */
export function StudioThemeScript() {
  const script = `(function(){try{
var m=localStorage.getItem("novelnow-studio-theme");
document.documentElement.setAttribute("data-studio-theme",m==="light"?"light":"dark");
}catch(e){document.documentElement.setAttribute("data-studio-theme","dark");}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
