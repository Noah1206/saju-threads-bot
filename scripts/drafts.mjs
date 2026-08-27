// drafts.json / posts.json 발췌 조회. 큰 JSON 을 통째로 컨텍스트에 올리지 않기 위한 도구.
//
//   node scripts/drafts.mjs                 요약 (건수 + 상태별)
//   node scripts/drafts.mjs list            id / status / 첫 줄 / 상품
//   node scripts/drafts.mjs pending         승인 대기만
//   node scripts/drafts.mjs show lr-032     한 건 전문 (모든 안)
//   node scripts/drafts.mjs grep 재회       본문에 그 말이 든 초안의 id + 첫 줄
//   node scripts/drafts.mjs posts           성과 요약 (sync 후) — tier 별 조회수
//   node scripts/drafts.mjs posts top 5     조회수 상위 5건 (id / 조회수 / 첫 줄)
//   node scripts/drafts.mjs replies         2/2 답글 도달 (본문 대비 %, 상품별, 반말 CTA 대조)
//   node scripts/drafts.mjs pairs           꺾쇠 재작성본 vs 원본 A/B (rewrite_of 쌍)
import { readFileSync, existsSync } from "node:fs";
const read = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : []);
const D = () => read("data/drafts.json");
const P = () => read("data/posts.json");
const head = (v) => (Array.isArray(v.pages) ? v.pages[0] : v.text).split("\n")[0].slice(0, 46);
const [cmd = "summary", a, b] = process.argv.slice(2);

