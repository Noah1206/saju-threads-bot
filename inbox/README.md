# inbox

웹 챗에서 뽑은 초안 .txt 를 여기 넣고:

    node scripts/import-draft.mjs inbox/ --product <slug>
    npm run publish -- --all

상품 slug 는 data/products.md 참조. 연애·재회·궁합 소재만 --product 를 붙인다.

검사: node scripts/check-draft.mjs --file inbox/xxx.txt
