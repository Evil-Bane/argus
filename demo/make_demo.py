#!/usr/bin/env python3
"""Generate argus-demo.gif — a self-contained, code-rendered terminal cast of one
/customer-audit run: type the command, fan out across surfaces, adversarially verify,
emit a ranked fix list. No screen capture needed; Pillow draws every frame.

Run:  python demo/make_demo.py   (from the repo root)
Out:  demo/argus-demo.gif
"""
import os
from PIL import Image, ImageDraw, ImageFont

# ---- palette (Argus dark/cyan theme) -------------------------------------
BG      = (11, 18, 32)      # window background
BAR     = (17, 26, 43)      # title bar
FG      = (200, 211, 224)   # default text
DIM     = (91, 107, 127)    # muted
CYAN    = (45, 212, 240)    # accent / logo / cursor
GREEN   = (65, 209, 138)    # pass / confirmed
AMBER   = (242, 178, 75)    # working / P2
PINK    = (255, 107, 138)   # P0 / refuted
VIOLET  = (148, 122, 240)   # P1
WHITE   = (236, 242, 250)

W = 920
PAD_X = 30
BAR_H = 46
LINE_H = 28
TOP = BAR_H + 18

# ---- fonts ---------------------------------------------------------------
def load(size, bold=False):
    cands = [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\CascadiaMono.ttf",
    ]
    for c in cands:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

BODY  = load(19)
BODYB = load(19, bold=True)
CHROME = load(14)

# ---- the demo script -----------------------------------------------------
# Each output line: (indent, segments) where segments = [(text, color, bold?), ...]
CMD = "/customer-audit https://acme.app"

def seg(text, color=FG, bold=False):
    return (text, color, bold)

OUT = [
    [seg("")],
    [seg("   ARGUS", CYAN, True), seg("    6 surfaces - 18 controls - vision-verified", DIM)],
    [seg("")],
    [seg("  landing      ", FG), seg("[ok] clean", GREEN)],
    [seg("  signup       ", FG), seg("[!]  2 found", AMBER)],
    [seg("  dashboard    ", FG), seg("[!]  3 found", AMBER)],
    [seg("  settings     ", FG), seg("[!]  4 found", AMBER)],
    [seg("  billing      ", FG), seg("[!]  1 found", AMBER)],
    [seg("  mobile-web   ", FG), seg("[ok] clean", GREEN)],
    [seg("")],
    [seg("  adversarial verify   ", DIM), seg("11 claims -> ", FG), seg("8 confirmed", GREEN), seg(", ", FG), seg("3 refuted", PINK)],
    [seg("")],
    [seg("  RANKED FIX LIST", WHITE, True)],
    [seg("  P0  ", PINK, True),   seg("Save fails silently   ", FG), seg("settings.tsx:142  ", CYAN), seg("toggle renders, never persists", DIM)],
    [seg("  P1  ", VIOLET, True), seg("Total desyncs         ", FG), seg("cart.ts:88        ", CYAN), seg("updates one store, not both", DIM)],
    [seg("  P1  ", VIOLET, True), seg('"Sync failed" lies    ', FG), seg("api.ts:53         ", CYAN), seg("masks the real 401", DIM)],
    [seg("  P2  ", AMBER, True),  seg("Focus ring missing    ", FG), seg("Button.tsx:24     ", CYAN), seg("keyboard users get lost", DIM)],
    [seg("")],
    [seg("  -> /customer-audit fix", GREEN), seg("   applies the 8 confirmed fixes.", DIM)],
]
# The "eye" mark drawn (not a glyph) next to the ARGUS logo line, in content-row 1.
EYE_ROW = 1

H = TOP + (len(OUT) + 2) * LINE_H + 24

def draw_chrome(d):
    d.rectangle([0, 0, W, BAR_H], fill=BAR)
    for i, col in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        cx = 26 + i * 22
        d.ellipse([cx - 7, BAR_H // 2 - 7, cx + 7, BAR_H // 2 + 7], fill=col)
    title = "~/acme-app — claude code"
    tw = d.textlength(title, font=CHROME)
    d.text(((W - tw) / 2, BAR_H / 2 - 9), title, font=CHROME, fill=DIM)

def draw_segments(d, y, segments):
    x = PAD_X
    for text, color, bold in segments:
        f = BODYB if bold else BODY
        d.text((x, y), text, font=f, fill=color)
        x += d.textlength(text, font=f)

def frame(typed, n_out, cursor=True):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_chrome(d)
    # prompt line
    px = PAD_X
    d.text((px, TOP), "> ", font=BODYB, fill=CYAN)
    px += d.textlength("> ", font=BODYB)
    d.text((px, TOP), typed, font=BODY, fill=WHITE)
    px += d.textlength(typed, font=BODY)
    if cursor:
        d.rectangle([px + 1, TOP + 3, px + 11, TOP + 22], fill=CYAN)
    # output
    for i in range(min(n_out, len(OUT))):
        y = TOP + (i + 2) * LINE_H
        if i == EYE_ROW:  # draw the "all-seeing eye" mark (a shape, not a glyph)
            cy = y + 11
            cx = PAD_X + 8
            d.ellipse([cx - 9, cy - 6, cx + 9, cy + 6], outline=CYAN, width=2)
            d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=CYAN)
        draw_segments(d, y, OUT[i])
    return img

# ---- assemble frames -----------------------------------------------------
frames, durs = [], []

# 1) type the command
for i in range(len(CMD) + 1):
    frames.append(frame(CMD[:i], 0))
    durs.append(45)
# small blink before running
for _ in range(2):
    frames.append(frame(CMD, 0, cursor=True));  durs.append(180)
    frames.append(frame(CMD, 0, cursor=False)); durs.append(180)
# 2) reveal output line by line
for k in range(1, len(OUT) + 1):
    frames.append(frame(CMD, k, cursor=False))
    txt = "".join(s[0] for s in OUT[k - 1])
    durs.append(90 if txt.strip() == "" else 170)
# 3) hold the result
frames.append(frame(CMD, len(OUT), cursor=False)); durs.append(3200)

out_path = os.path.join(os.path.dirname(__file__), "argus-demo.gif")
frames[0].save(
    out_path, save_all=True, append_images=frames[1:],
    duration=durs, loop=0, optimize=True, disposal=2,
)
print("wrote", out_path, "frames:", len(frames), "size:", os.path.getsize(out_path) // 1024, "KB")
