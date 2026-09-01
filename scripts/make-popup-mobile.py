# 모바일 세로 팝업 (토끼 위 / 카피 아래)
from PIL import Image, ImageDraw, ImageFont, ImageFilter
F="/System/Library/Fonts/AppleSDGothicNeo.ttc"
HEAVY,BOLD,MED=16,6,2
def f(sz,i=BOLD): return ImageFont.truetype(F,sz,index=i)
W,H=1000,1400
PURPLE=(93,63,140); LILAC=(237,230,250); INK=(38,30,55); GREEN=(140,245,60); GRAY=(120,110,135)
im=Image.new("RGB",(W,H),(255,255,255)); d=ImageDraw.Draw(im,"RGBA")

# 상단 라일락
PH=int(H*0.46); d.rectangle((0,0,W,PH),fill=LILAC)
r=Image.open("wave.png").convert("RGB"); s=int(PH*1.02); r=r.resize((s,s))
m=Image.new("L",(s,s),0); ImageDraw.Draw(m).ellipse((0,0,s,s),fill=255)
m=m.filter(ImageFilter.GaussianBlur(s*0.035))
im.paste(r,(int(W/2-s/2),int(PH/2-s/2)),m)

cx=W//2
# 라벨
tag="오픈 이벤트"; tf=f(34,BOLD); tw=d.textlength(tag,font=tf)
bw2=tw+124; bx=cx-bw2/2; by=int(H*0.505)
d.rounded_rectangle((bx,by,bx+bw2,by+72),radius=36,fill=GREEN)
ico=Image.open("logo.png").convert("RGBA").resize((44,44))
im.paste(ico,(int(bx+26),by+14),ico)
d.text((bx+26+58,by+36),tag,font=tf,fill=INK,anchor="lm")

# 헤드라인 (중앙)
y=int(H*0.60)
d.text((cx,y),"궁금해?",font=f(86,HEAVY),fill=INK,anchor="ma")
d.text((cx,y+106),"러브레빗한테",font=f(86,HEAVY),fill=INK,anchor="ma")
d.text((cx,y+212),"물어봐",font=f(86,HEAVY),fill=PURPLE,anchor="ma")
ul=f(86,HEAVY); uw=d.textlength("물어봐",font=ul); asc,_=ul.getmetrics()
d.line([(cx-uw/2,y+212+asc+8),(cx+uw/2,y+212+asc+8)],fill=GREEN,width=9)

d.text((cx,int(H*0.845)),"어떤 사주든 첫 한 장은 1,900원",font=f(38,MED),fill=GRAY,anchor="ma")

bw3,bh=int(W*0.72),100; bx2=cx-bw3/2; by2=int(H*0.895)
d.rounded_rectangle((bx2,by2,bx2+bw3,by2+bh),radius=bh//2,fill=PURPLE)
d.text((cx,by2+bh/2),"내 사주 보러가기",font=f(40,BOLD),fill=(255,255,255),anchor="mm")

ccx,ccy,rr=W-52,50,15
d.line([(ccx-rr,ccy-rr),(ccx+rr,ccy+rr)],fill=(150,140,165),width=5)
d.line([(ccx-rr,ccy+rr),(ccx+rr,ccy-rr)],fill=(150,140,165),width=5)
im.save("popup-mobile.png",quality=95); print("ok",im.size)
