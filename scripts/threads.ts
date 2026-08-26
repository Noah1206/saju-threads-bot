#!/usr/bin/env node
/**
 * Threads API CLI — 의존성 없음 (node 20+ / 내장 fetch)
 *
 *   npm run sync                        내 글 + 인사이트 수집 → data/posts.json
 *   npm run publish -- <draft-id> [<draft-id> ...] [--variant N] [--dry]   여러 개면 병렬(기본 3)
 *   npm run publish -- --all [--dry]                              approved 전부, approved_variant 사용
 *   npm run token:refresh               long-lived 토큰 갱신 (60일)
 *   npm run limit                       남은 발행 쿼터
 */

import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const API = "https://graph.threads.net/v1.0";
const TOKEN = process.env.THREADS_ACCESS_TOKEN;
const DATA = fileURLToPath(new URL("../" + (process.env.DATA_DIR ?? "data/"), import.meta.url));

if (!TOKEN) {
  console.error("THREADS_ACCESS_TOKEN 없음. .env 확인.");
  process.exit(1);
}

type Post = {
  id: string;
  text: string;
  permalink: string;
  timestamp: string;
  media_type: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  tier?: "WIN" | "MID" | "LOSS";
};

async function api(path: string, init?: RequestInit) {
  const url = `${API}${path}${path.includes("?") ? "&" : "?"}access_token=${TOKEN}`;
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${path.split("?")[0]} :: ${JSON.stringify(body?.error ?? body)}`);
  }
  return body;
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const p = DATA + name;
  if (!existsSync(p)) return fallback;
  return JSON.parse(await readFile(p, "utf8"));
}

const writeJson = (name: string, v: unknown) =>
  writeFile(DATA + name, JSON.stringify(v, null, 2) + "\n");

/* ---------------------------------------------------------------- sync */

async function sync() {
  const fields = "id,media_type,text,permalink,timestamp";
  let url = `/me/threads?fields=${fields}&limit=100`;
  const raw: any[] = [];

  // 커서 페이지네이션
  while (url) {
    const page = await api(url);
    raw.push(...(page.data ?? []));
    const next: string | undefined = page.paging?.cursors?.after;
    url = next ? `/me/threads?fields=${fields}&limit=100&after=${next}` : "";
    if (raw.length > 2000) break; // 안전장치
  }

  console.log(`글 ${raw.length}개 수집. 인사이트 붙이는 중...`);

  const posts: Post[] = [];
  for (const p of raw) {
    let m: Record<string, number> = {};
    try {
      const ins = await api(
        `/${p.id}/insights?metric=views,likes,replies,reposts,quotes`
      );
      m = Object.fromEntries(
        (ins.data ?? []).map((d: any) => [d.name, d.values?.[0]?.value ?? 0])
      );
    } catch {
      // 오래된 글은 인사이트가 없을 수 있음. 0으로 두고 tier 계산에서 빠짐.
    }
    posts.push({
      id: p.id,
      text: p.text ?? "",
      permalink: p.permalink,
      timestamp: p.timestamp,
      media_type: p.media_type,
      views: m.views ?? 0,
      likes: m.likes ?? 0,
      replies: m.replies ?? 0,
      reposts: m.reposts ?? 0,
      quotes: m.quotes ?? 0,
    });
    await new Promise((r) => setTimeout(r, 120)); // 레이트리밋 여유
  }

  tier(posts);
  await writeJson("posts.json", posts);

  const n = (t: string) => posts.filter((p) => p.tier === t).length;
  console.log(`저장 완료 — WIN ${n("WIN")} / MID ${n("MID")} / LOSS ${n("LOSS")}`);
  if (n("WIN") < 8) console.log("경고: WIN 표본 8개 미만. few-shots 품질 안 나온다.");
}

/** 조회수 기준 상하위 20% 라벨. 인사이트 없는 글(views=0)은 제외. */
function tier(posts: Post[]) {
  const scored = posts.filter((p) => p.views > 0).sort((a, b) => b.views - a.views);
  const cut = Math.max(1, Math.floor(scored.length * 0.2));
  scored.forEach((p, i) => {
    p.tier = i < cut ? "WIN" : i >= scored.length - cut ? "LOSS" : "MID";
  });
}

/* ------------------------------------------------------------- publish */

type PubResult = { id: string; ids: string[]; variantIdx: number };

/** 한 초안 발행 (drafts.json 은 건드리지 않음 — 호출자가 모아서 씀) */
async function publishOne(d: any, variantIdx: number, dry: boolean): Promise<PubResult | null> {
  if (d.status !== "approved") throw new Error(`${d.id}: status가 approved 아님: ${d.status}`);
  const v = d.variants[variantIdx];
  if (!v) throw new Error(`${d.id}: variant ${variantIdx} 없음`);
  // pages 가 있으면 1장 = 본문, 2장~ = 답글 스레드
  const link = process.env.LOVEREBBIT_LINK ?? "";
  const raw: string[] = Array.isArray(v.pages) ? v.pages : [v.text];
  if (raw.some((p) => p.includes("{{LINK}}")) && !link) {
    throw new Error(`${d.id}: 본문에 {{LINK}} 가 있는데 LOVEREBBIT_LINK 가 비어 있음. .env.loverebbit 확인.`);
  }
  const pages: string[] = raw.map((p) => p.replaceAll("{{LINK}}", link));
  if (!pages.length || !pages[0]) throw new Error(`${d.id}: variant ${variantIdx} 본문 없음`);
  pages.forEach((p, i) => {
    if (p.length > 500) throw new Error(`${d.id}: ${i + 1}장 ${p.length}자 — 500자 초과`);
    console.log(`
--- ${d.id} ${i + 1}/${pages.length} · ${p.length}자 ---
${p}
---`);
  });
  if (dry) return null;

  // 2단계 컨테이너 모델 (답글은 reply_to_id 로 이어붙임). 한 초안 안에서는 순차.
  const ids: string[] = [];
  for (const [i, p] of pages.entries()) {
    const reply = i === 0 ? "" : `&reply_to_id=${ids[i - 1]}`;
    const c = await api(
      `/me/threads?media_type=TEXT&text=${encodeURIComponent(p)}${reply}`,
      { method: "POST" }
    );
    await new Promise((r) => setTimeout(r, 3000)); // 컨테이너 처리 대기
    const pub = await api(`/me/threads_publish?creation_id=${c.id}`, { method: "POST" });
    ids.push(pub.id);
    console.log(`${d.id} ${i + 1}/${pages.length} 발행: ${pub.id}`);
  }
  return { id: d.id, ids, variantIdx };
}

/**
 * 여러 초안 병렬 발행. ids 가 비고 all=true 면 approved 전부.
 * 동시 실행은 concurrency 개까지 (API 레이트리밋 보호). 결과는 마지막에 한 번만 저장.
 */
async function publish(ids: string[], variantIdx: number, dry: boolean, all: boolean, concurrency = 3) {
  const drafts = await readJson<any[]>("drafts.json", []);
  const targets = all
    ? drafts.filter((x) => x.status === "approved")
    : ids.map((id) => {
        const d = drafts.find((x) => x.id === id);
        if (!d) throw new Error(`draft 없음: ${id}`);
        return d;
      });
  if (!targets.length) throw new Error(all ? "approved 초안 없음" : "발행할 draft-id 없음");
  console.log(`대상 ${targets.length}건: ${targets.map((t) => t.id).join(", ")}${dry ? " (dry)" : ""}`);

  const results: PubResult[] = [];
  const failed: string[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const d = targets[cursor++];
      const vi = all ? (d.approved_variant ?? 0) : variantIdx;
      try {
        const r = await publishOne(d, vi, dry);
        if (r) results.push(r);
      } catch (e: any) {
        failed.push(d.id);
        console.error(`실패 ${d.id}: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));

  if (dry) return console.log("dry run. 발행 안 함.");

  // 발행 성공분만 갱신 — 다른 프로세스가 그 사이 바꿨을 수 있으니 다시 읽고 병합
  const fresh = await readJson<any[]>("drafts.json", []);
  const now = new Date().toISOString();
  for (const r of results) {
    const d = fresh.find((x) => x.id === r.id);
    if (!d) continue;
    d.status = "published";
    d.published_id = r.ids[0];
    if (r.ids.length > 1) d.published_reply_ids = r.ids.slice(1);
    d.published_at = now;
    d.published_variant = r.variantIdx;
  }
  await writeJson("drafts.json", fresh);

  console.log(`\n발행 완료 ${results.length}건${failed.length ? `, 실패 ${failed.length}건 (${failed.join(", ")})` : ""}`);
  results.forEach((r) => console.log(`  ${r.id}: ${r.ids[0]}`));
  console.log("72시간 뒤 npm run sync 로 성과 회수할 것.");
  if (failed.length) process.exitCode = 1;
}