if (cmd === "summary") {
  const d = D(), s = {};
  d.forEach((x) => (s[x.status] = (s[x.status] || 0) + 1));
  console.log(`drafts ${d.length}건 ${JSON.stringify(s)}  (마지막 ${d.at(-1)?.id})`);
  const p = P();
  console.log(`posts ${p.length}건` + (p.length ? ` | WIN ${p.filter((x) => x.tier === "WIN").length} MID ${p.filter((x) => x.tier === "MID").length} LOSS ${p.filter((x) => x.tier === "LOSS").length}` : " (npm run sync 아직 안 돌림)"));
} else if (cmd === "list" || cmd === "pending") {
  D().filter((x) => (cmd === "pending" ? x.status !== "published" : true))
    .forEach((x) => console.log(`${x.id}  ${x.status.padEnd(9)} ${x.product ?? "-"}  ${head(x.variants[x.published_variant ?? x.approved_variant ?? 0])}`));
} else if (cmd === "show") {
  const x = D().find((v) => v.id === a);
  if (!x) { console.error("없음:", a); process.exit(1); }
  console.log(`${x.id} | ${x.status} | 상품 ${x.product ?? "-"} | ${x.published_id ?? ""}`);
  x.variants.forEach((v, i) => {
    console.log(`\n--- ${i}안 [${v.hook_type}] ${v.chars}자 ${i === (x.approved_variant ?? -1) ? "(승인)" : ""} ---`);
    (Array.isArray(v.pages) ? v.pages : [v.text]).forEach((p, j) => console.log((j ? "\n[답글]\n" : "") + p));
  });
  if (x.erratum) console.log("\n[정정]", JSON.stringify(x.erratum));
} else if (cmd === "grep") {
  D().forEach((x) => x.variants.forEach((v) => {
    const t = (Array.isArray(v.pages) ? v.pages : [v.text]).join("\n");
    if (t.includes(a)) console.log(`${x.id}  ${head(v)}`);
  }));
} else if (cmd === "posts") {
  const p = P();
  if (!p.length) { console.log("posts.json 비어 있음. npm run sync 먼저."); process.exit(0); }
  if (a === "top") {
    [...p].sort((x, y) => y.views - x.views).slice(0, Number(b) || 5)
      .forEach((x) => console.log(`${x.views.toString().padStart(6)} views  ${x.tier ?? "-"}  ${x.text.split("\n")[0].slice(0, 40)}`));
  } else {
    for (const t of ["WIN", "MID", "LOSS"]) {
      const g = p.filter((x) => x.tier === t);
      if (!g.length) continue;
      const avg = (k) => Math.round(g.reduce((s, x) => s + x[k], 0) / g.length);
      console.log(`${t.padEnd(5)} ${g.length}건 | 평균 조회 ${avg("views")} 좋아요 ${avg("likes")} 댓글 ${avg("replies")}`);
    }
  }
} else if (cmd === "pairs") {
  // 꺾쇠 재작성본(rewrite_of)과 원본을 쌍으로 묶어 A/B 비교.
  // 같은 내용 · 같은 날 발행 · 첫 줄 형식만 다르므로 계정 안에서 제일 깨끗한 대조군이다.
  const p = P(), d = D();
  const byId = new Map(p.map((x) => [x.id, x]));
  const rows = [];
  for (const nw of d.filter((x) => x.rewrite_of)) {
    const old = d.find((x) => x.id === nw.rewrite_of);
    if (!old) continue;
    const A = byId.get(old.published_id), B = byId.get(nw.published_id);
    if (!A || !B) continue;
    const hrs = (t) => (Date.now() - new Date(t)) / 3600000;
    rows.push({
      old: old.id, nw: nw.id, a: A.views, b: B.views,
      ageA: hrs(A.timestamp), ageB: hrs(B.timestamp),
      title: head({ text: B.text }),
    });
  }
  if (!rows.length) {
    console.log("쌍 없음 — rewrite_of 초안이 아직 발행 전이거나 sync 미실행");
    process.exit(0);
  }
  // 나이 가드: 양쪽 경과시간이 크게 다르면 비교 자체가 성립하지 않는다.
  // 조회수는 발행 후 48~72h 까지 계속 붙으므로, 어린 쪽이 무조건 진다.
  const minAge = Math.min(...rows.map((r) => Math.min(r.ageA, r.ageB)));
  const gap = Math.max(...rows.map((r) => Math.abs(r.ageA - r.ageB)));
  if (minAge < 48 || gap > 12) {
    console.log("!! 비교 불가 — 아직 안 익었거나 양쪽 나이 차가 큼");
    console.log(`   제일 어린 글 ${minAge.toFixed(1)}h 경과 (72h 권장) / 쌍 내 최대 나이차 ${gap.toFixed(1)}h`);
    console.log("   아래 승패는 참고만 할 것. 72h 지난 뒤 sync 하고 다시 볼 것.\n");
  }
  const win = rows.filter((r) => r.b > r.a).length;
  const tie = rows.filter((r) => r.b === r.a).length;
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  console.log(`쌍 ${rows.length}건 — 꺾쇠 승 ${win} / 무 ${tie} / 패 ${rows.length - win - tie}`);
  console.log(`비꺾쇠 합 ${sum("a")} (평균 ${Math.round(sum("a") / rows.length)})`);
  console.log(`꺾쇠   합 ${sum("b")} (평균 ${Math.round(sum("b") / rows.length)})\n`);
  for (const r of [...rows].sort((x, y) => y.b - y.a - (x.b - x.a))) {
    const mark = r.b > r.a ? "꺾쇠" : r.b < r.a ? "문장" : "동률";
    console.log(`${mark}  ${String(r.a).padStart(5)}(${r.ageA.toFixed(0)}h) -> ${String(r.b).padStart(5)}(${r.ageB.toFixed(0)}h)  ${String(r.b - r.a).padStart(6)}  ${r.old}/${r.nw}  ${r.title}`);
  }
} else if (cmd === "replies") {
  const p = P();
  const rep = p.filter((x) => x.kind === "reply");
  const main = p.filter((x) => x.kind !== "reply" && x.views > 0);
  if (!rep.length) {
    console.log("답글 없음 — sync 를 다시 돌려라 (threads_read_replies 권한 필요)");
    process.exit(0);
  }
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : 0);
  const rv = rep.map((x) => x.views).sort((x, y) => x - y);
  const mainAvg = avg(main.map((x) => x.views));
  console.log(`답글 ${rep.length}건 | 평균 ${avg(rv)} 중앙 ${rv[Math.floor(rv.length / 2)]} 최고 ${rv.at(-1)}`);
  console.log(`본문 ${main.length}건 평균 ${mainAvg} -> 답글 도달률 ${((avg(rv) / Math.max(1, mainAvg)) * 100).toFixed(1)}%`);
  const link = rep.filter((x) => /loverebbit\.xyz/.test(x.text));
  console.log(`상품 링크 답글 ${link.length}건 평균 ${avg(link.map((x) => x.views))}`);
  const ban = link.filter((x) => /알려줄게/.test(x.text));
  const rest = link.filter((x) => !/알려줄게/.test(x.text));
  if (ban.length) {
    console.log(`  반말 CTA ${ban.length}건 평균 ${avg(ban.map((x) => x.views))} | 그 외 ${rest.length}건 평균 ${avg(rest.map((x) => x.views))}`);
  }
  const bySlug = {};
  for (const x of link) {
    const s = (x.text.match(/product\/(\w+)/) || [, "?"])[1];
    (bySlug[s] ??= []).push(x.views);
  }
  console.log("\n상품별 답글 도달");
  for (const [s, v] of Object.entries(bySlug).sort((x, y) => avg(y[1]) - avg(x[1]))) {
    console.log(`  ${s.padEnd(11)} ${String(v.length).padStart(2)}건  평균 ${avg(v)}`);
  }
} else console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 11).join("\n"));
