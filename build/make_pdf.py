#!/usr/bin/env python3
"""CHEATSHEET.md -> a printable 2-column color PDF (Korean) using AppleGothic + fpdf2."""
import os, re, sys
from fpdf import FPDF
from fontTools.ttLib import TTFont, TTCollection

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD = os.path.join(ROOT, "CHEATSHEET.md")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "전자회로_치트시트.pdf")

# Extract Regular(0) + Bold(6) faces from the system TTC (modern faces with OS/2 metrics).
TTC = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
FONT_REG, FONT_BOLD = "/tmp/_kr_reg.ttf", "/tmp/_kr_bold.ttf"
def _extract():
    col = TTCollection(TTC)
    col.fonts[0].save(FONT_REG)
    col.fonts[6].save(FONT_BOLD)
if not (os.path.exists(FONT_REG) and os.path.exists(FONT_BOLD)):
    _extract()

CMAP = set(TTFont(FONT_REG).getBestCmap().keys())
REPL = {"⭐":"★","🔑":"","🖨️":"","🖨":"","️":"","µ":"u","ᴺ":"^N","³":"^3","×":"x",
        "−":"-","–":"-","—":"-","⚡":""}
def safe(s):
    out = []
    for ch in s:
        if ord(ch) in CMAP: out.append(ch)
        elif ch in REPL: out.append(REPL[ch])
        # else drop
    return "".join(out)

# ---- parse markdown ----
cards = []
for line in open(MD, encoding="utf-8"):
    line = line.rstrip("\n")
    if line.startswith("### "): cards.append({"t": line[4:].strip(), "items": []})
    elif line.startswith("- ") and cards: cards[-1]["items"].append(line[2:].strip())

PALETTE = ["#8b9bff","#5b8cff","#22b8d4","#1eaf6e","#e0518f","#8b6bf0","#d99a1a",
           "#2fa64f","#e8741a","#e0524f","#a564d8","#1aa394","#d9a013","#6b7794"]
def hx(h): h=h.lstrip("#"); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16))

def segments(text):
    """split into (text, kind) kind in n/b/c; handles `code` nested inside **bold**."""
    out = []
    for i, part in enumerate(re.split(r"\*\*(.+?)\*\*", text)):
        if not part: continue
        bold = (i % 2 == 1)
        for j, s in enumerate(re.split(r"`(.+?)`", part)):
            if not s: continue
            out.append((s, "c" if j % 2 == 1 else ("b" if bold else "n")))
    return out

PT = 0.352778
BODY, TITLE = 7.6, 9.4
BODY_LH, TITLE_LH = 3.45, 5.0
PAD, BARW = 2.4, 1.6
GAP_ITEM = 0.7

pdf = FPDF(orientation="P", unit="mm", format="A4")
pdf.set_auto_page_break(False)
pdf.add_font("KR", "", FONT_REG)
pdf.add_font("KR", "B", FONT_BOLD)
M = 8.0
PAGE_W, PAGE_H = 210, 297
COLGAP = 6
COLW = (PAGE_W - 2*M - COLGAP) / 2
COL_X = [M, M + COLW + COLGAP]
TOP = M + 12          # header room
BOTTOM = PAGE_H - M

def set_kind(k):
    if k == "c":
        pdf.set_font("Courier", "", BODY); pdf.set_text_color(0xb0, 0x16, 0x52)
    elif k == "b":
        pdf.set_font("KR", "B", BODY); pdf.set_text_color(0x0e, 0x39, 0x86)
    else:
        pdf.set_font("KR", "", BODY); pdf.set_text_color(0x2b, 0x35, 0x50)

def draw_segs(segs, x0, base_y, maxw, draw=True):
    """char-level wrap; returns final baseline y."""
    x, y = x0, base_y
    for text, kind in segs:
        set_kind(kind)
        for ch in safe(text):
            w = pdf.get_string_width(ch)
            if x + w > x0 + maxw:
                x = x0; y += BODY_LH
                if ch == " ": continue
            if draw and ch != " ": pdf.text(x, y, ch)
            x += w
    return y

def card_height(card):
    inner_w = COLW - 2*PAD - BARW
    y = PAD + TITLE_LH
    for it in card["items"]:
        base = y + BODY*PT*0.9
        end = draw_segs(segments(it), 0 + BARW + PAD + 2.6, base, inner_w - 2.6, draw=False)
        y = (end - (BODY*PT*0.9)) + BODY_LH + GAP_ITEM
    return y + PAD - 0.4

