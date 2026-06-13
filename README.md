# ⚡ 전자회로 CBT — 아두이노 시험대비 웹앱

가천대 의공학과 **전자회로(아두이노)** 클로즈드북 시험 대비용 CBT(Computer-Based Test) + 공부 웹사이트.
강의 슬라이드(`전자회로_14W.pdf`)와 교수님 복습강의 녹취를 정리한 PDF에서 **209문항 · 14개 학습 섹션 · 59장 플래시카드**를 자동 생성했습니다.

> ⭐ = 교수님이 사실상 출제 예고한 부분 · 🎤 = 복습강의에서 구두로 강조한 부분

## 기능

| 메뉴 | 설명 |
|---|---|
| **홈** | D-day 카운트다운, 학습 현황, 토픽별 정답률, 연속 학습일(스트릭) |
| **공부** | 16개 섹션 전 범위 노트(표·코드·⭐🎤⚠️ 콜아웃), 목차 검색, 학습 완료 체크 |
| **CBT 시험** | 연습(즉시 채점·해설) / 실전(타이머·일괄 채점), 범위·유형·난이도·⭐만 필터, 보기 셔플, 검토 표시, 결과 리포트 |
| **오답노트** | 틀린 문제만 토픽별로 모아 다시 풀기 |
| **플래시카드** | Leitner 간격 반복(5단계 상자), 카드 뒤집기 애니메이션 |
| **7세그 시뮬 ⭐** | 세그먼트를 직접 켜고 끄며 0~9·A~F 패턴 만들기. 공통 음극/양극 전환, 2진·16진 제어값 실시간 표시. (교수님 출제 예고 구간) |
| **통계** | 전체/유형별/토픽별 정답률, 시험 기록, 암기 완료 카드 수 |

- 다크/라이트 테마, 모바일 반응형, 키보드 단축키(시험 중 `1~5` 보기 선택, `←/→` 이동, `F` 검토표시)
- 모든 진행 상황은 브라우저 `localStorage`에 저장됩니다. (서버·로그인 불필요)

## 실행 방법

빌드 과정이 없습니다. 둘 중 하나면 됩니다.

```bash
# 1) 정적 서버로 열기 (권장)
./serve.sh            # → http://localhost:8731
# 또는
python3 -m http.server 8731
```

```bash
# 2) 그냥 파일로 열기
open index.html       # 대부분의 기능이 file:// 에서도 동작
```

브라우저에서 `http://localhost:8731` 접속.

## 배포 (Vercel)

빌드가 없는 순수 정적 사이트라 Vercel에 그대로 올라갑니다. Framework Preset은 **Other**, 빌드 명령·Output 디렉터리는 비워두면 됩니다(루트의 `index.html`을 그대로 서빙).

```bash
# 방법 A — Vercel CLI (가장 빠름)
npm i -g vercel
vercel          # 미리보기 배포
vercel --prod   # 프로덕션 배포

# 방법 B — GitHub 연동
#  1) 이 저장소를 GitHub에 push
#  2) vercel.com → New Project → 저장소 Import → Deploy
```

`vercel.json`은 빌드 설정 없이 캐시 헤더만 지정합니다(데이터는 항상 최신, JS/CSS는 1시간 캐시).

## 구조

```
index.html              앱 셸 + 스크립트 로드
css/styles.css          디자인 시스템(테마·반응형)
js/store.js             localStorage 상태(진행도·오답·플래시카드·스트릭)
js/sevenseg-data.js     7세그먼트 패턴표(검증된 비트값)
js/app.js               라우터 + 전체 화면(홈/공부/시험/오답/카드/7세그/통계)
data/questions.js       문제은행 (window.QUESTIONS, 209문항)
data/notes.js           학습 노트 (window.NOTES, 14섹션)
data/flashcards.js      플래시카드 (window.FLASHCARDS, 59장)
build/assemble.py       생성 JSON → data/*.js 조립 스크립트
```

## 문제 데이터 다시 만들기

`build/assemble.py`는 `/tmp/cbt_build/`의 섹션별 JSON(`section-NN.json`, `flashcards.json`, `essays.json`)을 읽어
검증·중복 제거·토픽 정규화 후 `data/*.js`를 생성합니다.

```bash
python3 build/assemble.py
```

## 출처

- 강의 슬라이드: `전자회로_14W.pdf` (49쪽, 가천대 의공학과)
- 교수님 시험 직전 복습강의 녹취 2편 (총 약 80분)
- 위 자료를 정리한 `전자회로 시험대비 총정리.pdf`

문제·해설은 위 자료 범위 내에서 생성·교차검증했습니다. 실제 시험과 다를 수 있으니 학습 보조용으로 사용하세요.
