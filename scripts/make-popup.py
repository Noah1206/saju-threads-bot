# 웹앱 진입 팝업 (데스크톱). 내용은 기존 오픈 이벤트 그대로, 토끼가 인사하는 형태.
# 토끼 배경색을 패널 색으로 그대로 써서 이음매가 안 보이게 한다.
import sys
from PIL import Image, ImageDraw, ImageFont

F="/System/Library/Fonts/AppleSDGothicNeo.ttc"
HEAVY,BOLD,MED=16,6,2
def f(sz,i=BOLD): return ImageFont.truetype(F,sz,index=i)

W,H=1600,1000
PURPLE=(93,63,140); INK=(38,30,55); GREEN=(140,245,60); GRAY=(120,110,135)
OUT=sys.argv[1] if len(sys.argv)>1 else "popup.png"

src=Image.open("wave.png").convert("RGB")
BG=src.getpixel((5,5))                      # 생성 이미지의 배경색 = 패널 색

im=Image.new("RGB",(W,H),(255,255,255))
d=ImageDraw.Draw(im,"RGBA")

# ── 좌측 패널: 토끼 이미지를 패널에 꽉 채워 crop (원형 마스크 없음)
PW=int(W*0.44)
sw,sh=src.size
scale=max(PW/sw, H/sh)*1.02
r=src.resize((int(sw*scale),int(sh*scale)))
# 토끼가 패널 중앙에 오도록 crop
left=(r.width-PW)//2
top=int((r.height-H)*0.46)
im.paste(r.crop((left,top,left+PW,top+H)),(0,0))

# 패널 우측 가장자리를 흰 배경으로 부드럽게 (딱딱한 세로선 제거)
for i in range(90):
    a=int(255*(i/90)**1.5)
    d.line([(PW-90+i,0),(PW-90+i,H)],fill=(255,255,255,a))

x=PW+int(W*0.05)
# 라벨
tag="오픈 이벤트"; tf=f(34,BOLD); tw=d.textlength(tag,font=tf)
by=int(H*0.145)
d.rounded_rectangle((x,by,x+tw+124,by+72),radius=36,fill=GREEN)
ico=Image.open("logo.png").convert("RGBA").resize((44,44))
im.paste(ico,(x+26,by+14),ico)
d.text((x+26+58,by+36),tag,font=tf,fill=INK,anchor="lm")

# 헤드라인
y=int(H*0.30)
d.text((x,y),"궁금해?",font=f(92,HEAVY),fill=INK)
d.text((x,y+112),"러브레빗한테",font=f(92,HEAVY),fill=INK)
d.text((x,y+224),"물어봐",font=f(92,HEAVY),fill=PURPLE)
ul=f(92,HEAVY); uw=d.textlength("물어봐",font=ul); asc,_=ul.getmetrics()
d.line([(x,y+224+asc+8),(x+uw,y+224+asc+8)],fill=GREEN,width=9)

d.text((x,int(H*0.665)),"어떤 사주든 첫 한 장은 1,900원",font=f(40,MED),fill=GRAY)

bw,bh=int(W*0.30),96; by2=int(H*0.755)
d.rounded_rectangle((x,by2,x+bw,by2+bh),radius=bh//2,fill=PURPLE)
d.text((x+bw/2,by2+bh/2),"내 사주 보러가기",font=f(40,BOLD),fill=(255,255,255),anchor="mm")

cx,cy,rr=W-58,52,15
d.line([(cx-rr,cy-rr),(cx+rr,cy+rr)],fill=GRAY,width=5)
d.line([(cx-rr,cy+rr),(cx+rr,cy-rr)],fill=GRAY,width=5)

im.save(OUT,quality=95); print("ok",OUT,im.size,"bg",BG)
