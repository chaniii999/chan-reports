# chan-reports

매일·매주 쓰는 업무 보고서를 **카드형 HTML** 로 만들어 Artifact 로 발행하고, PDF 로 변환해 공유드라이브에 올린다.

만든 사람: **박성찬** · `psc070070@gmail.com` · [github.com/chaniii999](https://github.com/chaniii999)

| 스킬 | 하는 일 |
| --- | --- |
| `daily-report` | 그날 한 일을 카드로. 커밋 직후 자동 갱신 |
| `weekly-report` | 정기회의 5분 발표용. 카테고리 3~4개 + 진행률 + 데모뷰 + 타임라인 |

**이름을 외울 필요 없다** — 그냥 *"일일보고서 써줘"*, *"이번 주 보고서"* 라고 하면 된다.
(플러그인으로 설치하면 이름 앞에 `chan-reports:` 가 붙는다.)

## 설치

### 먼저 — `.claude` 폴더가 두 군데 있다

이름이 같아서 제일 많이 헷갈리는 지점이다. **둘은 다른 폴더다.**

| 어디 | 실제 경로 (예) | 언제 뜨나 |
| --- | --- | --- |
| 프로젝트 | `C:\dev\내프로젝트\.claude\skills\` | **그 프로젝트를 열었을 때만** |
| **홈 (사용자)** | **`C:\Users\내계정\.claude\skills\`** | **모든 프로젝트에서** |

보고서는 프로젝트랑 상관없는 개인 도구니까 **홈 쪽**에 넣는다.
문서에 `~/.claude/` 라고 쓰인 건 전부 이 홈 폴더를 말한다 — `~` 는 홈 디렉터리 줄임말이다.

- Windows → `C:\Users\<내계정>\.claude\` (PowerShell 에선 `$HOME\.claude\`)
- macOS/Linux → `/Users/<내계정>/.claude/` · `/home/<내계정>/.claude/`

`.claude` 폴더 자체는 이미 있다(설정·플러그인이 거기 산다). `skills` 하위 폴더만 없을 수 있는데, 아래 명령이 만들어 준다.

### 방법 ① 폴더 복사 — 제일 간단

이 저장소의 `skills` 안에 있는 **폴더 두 개를** 홈 `.claude\skills\` 에 넣으면 끝이다. 탐색기로 끌어다 놔도 된다.

```powershell
# Windows (PowerShell)
New-Item -ItemType Directory "$HOME\.claude\skills" -Force
Copy-Item '<이 저장소를 받은 경로>\skills\*' "$HOME\.claude\skills\" -Recurse
```

```bash
# macOS / Linux
mkdir -p ~/.claude/skills
cp -r <이 저장소를 받은 경로>/skills/* ~/.claude/skills/
```

넣고 나면 이렇게 돼 있어야 한다:

```text
C:\Users\<내계정>\.claude\skills\
  daily-report\    SKILL.md · frame.html · publish.ps1 · CHANGELOG.md
  weekly-report\   SKILL.md · frame.html · CHANGELOG.md
```

⚠️ **두 폴더를 같이** 넣는다 — 주간 보고서가 일일 폴더의 `publish.ps1` 을 쓴다.
⚠️ `skills` **안의 폴더들**을 넣는 거지 `skills` 폴더째로 넣는 게 아니다(`skills\skills\...` 가 되면 안 뜬다).

→ 호출은 `/daily-report` · `/weekly-report`.

### 방법 ② 플러그인 — 업데이트를 받고 싶으면

Claude Code 안에서 두 줄 치면 된다(터미널이 아니라 **Claude Code 프롬프트**에 입력).

```text
/plugin marketplace add <git URL 또는 이 저장소 폴더 경로>
/plugin install chan-reports@chan-reports
```

→ 호출은 `/chan-reports:daily-report`. 고쳐지면 `git pull` → `/plugin update` 로 따라온다.

### 됐는지 확인

**새 세션을 하나 연다**(기존 세션은 시작할 때 목록을 읽어서 안 보인다). 그다음 아무 프로젝트에서나:

> 일일보고서 써줘

스킬이 잡히면 **이름과 직함을 묻는 것**이 첫 반응이다. 그게 나오면 설치 성공이다.
`/` 만 쳐서 목록에 `daily-report` 가 있는지 봐도 된다.

| 안 뜬다면 | 확인 |
| --- | --- |
| 목록에 아예 없다 | **새 세션**을 열었는지 / 경로가 `C:\Users\...\.claude\skills\daily-report\SKILL.md` 가 맞는지 |
| `skills\skills\` 로 들어갔다 | `skills` **안의 두 폴더**만 옮긴다 |
| 프로젝트에서만 뜬다 | 프로젝트 `.claude\skills\` 에 넣은 것 — 홈 쪽으로 옮긴다 |
| 이름이 두 번 뜬다 | 프로젝트와 홈 양쪽에 있다 — 프로젝트 쪽을 지운다 |

두 방법 다 **모든 프로젝트에서** 동작한다. 차이는 호출 이름에 `chan-reports:` 가 붙느냐와, 업데이트를 명령으로 받느냐 폴더를 다시 복사하느냐뿐이다.

## 처음 쓸 때 — 아무것도 미리 안 해도 된다

설정 파일을 미리 만들 필요 없다. **그냥 "일일보고서 써줘" 라고 하면 된다.**

첫 실행이면 이렇게 묻는다:

> 보고서에 쓸 **이름**과 **직함**을 알려주세요 (예: `홍길동 / 주임`).
> PDF 를 공유드라이브에도 올리시려면 rclone remote 이름과 폴더 경로도요 — 안 쓰시면 "없음".

답만 하면 설정 파일이 만들어지고 **그다음부터는 안 묻는다.**

```jsonc
// C:\Users\<내계정>\.claude\chan-reports\report-config.json
// (스킬이 만든다 — 손으로 만들 필요 없다. 나중에 이름이 바뀌면 여기만 고치면 된다)
{
  "author": "홍길동",        // 보고서 작성자 · 파일명 · 드라이브 내 내 폴더 이름
  "authorTitle": "주임",     // 직함 (헤더·파일명에만)
  "org": "우리팀",         // 보고서 맨 아래 푸터
  "rclone": {
    "remote": "gdrive",           // rclone 에 등록한 드라이브 이름
    "parent": "보고서/일일"     // 팀이 같이 쓰는 상위 폴더
  },
  "uploadHtml": false        // true 면 PDF 말고 HTML 도 같이 올린다
}
```

### 드라이브를 안 쓸 거면

`rclone` 칸을 비워 두거나, 물었을 때 **"없음"** 이라고 답하면 된다.
보고서 작성 · Artifact 발행 · PDF 생성까지는 **그대로 다 되고** 업로드만 건너뛴다.

### 드라이브를 쓸 거면 — 연결도 물어보면 안내한다

*"드라이브도 연결해줘"* 라고 하면 스킬이 순서대로 이끈다:
설치됐는지 확인 → `rclone config` 입력 순서 알려줌 → 연결됐는지 검증 →
드라이브 최상위 폴더 목록을 보여주고 **어디에 넣을지 고르게** → **내 이름 폴더 생성**.

업로드 위치는 이렇게 정해진다 — **경로를 직접 적을 일이 없다.**

```text
parent "보고서/일일"  +  author "홍길동"
   → gdrive:보고서/일일/홍길동      (첫 발행 때 자동으로 만들어진다)
```

팀이 같은 상위 폴더를 써도 **각자 자기 이름 폴더**에 쌓이므로 서로 덮어쓰지 않는다.

## 내 데이터는 어디에 쌓이나

```text
C:\Users\<내계정>\.claude\chan-reports\
  report-config.json   내 이름·직함·업로드 설정
  artifact-urls.md     발행한 보고서 링크 목록 (주간 보고서가 여기서 일일 링크를 찾는다)
  reports\             만들어진 HTML·PDF 보관
```

**스킬 폴더가 아니라 여기에 둔다.** 스킬을 지우거나 새 버전으로 덮어써도 내 보고서와 설정은 남는다.

## 이건 알아 두면 좋다

- 보고서 **작성과 Artifact 발행은 어디서나** 된다 (Windows · macOS · Linux).
- **PDF 변환과 드라이브 업로드만 Windows 전용**이다 — PowerShell + Microsoft Edge + [rclone](https://rclone.org) 을 쓴다.
  macOS/Linux 에서는 그 단계만 조용히 건너뛴다(에러 아님).
- 보고서 HTML 은 **파일 하나로 완결**돼 있다(CSS·스크립트 내장, 외부 링크 0). 그냥 보내도 그대로 열린다.

---

## 구조 (고치려는 사람만 보면 된다)

```text
chan-reports/
  .claude-plugin/plugin.json · marketplace.json   ← 플러그인 설치용. 폴더 복사 방식이면 안 써도 된다
  skills/daily-report/    SKILL.md · frame.html · CHANGELOG.md · publish.ps1
  skills/weekly-report/   SKILL.md · frame.html · CHANGELOG.md
```

`publish.ps1` 은 **일일 스킬 폴더 안에** 둔다 — 그래야 스킬 폴더만 복사해도 PDF·업로드가 따라온다.
주간은 `../daily-report/publish.ps1` 을 쓰고, 없으면 업로드만 건너뛴다.

`frame.html` 은 인라인 CSS/JS 만 쓰는 **self-contained** 골격이다(외부 리소스 0 — Artifact CSP 준수).
디자인은 프레임이 고정하므로 내용만 채우면 매번 같은 보고서가 나온다.

## 업로드가 안 될 때

(스킬이 목록에 안 뜨는 문제는 위 **설치 → 됐는지 확인** 표를 본다.)

| 증상 | 원인·처방 |
| --- | --- |
| `rclone 을 찾을 수 없음` | 설치 후 **터미널 재시작**(winget 이 추가한 PATH 는 새 세션부터 보인다) |
| `rclone 업로드 실패` | `rclone lsd <remote>:` 가 되는지 확인 → 안 되면 `rclone config` 재실행 |
| 드라이브에 팀 폴더가 안 보인다 | `rclone config` 에서 **Shared Drive? → y** 를 골랐는지 확인(개인 드라이브로 붙으면 안 보인다) |
| 내 폴더가 안 생긴다 | `rclone lsd "<remote>:<parent>"` 로 **부모 폴더**부터 실재 확인 |
| `PDF 생성 실패` | Edge 설치 확인(`%ProgramFiles(x86)%` · `%ProgramFiles%` 두 경로를 시도한다) |
| HTML 도 올리고 싶다 | `"uploadHtml": true` (기본은 PDF 만) |

### PowerShell 5.1 함정 4종 (이미 반영됨 — 스크립트를 손볼 때 참고)

- **한글 mojibake**: `.ps1` 은 반드시 **UTF-8 BOM**. 없으면 PS 5.1 이 CP949 로 읽어 한글이 깨지고 **인접 구문까지 손상돼 스크립트가 실패**한다.
- **Edge 경로 문법**: `${env:ProgramFiles(x86)}` 로 감싸야 한다(`$env:ProgramFiles(x86)` 는 잘못된 문법).
- **한글 경로 PDF**: non-ASCII 인수를 native exe 로 넘길 때 mangle 된다 → ASCII 임시 경로에 만들고 최종 경로로 이동한다.
- **네이티브 stderr 승격**: `msedge` 도 `rclone` 도 **성공 메시지·진행률을 stderr 로** 쓴다. 호출자가 `2>&1` 로 잡으면 `NativeCommandError` 로 감싸이고 `$ErrorActionPreference='Stop'` 이 치명 오류로 승격시켜 **일이 다 끝난 뒤에 죽는다.** 세 지점(Edge·rclone delete·rclone copy)만 `Continue` 로 낮추고, 성공 판정은 **파일 존재와 `$LASTEXITCODE`** 로 한다.
