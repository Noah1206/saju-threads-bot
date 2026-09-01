# 웹앱 진입 팝업. 내용은 기존 오픈 이벤트 그대로, 토끼가 인사하는 형태로.
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

F="/System/Library/Fonts/AppleSDGothicNeo.ttc"
HEAVY,BOLD,MED,REG=16,6,2,0
def f(sz,i=BOLD): return ImageFont.truetype(F,sz,index=i)

W,H=1600,1000
PURPLE=(93,63,140); LILAC=(237,230,250); INK=(38,30,55)
GREEN=(140,245,60); YELLOW=(255,222,51); GRAY=(120,110,135)
OUT=sys.argv[1] if len(sys.argv)>1 else "popup.png"

im=Image.new("RGB",(W,H),(255,255,255))
d=ImageDraw.Draw(im,"RGBA")

# 좌측 라일락 패널 (토끼 자리)
PW=int(W*0.42)
d.rectangle((0,0,PW,H),fill=LILAC)

# 토끼
r=Image.open("wave.png").convert("RGB")
# 배경이 라일락이라 그대로 얹되, 원형 마스크로 부드럽게
size=int(H*0.86)
r=r.resize((size,size))
mask=Image.new("L",(size,size),0)
ImageDraw.Draw(mask).ellipse((0,0,size,size),fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(size*0.03))
im.paste(r,(int(PW/2-size/2),int(H/2-size/2)),mask)

# 우측 카피
x=PW+int(W*0.055)
# 라벨
tag="오픈 이벤트"
tf=f(34,BOLD)
tw=d.textlength(tag,font=tf)
d.rounded_rectangle((x,int(H*0.14),x+tw+124,int(H*0.14)+72),radius=36,fill=GREEN)
ico=Image.open("logo.png").convert("RGBA").resize((44,44))
im.paste(ico,(x+26,int(H*0.14)+14),ico)
d.text((x+26+44+14,int(H*0.14)+36),tag,font=tf,fill=INK,anchor="lm")

# 헤드라인
d.text((x,int(H*0.30)),"궁금해?",font=f(92,HEAVY),fill=INK)
d.text((x,int(H*0.30)+112),"러브레빗한테",font=f(92,HEAVY),fill=INK)
d.text((x,int(H*0.30)+224),"물어봐",font=f(92,HEAVY),fill=PURPLE)
# 밑줄
ul=f(92,HEAVY)
uw=d.textlength("물어봐",font=ul)
asc,_=ul.getmetrics()
d.line([(x,int(H*0.30)+224+asc+8),(x+uw,int(H*0.30)+224+asc+8)],fill=GREEN,width=9)

# 본문
d.text((x,int(H*0.665)),"어떤 사주든 첫 한 장은 1,900원",font=f(40,MED),fill=GRAY)

# 버튼
bw,bh=int(W*0.30),96
by=int(H*0.755)
d.rounded_rectangle((x,by,x+bw,by+bh),radius=bh//2,fill=PURPLE)
d.text((x+bw/2,by+bh/2),"내 사주 보러가기",font=f(40,BOLD),fill=(255,255,255),anchor="mm")

# 닫기 (X 를 선으로 — 폰트에 글리프 없음)
cx,cy,rr=W-58,52,15
d.line([(cx-rr,cy-rr),(cx+rr,cy+rr)],fill=GRAY,width=5)
d.line([(cx-rr,cy+rr),(cx+rr,cy-rr)],fill=GRAY,width=5)

im.save(OUT,quality=95)
print("ok",OUT,im.size)
