// Department colour chips (shared by server and client components)
const DEPT_HUES = ["text-lnh-sky border-lnh-sky/40 bg-lnh-sky/10", "text-lnh-rose border-lnh-red/40 bg-lnh-red/10", "text-lnh-gold border-lnh-gold/40 bg-lnh-gold/10", "text-violet-300 border-violet-400/40 bg-violet-400/10", "text-emerald-300 border-emerald-400/40 bg-emerald-400/10"];
export const deptHue = (d?: string | null) => DEPT_HUES[[...(d || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % DEPT_HUES.length];
