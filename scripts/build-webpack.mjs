// claude.ai 웹 챗(Project)용 지식 팩 생성. 스킬·규칙·참조표를 한 파일로 묶는다.
//   node scripts/build-webpack.mjs  ->  dist/claude-web-project-pack.md + dist/claude-web-project-instructions.md
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const r = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const R = ".claude/skills/threads-voice/references/";
mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });

const pack = `# saju-threads-bot 웹 챗 지식 팩 (자동 생성 — 원본은 GitHub Noah1206/saju-threads-bot)

> 이 파일은 Claude Code 없이 claude.ai Project 에서 같은 품질의 초안을 뽑기 위한 것.
> 발행·성과 회수는 여기서 못 한다. 초안 -> Threads 앱 복붙 -> 답글에 상품 링크.

---
# A. 작성 절차·자체검사 (SKILL.md)
${r(".claude/skills/threads-voice/SKILL.md").replace(/^---[\s\S]*?---\n/, "")}

---
# B. 말투 규칙 (voice-profile.md)
${r(R + "voice-profile.md")}

---
# C. few-shots 압축체 원문 (few-shots.md)
${r(R + "few-shots.md")}

---
# D. 금지어 (banned.md) — 초안에 하나라도 있으면 폐기
${r(R + "banned.md")}

---
# E. 세운·지지 참조표 (seun.md) — 연도·간지·합충·십신은 반드시 여기와 대조
${r("data/reference/seun.md")}

---
# F. LOVEREBBIT 상품 링크 — 연애·재회·궁합 소재만 2/2 답글에 연결
${r("data/loverebbit/products.md")}

---
# G. /draft 커맨드
${r(".claude/commands/draft.md")}

---
# H. /review 커맨드
${r(".claude/commands/review.md")}

---
# I. /ideate 커맨드 (소재는 J 에서만)
${r(".claude/commands/ideate.md")}

---
# J. 소재 인풋 (sources.md)
${r("data/sources.md")}

---
# K. /voice-extract 커맨드 (말투 갱신 — 결과는 Claude Code 세션에서 voice-profile.md 에 반영)
${r(".claude/commands/voice-extract.md")}

---
# L. 재회 소재 패턴 (patterns/jaehoe.md)
${r("data/patterns/jaehoe.md")}
`;
writeFileSync(new URL("../dist/claude-web-project-pack.md", import.meta.url), pack);

const instr = `너는 사주·명리 Threads 계정 운영 보조다. 지식 파일 "claude-web-project-pack.md" 가 규칙 전부다.

절대 규칙
1. 글은 압축체(~함/~임/~됨/명사종결)만. 존대·반말 구어 금지.
2. 초안은 /draft 절차대로: few-shots 중 구조 가까운 3개 밝힘 -> 앵글 다른 3안 -> A~H 자체검사 결과를 표로 -> 실패 안은 출력 전 다시 씀.
3. 연도·월·띠·합/충/원진/삼합·십신을 쓰면 E 참조표 해당 줄을 인용해서 대조 결과를 안별로 보여준다. 표에 없는 관계는 폐기.
4. 500자 이하. 금지어(D) 0개. 마무리는 CTA/절단/무뚝뚝한 사실/"등등" 4종만. "A가 아니라 B" 재정의로 끝내지 않는다.
5. /review 요청이면 가장 약한 안을 반드시 지목한다. 3안 다 좋다고 하지 않는다.
6. loverebbit 계정용이면 본문 끝에 해시태그 <=3, 그리고 2/2 답글(상품 링크 F 에서 주제에 맞는 것 + "생년월일만 넣으면 됨") 을 따로 출력. 돈·직업·띠 소재는 답글 없음.
7. 발행은 여기서 못 한다. "발행" 요청이 오면 Threads 앱에 복붙하라고 안내하고, 발행한 글은 나중에 Claude Code 세션에서 drafts.json 에 기록하라고 알린다.

출력은 설명 최소, 초안 본문 중심. 모바일에서 복사하기 쉽게 코드블록으로.`;
writeFileSync(new URL("../dist/claude-web-project-instructions.md", import.meta.url), instr);
console.log("dist/claude-web-project-pack.md", pack.length, "자 /", "dist/claude-web-project-instructions.md", instr.length, "자");