/* --------------------------------------------------------------- misc */

async function limit() {
  const r = await api("/me/threads_publishing_limit?fields=quota_usage,config");
  console.log(JSON.stringify(r.data?.[0] ?? r, null, 2));
}

async function refresh() {
  const res = await fetch(
    `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${TOKEN}`
  );
  const b = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(b));
  const days = Math.round((b.expires_in ?? 0) / 86400);
  console.log(`\n갱신됨 (${days}일). .env 의 THREADS_ACCESS_TOKEN 을 교체해라:\n\n${b.access_token}\n`);
}

/* ---------------------------------------------------------------- main */

const [cmd, ...rest] = process.argv.slice(2);
const flag = (n: string) => rest.includes(n);
const val = (n: string, d: string) => {
  const i = rest.indexOf(n);
  return i >= 0 ? rest[i + 1] : d;
};

const run = {
  sync,
  limit,
  refresh,
  publish: () =>
    publish(
      rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--variant" && rest[i - 1] !== "--concurrency"),
      Number(val("--variant", "0")),
      flag("--dry"),
      flag("--all"),
      Number(val("--concurrency", "3"))
    ),
}[cmd ?? ""];

if (!run) {
  console.log("usage: sync | publish <draft-id> [<draft-id> ...] [--all] [--variant N] [--concurrency N] [--dry] | limit | refresh");
  process.exit(1);
}

run().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
