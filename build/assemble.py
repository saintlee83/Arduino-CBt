#!/usr/bin/env python3
"""Assemble generated section/flashcard/essay JSON into the site's data/*.js files."""
import json, os, re, glob, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# prefer the in-repo vendored sources; fall back to the scratch build dir
BUILD = os.path.join(HERE, "sections")
if not os.path.isdir(BUILD) or not glob.glob(os.path.join(BUILD, "section-*.json")):
    BUILD = "/tmp/cbt_build"
OUT = os.path.join(ROOT, "data")
os.makedirs(OUT, exist_ok=True)

VALID_TOPICS = {"pin","pwm","digin","debounce","rgb","adc","sensor","serial","map",
                "dcmotor","power","servo","stepper","sevenseg","종합"}

# map stray descriptive labels -> canonical topic keys
LABEL_MAP = {
    "7세그먼트":"sevenseg","fnd":"sevenseg","adc":"adc","아날로그":"adc",
    "h-브리지":"dcmotor","h브리지":"dcmotor","dc모터":"dcmotor","dc모터h브리지":"dcmotor","l293d":"dcmotor","l298":"dcmotor","모터":"dcmotor",
    "pwm":"pwm","rgbled":"rgb","rgb":"rgb","map":"map","mapconstrain":"map","constrain":"map",
    "디바운싱":"debounce","바운싱":"debounce","디지털입력":"digin","풀업풀다운":"digin","풀업":"digin","풀다운":"digin",
    "서보모터":"servo","서보":"servo","스테핑모터":"stepper","스테핑":"stepper","전원설계":"power","전원":"power","레귤레이터":"power",
    "센서":"sensor","가변저항":"sensor","전압분배":"sensor","시리얼":"serial","핀선언":"pin","핀번호선언":"pin",
}

def norm(s):
    return re.sub(r"[\s.,/()·~\-—:;'\"%]", "", str(s or "").lower())

def canon_topic(t, fallback="종합"):
    if t in VALID_TOPICS: return t
    m = LABEL_MAP.get(norm(t))
    if m: return m
    return fallback if fallback in VALID_TOPICS else "종합"

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"  ! 읽기 실패 {os.path.basename(path)}: {e}")
        return None

def valid_q(q):
    if not isinstance(q, dict): return False
    if not q.get("question") or not q.get("type"): return False
    t = q["type"]
    if t == "mc":
        ch = q.get("choices"); ai = q.get("answerIndex")
        return isinstance(ch, list) and len(ch) >= 2 and isinstance(ai, int) and 0 <= ai < len(ch)
    if t == "ox":
        ai = q.get("answerIndex")
        if not isinstance(ai, int) or ai not in (0, 1): return False
        if not q.get("choices"): q["choices"] = ["O (맞다)", "X (틀리다)"]
        return True
    if t == "short":
        return bool(q.get("answerText"))
    return False

# ---- questions + notes from sections ----
questions, notes = [], []
seen_q = set()
dups = 0
sec_files = sorted(glob.glob(os.path.join(BUILD, "section-*.json")))
print(f"섹션 파일 {len(sec_files)}개 처리")
for path in sec_files:
    d = load(path)
    if not d: continue
    sec = d.get("section")
    topic = d.get("topic", "")
    nb = d.get("notesBlocks", [])
    if nb:  # questions-only section files don't create an empty study section
        notes.append({"section": sec, "title": d.get("title",""), "pages": d.get("pages",""),
                      "topic": topic, "notesBlocks": nb})
    kept = 0
    for q in d.get("questions", []):
        q.setdefault("topic", topic)
        q.setdefault("section", sec)
        q.setdefault("difficulty", 2)
        q.setdefault("starred", False)
        q["topic"] = canon_topic(q.get("topic"), fallback=topic if topic in VALID_TOPICS else "종합")
        if not valid_q(q):
            print(f"  - 무효 문항 건너뜀 (sec {sec}): {str(q.get('question'))[:40]}")
            continue
        key = norm(q["question"])
        if key in seen_q: dups += 1; continue
        seen_q.add(key)
        # keep only fields the app uses
        clean = {k: q[k] for k in ("id","section","topic","type","difficulty","starred",
                 "question","choices","answerIndex","answerText","acceptable","explanation","source") if k in q}
        questions.append(clean)
        kept += 1
    print(f"  §{sec:<2} {d.get('title','')[:24]:24}  문항 {kept:2d}  노트블록 {len(nb)}")

# ---- essays (short) ----
ess = load(os.path.join(BUILD, "essays.json")) or []
ess_kept = 0
for q in ess:
    q.setdefault("type", "short"); q.setdefault("topic", "종합"); q.setdefault("section", 16)
    q.setdefault("difficulty", 3); q.setdefault("starred", False); q.setdefault("acceptable", [])
    q["topic"] = canon_topic(q.get("topic"))
    if not valid_q(q): continue
    key = norm(q["question"])
    if key in seen_q: continue
    seen_q.add(key)
    clean = {k: q[k] for k in ("id","section","topic","type","difficulty","starred",
             "question","answerText","acceptable","explanation","source") if k in q}
    questions.append(clean); ess_kept += 1
print(f"서술형(essays) {ess_kept}개 추가")

# ---- flashcards ----
fc = load(os.path.join(BUILD, "flashcards.json")) or []
flashcards = []
fseen = set()
for c in fc:
    if not isinstance(c, dict) or not c.get("front") or not c.get("back"): continue
    k = norm(c["front"])
    if k in fseen: continue
    fseen.add(k)
    c.setdefault("topic","종합"); c.setdefault("starred", False)
    c["topic"] = canon_topic(c.get("topic"))
    flashcards.append({k2: c[k2] for k2 in ("id","front","back","topic","starred") if k2 in c})

# ---- assign stable unique ids ----
for i, q in enumerate(questions):
    if not q.get("id"): q["id"] = f"q{i:03d}"
ids = {}
for q in questions:
    if q["id"] in ids:
        q["id"] = q["id"] + f"-{ids[q['id']]}"
        ids[q["id"]] = ids.get(q["id"], 0)
    ids[q["id"]] = ids.get(q["id"], 0) + 1
for i, c in enumerate(flashcards):
    if not c.get("id"): c["id"] = f"fc{i:03d}"

# ---- write ----
notes.sort(key=lambda n: n["section"] or 0)
def dump(name, var, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(f"window.{var} = ")
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

dump("questions.js", "QUESTIONS", questions)
dump("notes.js", "NOTES", notes)
dump("flashcards.js", "FLASHCARDS", flashcards)

# ---- summary ----
from collections import Counter
by_topic = Counter(q["topic"] for q in questions)
by_type = Counter(q["type"] for q in questions)
by_diff = Counter(q.get("difficulty",2) for q in questions)
starred = sum(1 for q in questions if q.get("starred"))
print("\n" + "="*46)
print(f"문항 총 {len(questions)}개  (중복 제거 {dups})  ⭐{starred}")
print(f"유형: {dict(by_type)}")
print(f"난이도: {dict(sorted(by_diff.items()))}")
print(f"플래시카드 {len(flashcards)}개 · 노트 {len(notes)}섹션")
print("토픽별:", {k: by_topic[k] for k in sorted(by_topic)})
print("="*46)
print("출력:", OUT)
