export async function onResolve(ctx) {
  const url = ctx.req.url;

  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return;

  const owner = match[1];
  const repo = match[2];

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  try {
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "Gopeed-APK-Auto-Downloader" }
    });

    if (!res.ok) return;

    const release = await res.json();
    if (!release.assets || release.assets.length === 0) return;

    // SOLO APK (sin x86)
    const apks = release.assets.filter(a =>
      a.name.toLowerCase().endsWith(".apk") &&
      !a.name.toLowerCase().match(/x86|x64|amd/)
    );

    if (apks.length === 0) return;

    const best = selectBestApk(apks);
    if (!best) return;

    ctx.res = {
      name: best.name,
      files: [
        {
          name: best.name,
          size: best.size,
          req: { url: best.browser_download_url }
        }
      ]
    };
  } catch (e) {
    console.error("APK Auto Downloader error:", e.message);
  }
}

function selectBestApk(apks) {
  let best = null;
  let bestScore = -1;

  for (const apk of apks) {
    const name = apk.name.toLowerCase();
    let score = 0;

    // ARM64 prioridad máxima
    if (name.match(/arm64|arm64-v8a|aarch64/)) score += 100;

    // Universal
    if (name.match(/universal|all|fat|noarch/)) score += 50;

    // ARMv7 último recurso
    if (name.match(/armeabi|armeabi-v7a|armv7|arm7|v7/)) score += 10;

    if (score > bestScore) {
      bestScore = score;
      best = apk;
    }
  }

  return best;
}