# greedy column packing
heights = [card_height(c) for c in cards]
positions = []  # (card_idx, x, y)
col, y = 0, TOP
def new_page():
    global col, y
    pdf.add_page(); pdf.set_fill_color(255,255,255)
    col, y_local = 0, TOP
    return TOP
pdf.add_page()
for idx, c in enumerate(cards):
    h = heights[idx]
    if y + h > BOTTOM:
        col += 1
        if col > 1:
            col = 0; y = new_page()
        else:
            y = TOP
    positions.append((idx, COL_X[col], y))
    y += h + 4

# ---- draw header on first page ----
def header():
    pdf.set_font("KR", "", 15); pdf.set_text_color(0x16,0x20,0x3a)
    pdf.text(M, M+7, safe("⚡ 전자회로 핵심 치트시트"))
    pdf.set_draw_color(0x5b,0x8c,0xff); pdf.set_line_width(0.5)
    pdf.line(M, M+9.5, PAGE_W-M, M+9.5)
    pdf.set_font("KR", "", 8); pdf.set_text_color(0x66,0x70,0x88)
    sub = safe("아두이노 · 가천대 의공학과 · ★=출제예고 · 시험 직전 30초 컷")
    pdf.text(PAGE_W-M-pdf.get_string_width(sub), M+7, sub)

# render cards by page: we need header only on page 1. Re-walk with page tracking.
# Simplest: positions already assigned per page via add_page calls above, but we drew pages already.
# Redo cleanly: rebuild doc now that we know layout.
pdf = FPDF(orientation="P", unit="mm", format="A4"); pdf.set_auto_page_break(False)
pdf.add_font("KR","",FONT_REG); pdf.add_font("KR","B",FONT_BOLD)
# recompute packing tracking page index
pages = [[]]; col, y = 0, TOP
for idx, c in enumerate(cards):
    h = heights[idx]
    if y + h > BOTTOM:
        col += 1
        if col > 1: pages.append([]); col = 0; y = TOP
        else: y = TOP
    pages[-1].append((idx, COL_X[col], y, h)); y += h + 4

for pi, page in enumerate(pages):
    pdf.add_page()
    if pi == 0: header()
    for idx, x, y0, h in page:
        c = cards[idx]; r,g,b = hx(PALETTE[idx % len(PALETTE)])
        # card box
        pdf.set_draw_color(0xd8,0xdf,0xea); pdf.set_line_width(0.2); pdf.set_fill_color(0xfb,0xfc,0xff)
        pdf.rect(x, y0, COLW, h, style="DF")
        pdf.set_fill_color(r,g,b); pdf.rect(x, y0, BARW, h, style="F")
        # title
        pdf.set_fill_color(r,g,b)
        pdf.ellipse(x+BARW+PAD, y0+PAD+1.3, 1.8, 1.8, style="F")
        pdf.set_font("KR","B",TITLE); pdf.set_text_color(0x11,0x1a,0x30)
        pdf.text(x+BARW+PAD+3.2, y0+PAD+TITLE*PT*0.95, safe(c["t"]))
        # items
        yc = y0 + PAD + TITLE_LH
        inner_w = COLW - 2*PAD - BARW
        for it in c["items"]:
            base = yc + BODY*PT*0.9
            pdf.set_fill_color(r,g,b)
            pdf.ellipse(x+BARW+PAD+0.2, base-1.4, 1.1, 1.1, style="F")
            end = draw_segs(segments(it), x+BARW+PAD+2.6, base, inner_w-2.6, draw=True)
            yc = (end - BODY*PT*0.9) + BODY_LH + GAP_ITEM

    # footer
    pdf.set_font("KR","",7); pdf.set_text_color(0x99,0xa1,0xb0)
    foot = safe("강의 슬라이드 + 복습강의 녹취 + Notion 총정리 통합 · 학습 보조용")
    pdf.text(PAGE_W/2 - pdf.get_string_width(foot)/2, PAGE_H-4, foot)

pdf.output(OUT)
print(f"PDF 생성: {OUT}  ({len(cards)} 카드, {len(pages)} 페이지)")
