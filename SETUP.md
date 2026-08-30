# 다른 환경에서 이어서 쓰기

계정은 **@loverebbit 하나**다. 원본 PC: OneDrive\\Desktop\\saju-threads-bot (OneDrive 로그인하면 .env 포함 그대로 열림)
GitHub: https://github.com/Noah1206/saju-threads-bot (비공개, 비밀값 제외)

## 0. 노트북 + OneDrive (가장 쉬움)

1. OneDrive 같은 계정 로그인 -> 폴더가 .env 포함 내려옴 (git clone 불필요)
   - Mac: Finder 사이드바 OneDrive > Desktop > saju-threads-bot
     (예: ~/Library/CloudStorage/OneDrive-Personal/Desktop/saju-threads-bot)
     폴더 우클릭 > "항상 이 기기에 유지" 켜둘 것
   - Windows: Desktop\\saju-threads-bot
2. Mac: 터미널에서 폴더로 이동 후  bash setup-mac.sh
   Windows: SETUP_LAPTOP.bat 더블클릭
   (Node 22 / Git / Claude Code 설치 + .env 확인 + API 연결 확인을 한 번에)
3. claude 실행 -> 첫 마디: "CLAUDE.md 읽고 이어서. git status 먼저"

주의: 두 기기에서 동시에 열지 말 것 (OneDrive 충돌 사본). 세션 끝에 git push.

## 1. OneDrive 없이 (clone)

    git clone https://github.com/Noah1206/saju-threads-bot
    cd saju-threads-bot          # Node >= 22.9, npm install 불필요
    nvm use                      # .nvmrc(24) 를 읽음. 낮은 버전이면
                                 # --experimental-strip-types 에서 "bad option" 으로 죽는다

## 2. 비밀값 — 둘 중 하나

(a) 파일: .env.example 을 .env 로 복사 후 값 채움
(b) 환경변수: THREADS_APP_ID / THREADS_APP_SECRET / THREADS_ACCESS_TOKEN / LOVEREBBIT_LINK
    claude.ai/code 클라우드 환경이면 env vars 에 등록. --env-file-if-exists 라 파일 없어도 동작.

토큰 원본: 원본 PC의 Desktop/claude/threads_token_loverabbit.json
또는 Meta 콘솔 "사용자 토큰 생성기"에서 재발급. 만료 2026-10-17.

## 3. 확인

    npm run limit        # quota_total 이 나오면 OK

## 4. 작업 후

    git add -A && git commit -m "..." && git push     # data/*.json 이 상태 그 자체이므로 반드시 푸시

## 5. 웹 챗(claude.ai)에서 쓴 초안 발행하기

1. claude.ai Project 에 dist/claude-web-project-pack.md 업로드 + dist/claude-web-project-instructions.md 를 Instructions 에
   (규칙이 바뀌면 node scripts/build-webpack.mjs 로 재생성 후 다시 업로드)
2. 승인한 안을 .txt 로 inbox/ 에 저장 (본문만. 답글 직접 쓰려면 ===== 아래에)
3. node scripts/import-draft.mjs inbox/ --product <slug>
4. npm run publish -- --all
