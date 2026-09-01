# 모바일 세로 팝업 (토끼 위 / 카피 아래). 원형 마스크 없이 crop + 하단 페이드.
from PIL import Image, ImageDraw, ImageFont
F="/System/Library/Fonts/AppleSDGothicNeo.ttc"
HEAVY,BOLD,MED=16,6,2
def f(sz,i=BOLD): return ImageFont.truetype(F,sz,index=i)
W,H=1000,1400
PURPLE=(93,63,140); INK=(38,30,55); GREEN=(140,245,60); GRAY=(120,110,135)

src=Image.open("wave.png").convert("RGB")
im=Image.new("RGB",(W,H),(255,255,255)); d=ImageDraw.Draw(im,"RGBA")

# 상단: 토끼를 폭에 맞춰 채우고 crop
PH=int(H*0.52)
BG=src.getpixel((5,5))
d.rectangle((0,0,W,PH),fill=BG)          # 여백은 생성 이미지 배경색으로
sw,sh=src.size
# 폭을 꽉 채우되(좌우 띠 방지) 세로는 토끼 전체가 보이게 위쪽을 잘라낸다
r=src.resize((int(W*0.94),int(W*0.94)))
TOP=PH-r.height              # 이미지 하단 = PH 에 정확히 맞춤 (띠·경계 방지)
im.paste(r,(int((W-r.width)/2),TOP))
d.rectangle((0,0,W,max(0,TOP)),fill=BG)   # 위쪽 남는 곳은 같은 배경색

# 하단 경계를 흰색으로 페이드 (가로선 제거)
for i in range(150):
    a=int(255*(i/150)**1.3)
    d.line([(0,PH-150+i),(W,PH-150+i)],fill=(255,255,255,a))
d.rectangle((0,PH,W,H),fill=(255,255,255))

cx=W//2
tag="오픈 이벤트"; tf=f(34,BOLD); tw=d.textlength(tag,font=tf)
bw2=tw+124; bx=cx-bw2/2; by=int(H*0.535)
d.rounded_rectangle((bx,by,bx+bw2,by+72),radius=36,fill=GREEN)
ico=Image.open("logo.png").convert("RGBA").resize((44,44))
im.paste(ico,(int(bx+26),by+14),ico)
d.text((bx+26+58,by+36),tag,font=tf,fill=INK,anchor="lm")

y=int(H*0.625)
d.text((cx,y),"궁금해?",font=f(86,HEAVY),fill=INK,anchor="ma")
d.text((cx,y+106),"러브레빗한테",font=f(86,HEAVY),fill=INK,anchor="ma")
d.text((cx,y+212),"물어봐",font=f(86,HEAVY),fill=PURPLE,anchor="ma")
ul=f(86,HEAVY); uw=d.textlength("물어봐",font=ul); asc,_=ul.getmetrics()
d.line([(cx-uw/2,y+212+asc+8),(cx+uw/2,y+212+asc+8)],fill=GREEN,width=9)

d.text((cx,int(H*0.855)),"어떤 사주든 첫 한 장은 1,900원",font=f(38,MED),fill=GRAY,anchor="ma")

bw3,bh=int(W*0.72),100; bx2=cx-bw3/2; by2=int(H*0.900)
d.rounded_rectangle((bx2,by2,bx2+bw3,by2+bh),radius=bh//2,fill=PURPLE)
d.text((cx,by2+bh/2),"내 사주 보러가기",font=f(40,BOLD),fill=(255,255,255),anchor="mm")

ccx,ccy,rr=W-52,50,15
d.line([(ccx-rr,ccy-rr),(ccx+rr,ccy+rr)],fill=(150,140,165),width=5)
d.line([(ccx-rr,ccy+rr),(ccx+rr,ccy-rr)],fill=(150,140,165),width=5)
im.save("popup-mobile.png",quality=95); print("ok",im.size)
