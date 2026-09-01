# 3D 토끼 이미지 위에 카드 텍스트를 얹는다. 레퍼런스 레이아웃: 로고바 / 초록 라벨 / 하단 큰 타이포
from PIL import Image, ImageDraw, ImageFont
F = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
def font(sz, idx=8):  # 8 = Bold 계열
    return ImageFont.truetype(F, sz, index=idx)

im = Image.open("rabbit3d.png").convert("RGB")
W, H = im.size
d = ImageDraw.Draw(im, "RGBA")

def rrect(box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)

def text_out(xy, s, f, fill="white", outline=(0,0,0,90), w=6):
    x, y = xy
    for dx in range(-w, w+1, 2):
        for dy in range(-w, w+1, 2):
            if dx*dx + dy*dy <= w*w:
                d.text((x+dx, y+dy), s, font=f, fill=outline)
    d.text(xy, s, font=f, fill=fill)

# --- 상단 로고 바 (노란 라운드 + 로고 + 워드마크)
pad = int(W*0.035)
lf = font(int(W*0.055))
logo = Image.open("logo.png").convert("RGBA").resize((int(W*0.075),)*2)
bw = int(W*0.075) + int(d.textlength("loverebbit", font=lf)) + pad*2 + 18
rrect((0, 0, bw, int(H*0.052)), 0, (255, 222, 51, 255))
im.paste(logo, (pad//2, int(H*0.052/2 - W*0.075/2)), logo)
d.text((pad//2 + int(W*0.075) + 16, int(H*0.052/2 - W*0.055*0.72)), "loverebbit", font=lf, fill=(20,20,20))

# --- 초록 라벨 (상단 중앙)
tag, tf = "무료 사주", font(int(W*0.052))
tw = d.textlength(tag, font=tf)
cx, ty = W*0.5, H*0.062
rrect((cx-tw/2-int(W*0.045), ty, cx+tw/2+int(W*0.045), ty+int(W*0.098)), int(W*0.049), (140, 245, 60, 255))
d.text((cx-tw/2, ty+int(W*0.019)), tag, font=tf, fill=(20,20,20))

# --- 하단 어둡게 (텍스트 가독성)
for i in range(int(H*0.34)):
    yy = int(H*0.66) + i
    d.line([(0, yy), (W, yy)], fill=(0, 0, 0, int(120 * (i / (H*0.34)) ** 0.8)))

# --- 하단 카피
big, accent = font(int(W*0.088)), (140, 245, 60)
lines = [[("내 ", "white"), ("사주", accent), (" 몇 월에", "white")], [("뭐가 걸리는지", "white")], [("무료로 봐줌", "white")]]
y = H*0.700
for ln in lines:
    x = W*0.055
    for s, col in ln:
        text_out((x, y), s, big, fill=col)
        x += d.textlength(s, font=big)
    y += W*0.107

# 언더라인 (초록 강조어 밑)
ul = font(int(W*0.088))
x0 = W*0.055 + d.textlength("내 ", font=ul)
d.line([(x0, H*0.700+W*0.097), (x0+d.textlength("사주", font=ul), H*0.700+W*0.097)], fill=accent, width=int(W*0.008))

im.save("card.png", quality=95)
print("ok", im.size)
