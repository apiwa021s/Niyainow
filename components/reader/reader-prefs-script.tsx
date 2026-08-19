import { FONT_SIZE_SCALE, LINE_HEIGHT_VALUES, READER_STORAGE_KEY, WIDTH_VALUES } from "@/lib/reader/prefs";

/**
 * Applies the stored reading preferences to <html> before the first paint.
 *
 * Without this the reader renders in the default theme for one frame and then
 * snaps to the reader's own — which, at night, is a white flash in the face.
 * It has to be a blocking inline script in <head>: any React-driven approach
 * necessarily runs after paint.
 *
 * Values are duplicated from the store into the serialised script rather than
 * imported at runtime, so the two can never disagree about the scale.
 */
export function ReaderPrefsScript() {
  const script = `(function(){try{
var K=${JSON.stringify(READER_STORAGE_KEY)};
var SIZES=${JSON.stringify(FONT_SIZE_SCALE)};
var LEAD=${JSON.stringify(LINE_HEIGHT_VALUES)};
var WIDTH=${JSON.stringify(WIDTH_VALUES)};
var THEMES={light:1,sepia:1,dark:1,amoled:1};
var FONTS={looped:1,loopless:1,serif:1};
var p={};
try{p=(JSON.parse(localStorage.getItem(K)||"{}").state||{}).prefs||{};}catch(e){}
var d=document.documentElement;
var t=p.theme==="mist"?"sepia":p.theme;
if(!THEMES[t]){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"sepia";}
d.setAttribute("data-read-theme",t);
var f=p.font==="anuphan"?"loopless":p.font;
d.setAttribute("data-read-font",FONTS[f]?f:"looped");
d.setAttribute("data-read-paragraph",p.paragraphStyle==="indent"?"indent":"gap");
var i=typeof p.fontSizeIndex==="number"?p.fontSizeIndex:-1;
if(i<0||i>=SIZES.length){i=-1;}
if(i>=0){d.style.setProperty("--read-size",SIZES[i]+"px");}
if(LEAD[p.lineHeight]){d.style.setProperty("--read-leading",String(LEAD[p.lineHeight]));}
if(WIDTH[p.width]){d.style.setProperty("--read-measure",WIDTH[p.width]);}
}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
