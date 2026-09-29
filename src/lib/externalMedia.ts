// 2026-09-27 02:40, resolve admin-supplied external media links into URLs a browser can
// stream directly. Box shared-file download links
// (app.box.com/index.php?rm=box_download_shared_file&shared_name=…&file_id=f_…) 302 to a
// short-lived signed public.boxcloud.com URL that serves the real file with CORS for our
// origin; the app.box.com hop itself has no CORS headers, so the player must get the final
// URL. Other links pass through unchanged.
import "server-only";

const CACHE_MS = 10 * 60 * 1000; // Box signed URLs last ~15 min
const cache = new Map<string, { url: string; at: number }>();

export function isBoxSharedFileLink(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      /(^|\.)box\.com$/i.test(u.hostname) &&
      u.searchParams.get("rm") === "box_download_shared_file" &&
      Boolean(u.searchParams.get("shared_name")) &&
      Boolean(u.searchParams.get("file_id"))
    );
  } catch {
    return false;
  }
}

/** Return a directly streamable URL for `url` (fresh Box signed URL, or `url` itself). */
export async function resolvePlayableUrl(url: string): Promise<string> {
  if (!isBoxSharedFileLink(url)) return url;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.url;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual", cache: "no-store" });
    const location = res.headers.get("location");
    if (location && /^https:\/\/[^/]*boxcloud\.com\//i.test(location)) {
      cache.set(url, { url: location, at: Date.now() });
      return location;
    }
  } catch {
    // fall through — the original link still works as a plain download/open link
  }
  return url;
}
