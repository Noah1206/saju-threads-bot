# 3D 토끼 위에 카드 텍스트. 레퍼런스(sajuplay) 타이포를 그대로 맞춘다:
#   Heavy 웨이트 / 두꺼운 검정 외곽선 / 좁은 행간 / 좌하단 배치 / 초록 밑줄
import sys
from PIL import Image, ImageDraw, ImageFont

F = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
HEAVY, BOLD = 16, 6
def font(sz, idx=HEAVY): return ImageFont.truetype(F, sz, index=idx)

GREEN  = (140, 245, 60)
YELLOW = (255, 222, 51)

# 사용법:
#   python card.py out.png "무료 사주" "내 *사주* 몇 월에" "뭐가 걸리는지" "*무료*로 봐줌"
#   *별표* 로 감싼 말이 초록 + 밑줄. 인자 없으면 아래 기본값.
def parse(t):
    if "*" in t:
        a, hi, b = t.split("*", 2)
        return (a + hi + b, hi)
    return (t, None)

args = sys.argv[1:]
if len(args) >= 3:
    OUT, TAG = args[0], args[1]
    LINES = [parse(t) for t in args[2:]]
else:
    OUT, TAG = (args[0] if args else "card.png"), "무료 사주"
    LINES = [parse("내 *사주* 몇 월에"), parse("뭐가 걸리는지"), parse("*무료*로 봐줌")]

im = Image.open("rabbit3d.png").convert("RGB")
W, H = im.size
d = ImageDraw.Draw(im, "RGBA")

def stroke(xy, s, f, fill, w):
    """PIL 자체 stroke — 레퍼런스처럼 두껍고 균일한 검정 테두리."""
    d.text(xy, s, font=f, fill=fill, stroke_width=w, stroke_fill=(0, 0, 0))

# ── 상단 로고 바
lf = font(int(W * 0.052), BOLD)
logo = Image.open("logo.png").convert("RGBA").resize((int(W * 0.072),) * 2)
barh = int(H * 0.049)
barw = int(W * 0.072) + int(d.textlength("loverebbit", font=lf)) + int(W * 0.055)
d.rounded_rectangle((0, 0, barw, barh), radius=0, fill=YELLOW)
im.paste(logo, (int(W * 0.012), (barh - int(W * 0.072)) // 2), logo)
d.text((int(W * 0.012) + int(W * 0.072) + int(W * 0.012), barh / 2), "loverebbit",
       font=lf, fill=(20, 20, 20), anchor="lm")

# ── 초록 라벨 (물결 대신 라운드 — 같은 인상)
tf = font(int(W * 0.050), BOLD)
tw = d.textlength(TAG, font=tf)
cx, ty = W * 0.52, H * 0.058
padx, padyy = int(W * 0.042), int(W * 0.024)
d.rounded_rectangle((cx - tw / 2 - padx, ty, cx + tw / 2 + padx, ty + int(W * 0.050) + padyy * 2),
                    radius=int(W * 0.05), fill=GREEN)
d.text((cx, ty + (int(W * 0.050) + padyy * 2) / 2), TAG, font=tf, fill=(20, 20, 20), anchor="mm")

# ── 하단 카피: Heavy + 두꺼운 외곽선 + 좁은 행간
size = int(W * 0.098)
big  = font(size)
SW   = max(6, int(size * 0.115))          # 외곽선 두께
LEAD = int(size * 1.16)                   # 행간 (레퍼런스가 촘촘함)
x0   = int(W * 0.052)
y    = H - int(H * 0.085) - LEAD * len(LINES)

for text, hi in LINES:
    x = x0
    if hi and hi in text:
        pre, post = text.split(hi, 1)
        ux = x + d.textlength(pre, font=big)
        uw = d.textlength(hi, font=big)
        # 밑줄 먼저 (글자 아래, 글자에 안 겹치게)
        asc, desc = big.getmetrics()
        uy = y + asc + size * 0.055
        d.line([(ux, uy), (ux + uw, uy)], fill=GREEN, width=max(5, int(size * 0.070)))
        for seg, col in ((pre, "white"), (hi, GREEN), (post, "white")):
            if not seg: continue
            stroke((x, y), seg, big, col, SW)
            x += d.textlength(seg, font=big)
    else:
        stroke((x, y), text, big, "white", SW)
    y += LEAD

im.save(OUT, quality=95)
print("ok", OUT, im.size)
