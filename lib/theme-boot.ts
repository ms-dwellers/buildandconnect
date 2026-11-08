/** localStorage key shared by session resume and the pre-paint theme script. */
export const SESSION_MEMORY_KEY = "bandc.session";

/**
 * Runs in `<head>` before first paint. Reads the remembered account role so a
 * developer session does not flash the Community (default) palette.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(SESSION_MEMORY_KEY)});if(!raw)return;var parsed=JSON.parse(raw);if(parsed&&parsed.role==="developer")document.documentElement.setAttribute("data-theme","developer");}catch(e){}})();`;
