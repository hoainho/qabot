import { VERSION } from "../core/constants.js";

export class HtmlBuilder {
  render(results, meta) {
    const summary = results.summary || {};
    const allTests = (results.results || []).flatMap((r) => r.tests || []);
    const failedTests = allTests.filter((t) => t.status === "failed");
    const passedTests = allTests.filter((t) => t.status === "passed");
    const skippedTests = allTests.filter((t) => t.status === "skipped");
    const screenshots = allTests.flatMap((t) =>
      (t.screenshots || []).map((s) => ({ test: t.name, path: s })),
    );
    const maxDuration = Math.max(...allTests.map((t) => t.duration || 0), 1);

    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QABot Report \u2014 ${esc(meta.feature || "all")} | ${esc(meta.projectName || "")}</title>
<style>
:root{--bg:#0C0A1A;--bg2:#13102A;--card:#1A1635;--card2:#221E3D;--border:#2D2852;--text:#E8E4F0;--dim:#8B85A0;--v:#A78BFA;--v2:#7C3AED;--v3:#C4B5FD;--g:#34D399;--r:#F87171;--y:#FBBF24;--cyan:#22D3EE;--font:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;--mono:'SF Mono',SFMono-Regular,'JetBrains Mono',Menlo,monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:var(--font);line-height:1.6}
.wrap{max-width:1200px;margin:0 auto;padding:2.5rem 2rem}
a{color:var(--v);text-decoration:none}
a:hover{text-decoration:underline}

.hero{text-align:center;padding:3rem 0 2rem;border-bottom:1px solid var(--border)}
.hero h1{font-size:1.5rem;font-weight:600;color:var(--v3);letter-spacing:.02em}
.hero .meta{color:var(--dim);font-size:.85rem;margin-top:.5rem}
.hero .meta span{margin:0 .5rem}
.rate-ring{width:120px;height:120px;margin:1.5rem auto;position:relative}
.rate-ring svg{transform:rotate(-90deg)}
.rate-ring .rate-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.75rem;margin:2rem 0}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem;text-align:center;transition:border-color .2s}
.card:hover{border-color:var(--v)}
.card .val{font-size:1.75rem;font-weight:700;margin:.25rem 0}
.card .lbl{font-size:.75rem;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.card.pass .val{color:var(--g)}.card.fail .val{color:var(--r)}.card.skip .val{color:var(--y)}.card.dur .val{color:var(--cyan)}

h2{font-size:1.1rem;font-weight:600;color:var(--v3);margin:2.5rem 0 1rem;display:flex;align-items:center;gap:.5rem}
h2::before{content:'';width:3px;height:1.1rem;background:var(--v2);border-radius:2px}

.filters{display:flex;gap:.5rem;margin:1rem 0;flex-wrap:wrap}
.fbtn{background:var(--card);border:1px solid var(--border);color:var(--dim);padding:.35rem .85rem;border-radius:20px;cursor:pointer;font-size:.8rem;transition:all .2s}
.fbtn:hover,.fbtn.on{background:var(--v2);border-color:var(--v2);color:#fff}
.fbtn .count{background:var(--bg);padding:1px 6px;border-radius:10px;font-size:.7rem;margin-left:.3rem}
.fbtn.on .count{background:rgba(255,255,255,.15)}

.tbl{width:100%;border-collapse:separate;border-spacing:0;margin:1rem 0}
.tbl th{text-align:left;padding:.6rem 1rem;color:var(--dim);font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg)}
.tbl td{padding:.6rem 1rem;border-bottom:1px solid var(--border);vertical-align:top}
.tbl tr:hover td{background:var(--card)}
.tbl .idx{color:var(--dim);font-size:.8rem;width:3rem}
.badge{display:inline-flex;align-items:center;gap:.3rem;padding:2px 10px;border-radius:20px;font-size:.72rem;font-weight:600}
.badge-passed{background:#34D39918;color:var(--g)}.badge-failed{background:#F8717118;color:var(--r)}.badge-skipped{background:#FBBF2418;color:var(--y)}
.badge::before{content:'';width:6px;height:6px;border-radius:50%}
.badge-passed::before{background:var(--g)}.badge-failed::before{background:var(--r)}.badge-skipped::before{background:var(--y)}

.dur-bar{display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:var(--dim)}
.dur-fill{height:4px;border-radius:2px;background:var(--v);min-width:2px;transition:width .3s}
.test-name{font-weight:500;font-size:.9rem}
.test-suite{font-size:.8rem;color:var(--dim);margin-top:2px}
.test-file{font-family:var(--mono);font-size:.75rem;color:var(--dim);margin-top:2px}

.detail{background:var(--card);border:1px solid var(--border);border-radius:10px;margin:.75rem 0;overflow:hidden}
.detail-head{padding:.75rem 1rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none}
.detail-head:hover{background:var(--card2)}
.detail-head .arrow{color:var(--dim);font-size:.7rem;transition:transform .2s}
.detail-head.open .arrow{transform:rotate(180deg)}
.detail-body{display:none;padding:1rem;border-top:1px solid var(--border)}
.detail-body.show{display:block}

.err-box{background:#1A0A0A;border:1px solid #F8717130;border-radius:8px;padding:1rem;font-family:var(--mono);font-size:.78rem;color:#FCA5A5;white-space:pre-wrap;overflow-x:auto;max-height:250px;overflow-y:auto;line-height:1.5}
.skip-reason{background:#1A170A;border:1px solid #FBBF2430;border-radius:8px;padding:.75rem 1rem;font-size:.85rem;color:var(--y)}
.io-section{margin-top:.75rem}
.io-label{font-size:.75rem;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem}
.io-box{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:.75rem;font-family:var(--mono);font-size:.78rem;max-height:150px;overflow-y:auto;white-space:pre-wrap}

.ss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin:1rem 0}
.ss-card{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;transition:border-color .2s}
.ss-card:hover{border-color:var(--v)}
.ss-card img{width:100%;display:block;cursor:pointer}
.ss-card .ss-info{padding:.6rem .8rem;font-size:.8rem;color:var(--dim)}

.timeline{margin:1.5rem 0}
.tl-item{display:flex;align-items:center;gap:.5rem;padding:.4rem 0}
.tl-bar{flex:1;height:20px;background:var(--bg);border-radius:4px;overflow:hidden;position:relative}
.tl-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 .5rem;font-size:.7rem;color:#fff;font-weight:500;min-width:fit-content}
.tl-fill.pass{background:var(--g)}.tl-fill.fail{background:var(--r)}.tl-fill.skip{background:var(--y)}
.tl-name{width:200px;font-size:.8rem;text-align:right;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tl-dur{width:60px;font-size:.75rem;color:var(--dim);text-align:right}

.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999;align-items:center;justify-content:center}
.modal.show{display:flex}
.modal img{max-width:95vw;max-height:95vh;border-radius:8px}
.modal-close{position:fixed;top:1rem;right:1.5rem;color:#fff;font-size:2rem;cursor:pointer;z-index:1000}

footer{text-align:center;padding:2rem 0 1rem;color:var(--dim);font-size:.8rem;border-top:1px solid var(--border);margin-top:3rem}
</style></head>
<body>
<div class="wrap">

<div class="hero">
  <h1>QABot Test Report</h1>
  <div class="meta">
    <span>${esc(meta.projectName || "")}</span> &middot;
    <span>Feature: <strong>${esc(meta.feature || "all")}</strong></span> &middot;
    <span>Env: ${esc(meta.environment || "local")}</span> &middot;
    <span>${esc(meta.timestamp?.slice(0, 16).replace("T", " ") || "")}</span>
  </div>
  <div class="rate-ring">
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="8"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="${(summary.overallPassRate || 0) >= 80 ? "var(--g)" : (summary.overallPassRate || 0) >= 50 ? "var(--y)" : "var(--r)"}" stroke-width="8" stroke-dasharray="${Math.round((summary.overallPassRate || 0) * 3.267)} 327" stroke-linecap="round"/>
    </svg>
    <div class="rate-text" style="color:${(summary.overallPassRate || 0) >= 80 ? "var(--g)" : (summary.overallPassRate || 0) >= 50 ? "var(--y)" : "var(--r)"}">${summary.overallPassRate || 0}%</div>
  </div>
</div>

<div class="cards">
  <div class="card"><div class="lbl">Total</div><div class="val">${summary.totalTests || 0}</div></div>
  <div class="card pass"><div class="lbl">Passed</div><div class="val">${summary.totalPassed || 0}</div></div>
  <div class="card fail"><div class="lbl">Failed</div><div class="val">${summary.totalFailed || 0}</div></div>
  <div class="card skip"><div class="lbl">Skipped</div><div class="val">${summary.totalSkipped || 0}</div></div>
  <div class="card dur"><div class="lbl">Duration</div><div class="val">${fmtMs(meta.duration || summary.totalDuration || 0)}</div></div>
</div>

<h2>Duration Waterfall</h2>
<div class="timeline">
${allTests
  .map((t) => {
    const pct =
      maxDuration > 0
        ? Math.max(2, Math.round(((t.duration || 0) / maxDuration) * 100))
        : 2;
    return `<div class="tl-item">
  <div class="tl-name">${esc(t.name)}</div>
  <div class="tl-bar"><div class="tl-fill ${t.status}" style="width:${pct}%">${fmtMs(t.duration || 0)}</div></div>
  <div class="tl-dur">${fmtMs(t.duration || 0)}</div>
</div>`;
  })
  .join("\n")}
</div>

<h2>Test Results</h2>
<div class="filters">
  <button class="fbtn on" onclick="filt('all',this)">All <span class="count">${allTests.length}</span></button>
  <button class="fbtn" onclick="filt('passed',this)">Passed <span class="count">${passedTests.length}</span></button>
  <button class="fbtn" onclick="filt('failed',this)">Failed <span class="count">${failedTests.length}</span></button>
  <button class="fbtn" onclick="filt('skipped',this)">Skipped <span class="count">${skippedTests.length}</span></button>
</div>

<table class="tbl">
<thead><tr><th class="idx">#</th><th>Status</th><th>Test</th><th>Duration</th><th>Details</th></tr></thead>
<tbody>
${allTests
  .map(
    (t, i) => `<tr class="trow" data-s="${t.status}">
  <td class="idx">${i + 1}</td>
  <td><span class="badge badge-${t.status}">${t.status}</span></td>
  <td>
    <div class="test-name">${esc(t.name)}</div>
    ${t.suite ? `<div class="test-suite">${esc(t.suite)}</div>` : ""}
    ${t.file ? `<div class="test-file">${esc(t.file)}</div>` : ""}
  </td>
  <td>
    <div class="dur-bar">
      <div class="dur-fill" style="width:${maxDuration > 0 ? Math.max(2, Math.round(((t.duration || 0) / maxDuration) * 100)) : 2}%"></div>
      ${fmtMs(t.duration || 0)}
    </div>
  </td>
  <td>${t.error || t.skipReason || (t.screenshots || []).length > 0 ? `<button class="fbtn" onclick="toggle(this)" style="font-size:.75rem">View</button>` : "&mdash;"}</td>
</tr>
${
  t.error || t.skipReason || (t.screenshots || []).length > 0
    ? `<tr class="trow-detail" data-s="${t.status}" style="display:none">
  <td colspan="5" style="padding:0 1rem 1rem">
    ${t.status === "skipped" ? `<div class="skip-reason">\u25B2 Skip Reason: ${esc(t.skipReason || t.error?.message || "No reason provided \u2014 test was marked skip or conditional skip")}</div>` : ""}
    ${t.error ? `<div class="io-section"><div class="io-label">Error Message</div><div class="err-box">${esc(t.error.message || "")}</div></div>` : ""}
    ${t.error?.stack ? `<div class="io-section"><div class="io-label">Stack Trace</div><div class="io-box">${esc(t.error.stack)}</div></div>` : ""}
    ${t.error?.expected ? `<div class="io-section"><div class="io-label">Expected</div><div class="io-box">${esc(String(t.error.expected))}</div></div>` : ""}
    ${t.error?.actual ? `<div class="io-section"><div class="io-label">Actual</div><div class="io-box">${esc(String(t.error.actual))}</div></div>` : ""}
    ${(t.screenshots || []).length > 0 ? `<div class="io-section"><div class="io-label">Screenshots</div><div class="ss-grid">${t.screenshots.map((s) => `<div class="ss-card"><img src="${esc(s)}" onclick="openImg(this.src)" loading="lazy"/><div class="ss-info">${esc(s.split("/").pop())}</div></div>`).join("")}</div></div>` : ""}
  </td>
</tr>`
    : ""
}`,
  )
  .join("\n")}
</tbody>
</table>

${
  failedTests.length > 0
    ? `
<h2>Failed Tests \u2014 Detail</h2>
${failedTests
  .map(
    (t, i) => `
<div class="detail">
  <div class="detail-head" onclick="toggleDetail(this)">
    <div><span class="badge badge-failed">FAILED</span> <strong style="margin-left:.5rem">${esc(t.name)}</strong> <span style="color:var(--dim);font-size:.85rem;margin-left:.5rem">${fmtMs(t.duration || 0)}</span></div>
    <span class="arrow">\u25BC</span>
  </div>
  <div class="detail-body">
    ${t.file ? `<div class="test-file" style="margin-bottom:.75rem">${esc(t.file)} &bull; ${esc(t.suite || "")}</div>` : ""}
    ${t.error ? `<div class="io-section"><div class="io-label">Error</div><div class="err-box">${esc(t.error.message || "")}</div></div>` : ""}
    ${t.error?.stack ? `<div class="io-section"><div class="io-label">Stack Trace</div><div class="io-box">${esc(t.error.stack)}</div></div>` : ""}
    ${
      t.error?.expected !== undefined
        ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:.75rem">
      <div><div class="io-label">Expected</div><div class="io-box" style="border-color:var(--g)">${esc(String(t.error.expected))}</div></div>
      <div><div class="io-label">Actual</div><div class="io-box" style="border-color:var(--r)">${esc(String(t.error.actual))}</div></div>
    </div>`
        : ""
    }
    ${(t.screenshots || []).length > 0 ? `<div class="io-section"><div class="io-label">Screenshots</div><div class="ss-grid">${t.screenshots.map((s) => `<div class="ss-card"><img src="${esc(s)}" onclick="openImg(this.src)" loading="lazy"/></div>`).join("")}</div></div>` : ""}
  </div>
</div>`,
  )
  .join("")}
`
    : ""
}

${
  skippedTests.length > 0
    ? `
<h2>Skipped Tests \u2014 Reasons</h2>
<table class="tbl"><thead><tr><th>#</th><th>Test</th><th>Reason</th></tr></thead><tbody>
${skippedTests
  .map(
    (t, i) => `<tr>
  <td class="idx">${i + 1}</td>
  <td><div class="test-name">${esc(t.name)}</div></td>
  <td><div class="skip-reason" style="display:inline-block">${esc(t.skipReason || t.error?.message || "Marked as skip / conditional skip / prerequisite failed")}</div></td>
</tr>`,
  )
  .join("\n")}
</tbody></table>
`
    : ""
}

${
  screenshots.length > 0
    ? `
<h2>Screenshots Gallery</h2>
<div class="ss-grid">
${screenshots.map((s) => `<div class="ss-card"><img src="${esc(s.path)}" onclick="openImg(this.src)" loading="lazy"/><div class="ss-info">${esc(s.test)}</div></div>`).join("")}
</div>
`
    : ""
}

<footer>Generated by QABot v${VERSION} &middot; ${new Date().toISOString().slice(0, 19).replace("T", " ")}</footer>
</div>

<div class="modal" id="modal" onclick="this.classList.remove('show')">
  <span class="modal-close" onclick="document.getElementById('modal').classList.remove('show')">&times;</span>
  <img id="modal-img" src="" />
</div>

<script>
function filt(s,btn){
  document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.trow,.trow-detail').forEach(r=>{
    r.style.display=s==='all'||r.dataset.s===s?'':'none';
  });
}
function toggle(btn){
  const tr=btn.closest('tr');
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('trow-detail')){
    next.style.display=next.style.display==='none'?'':'none';
    btn.textContent=next.style.display==='none'?'View':'Hide';
  }
}
function toggleDetail(el){
  el.classList.toggle('open');
  const body=el.nextElementSibling;
  body.classList.toggle('show');
}
function openImg(src){
  document.getElementById('modal-img').src=src;
  document.getElementById('modal').classList.add('show');
}
</script>
</body></html>`;
  }
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
