# 다른 환경에서 이어서 쓰기

원본 PC: C:Usersab409OneDriveDesktopsaju-threads-bot (OneDrive 동기화됨 — 다른 Windows PC에 OneDrive 로그인하면 .env 포함 그대로 열림)
GitHub: https://github.com/Noah1206/saju-threads-bot (비공개, 비밀값 제외)

## 0. 노트북 + OneDrive (가장 쉬움 — 2026-08-27 포항)
1. OneDrive 같은 계정 로그인 -> Desktopsaju-threads-bot 이 .env 포함 내려옴 (git clone 불필요)
2. SETUP_LAPTOP.bat 더블클릭 (Node·Git·Claude Code 설치 + .env 확인 + API 연결 확인을 한 번에)
3. 폴더에서 claude 실행 -> "SETUP.md 보고 연결 확인해줘"
주의: 두 PC 동시에 열지 말 것 (OneDrive 충돌 사본). 세션 끝에 git push.

## 1. 코드 받기 (OneDrive 없을 때)
git clone https://github.com/Noah1206/saju-threads-bot && cd saju-threads-bot   (Node >= 22.9, npm install 불필요)

## 2. 비밀값 넣기 — 둘 중 하나
(a) 파일: .env.example -> .env, .env.loverebbit.example -> .env.loverebbit 복사 후 값 채움
(b) 환경변수: THREADS_APP_ID / THREADS_APP_SECRET / THREADS_ACCESS_TOKEN (+ loverebbit 은 DATA_DIR=data/loverebbit/, LOVEREBBIT_LINK)
    claude.ai/code 클라우드 환경이면 환경 설정의 env vars 에 등록. 파일 없어도 --env-file-if-exists 라 동작함.

토큰 원본: 원본 PC의 C:Usersab409OneDriveDesktopclaude	hreads_token.json (fitpick_00) / threads_token_loverabbit.json (loverebbit)
또는 Meta 콘솔 사용자 토큰 생성기에서 재발급 (상위 CLAUDE.md 3번).

## 3. 확인
npm run limit        # fitpick_00 쿼터가 나오면 OK
npm run limit:lr     # loverebbit

## 4. 작업 후
git add -A && git commit -m "..." && git push     # data/*.json 이 상태 그 자체이므로 반드시 푸시

## 5. 웹 챗(claude.ai)에서 쓴 초안 발행하기
1. claude.ai Project 에 dist/claude-web-project-pack.md 업로드 + instructions 붙여넣기 (재생성: node scripts/build-webpack.mjs)
2. 승인한 안을 .txt 로 inbox/ 에 저장 (본문만. 답글 직접 쓰려면 ===== 아래)
3. node scripts/import-draft.mjs inbox/ --lr --product <slug>   (fitpick 이면 --lr 빼기)
4. npm run publish:lr -- --all
