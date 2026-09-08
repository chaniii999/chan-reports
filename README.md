# chan-reports

매일·매주 쓰는 업무 보고서를 **카드형 HTML** 로 만들어 Artifact 로 발행하고, PDF 로 변환해 공유드라이브에 올린다.

| 스킬 | 하는 일 |
| --- | --- |
| `daily-report` | 그날 한 일을 카드로. **커밋하면 그 작업이 자동으로 카드로 추가**된다 |
| `weekly-report` | 정기회의 5분 발표용. 카테고리 3~4개 + 진행률 + 데모뷰 + 타임라인 |

**이름을 외울 필요 없다** — 그냥 *"일일보고서 써줘"*, *"이번 주 보고서"* 라고 하면 된다.
`/daily-report` · `/weekly-report` 도 있다.

만든 사람: **박성찬** · `psc070070@gmail.com` · [github.com/chaniii999](https://github.com/chaniii999)

## 설치

터미널에 두 줄. 파일을 옮기거나 경로를 맞출 일이 없다.

```bash
claude plugin marketplace add https://github.com/chaniii999/chan-reports
claude plugin install chan-reports@chan-reports
```

- **모든 프로젝트에서** 뜨고, **VSCode 확장에서도** 뜬다.
- 설치 후 **새 세션**을 열어야 잡힌다. VSCode 확장에서 안 잡히면 `Ctrl+Shift+P → Developer: Reload Window`.
- 확인: `claude plugin list` → `chan-reports@chan-reports  Status: ✔ enabled`
- 업데이트: `claude plugin update chan-reports@chan-reports` / 제거: `... uninstall ...`

> `/plugin` 슬래시 명령은 환경에 따라 없다(VSCode 확장에는 없다). **터미널에서 `claude plugin`** 을 쓰면 어느 환경이든 된다.

## 처음 쓸 때

미리 만들 파일도, 설정할 것도 없다. 새 세션에서 **"일일보고서 써줘"** 라고 하면 된다.

첫 실행이면 이름·직함을 한 번 묻고, 답하면 설정이 저장돼 **그다음부터는 안 묻는다.**
스킬이 이름과 직함을 물어보는 것이 곧 설치 성공 신호다.

**드라이브를 안 쓸 거면** 물어볼 때 `없음` 이라고 답하면 된다 — 보고서 작성 · Artifact 발행 · PDF 생성까지 그대로 다 되고 업로드만 건너뛴다.

**드라이브를 쓸 거면** *"드라이브도 연결해줘"* 라고 하면 스킬이 설치 확인 → 연결 → 폴더 선택까지 순서대로 이끈다. 업로드 경로는 `부모 폴더 / 내 이름` 으로 자동 조립되므로 **경로를 직접 적을 일이 없다** — 팀이 같은 부모 폴더를 써도 각자 자기 이름 폴더에 쌓여 안 겹친다.

## 내 데이터는 어디에 쌓이나

```text
~/.claude/chan-reports/          (Windows: C:\Users\<내계정>\.claude\chan-reports\)
  report-config.json   내 이름·직함·업로드 설정
  artifact-urls.md     발행한 보고서 링크 목록 (주간이 여기서 일일 링크를 찾는다)
  reports/             만들어진 HTML·PDF 보관
```

**스킬 폴더가 아니라 여기에 둔다** — 스킬을 지우거나 새 버전으로 덮어써도 내 보고서와 설정은 남는다.

## 알아 두면 좋은 것

- 보고서 **작성과 Artifact 발행은 어디서나** 된다(Windows · macOS · Linux).
- **PDF 변환과 드라이브 업로드만 Windows 전용**이다 — PowerShell + Microsoft Edge + [rclone](https://rclone.org). 다른 OS 에서는 그 단계만 조용히 건너뛴다(에러 아님).
- 보고서 HTML 은 **파일 하나로 완결**돼 있다(CSS·스크립트 내장, 외부 링크 0). 그냥 보내도 그대로 열린다.
- 상시 컨텍스트 비용은 **약 500 토큰**이고, 스킬 본문은 실제로 부를 때만 읽힌다.
- `/` 메뉴에 **스킬은 안 나열될 수 있다**(VSCode 확장). **목록에 없다는 것만으로 설치 실패로 판단하지 말 것** — 말로 불러서 되면 정상이다.

## 안 될 때

| 증상 | 확인 |
| --- | --- |
| 말로 불러도 안 잡힌다 | **새 세션**을 열었는지 / VSCode 확장이면 `Developer: Reload Window` |
| `claude plugin list` 에 없다 | 설치 두 줄을 다시 실행 |
| 이름이 두 번 뜬다 | 플러그인과 수동 복사가 겹친 것 — 하나만 남긴다 |
| `rclone 을 찾을 수 없음` | 설치 후 **터미널 재시작**(winget 이 추가한 PATH 는 새 세션부터 보인다) |
| 드라이브에 팀 폴더가 안 보인다 | `rclone config` 에서 **Shared Drive? → y** 를 골랐는지(개인 드라이브로 붙으면 안 보인다) |
| `PDF 생성 실패` | Edge 설치 확인 |
| HTML 도 올리고 싶다 | 설정에 `"uploadHtml": true` (기본은 PDF 만) |

---

<details>
<summary><b>고치려는 사람만 — 구조 · 수동 설치 · 알려진 함정</b></summary>

### 구조

```text
chan-reports/
  .claude-plugin/plugin.json · marketplace.json   ← 플러그인 설치용
  skills/daily-report/    SKILL.md · frame.html · CHANGELOG.md · publish.ps1
  skills/weekly-report/   SKILL.md · frame.html · CHANGELOG.md
  commands/               daily-report.md · weekly-report.md   ← / 메뉴용 얇은 래퍼
```

`commands/` 는 스킬을 호출하는 두 줄짜리 래퍼다. **기능이 여기 있지는 않다** — VSCode 확장의 `/` 메뉴가 스킬을 안 나열하고 명령만 나열하기 때문에 발견성 때문에 둔 것이다.

`publish.ps1` 은 **일일 스킬 폴더 안에** 둔다 — 그래야 스킬 폴더만 복사해도 PDF·업로드가 따라온다. 주간은 `../daily-report/publish.ps1` 을 쓰고, 없으면 업로드만 건너뛴다.

`frame.html` 은 인라인 CSS/JS 만 쓰는 **self-contained** 골격이다(외부 리소스 0 — Artifact CSP 준수). 디자인은 프레임이 고정하므로 내용만 채우면 매번 같은 보고서가 나온다.

### 수동 설치 (git·CLI 를 못 쓸 때)

zip 으로 받아 **홈** `.claude` 아래 두 폴더를 넣는다. 프로젝트 `.claude` 가 아니다 — 홈 쪽에 넣어야 모든 프로젝트에서 뜬다.

```powershell
# Windows (PowerShell)
New-Item -ItemType Directory "$HOME\.claude\skills","$HOME\.claude\commands" -Force
Copy-Item '<받은 경로>\skills\*'   "$HOME\.claude\skills\"   -Recurse -Force
Copy-Item '<받은 경로>\commands\*' "$HOME\.claude\commands\" -Force
```

```bash
# macOS / Linux
mkdir -p ~/.claude/skills ~/.claude/commands
cp -r <받은 경로>/skills/*   ~/.claude/skills/
cp    <받은 경로>/commands/* ~/.claude/commands/
```

- `skills` **안의 폴더 두 개**를 넣는 것이다. `skills` 폴더째로 넣으면(`skills\skills\…`) 안 뜬다.
- **두 폴더를 같이** 넣는다 — 주간 보고서가 일일 폴더의 `publish.ps1` 을 쓴다.
- 플러그인 설치와 **겹쳐 넣지 않는다** — 같은 스킬이 두 번 등록된다.
- 걷어낼 때 그 폴더에 `.git` 이 있으면 pack 파일이 읽기전용이라 `Remove-Item -Recurse` 가 실패한다 → `cmd /c rmdir /s /q "<경로>"`.

### 안 되는 형태 — `~/.claude/skills/` 아래 통째로 클론

`git clone <url> ~/.claude/skills/chan-reports` 는 터미널 CLI 에서 `chan-reports@skills-dir` 로 자동 로드되지만 **VSCode 확장은 이 형태를 읽지 않는다**(실측 2026-09-01). 확장 버전이 낮아서가 아니라 표면별 지원 차이다. 플러그인 설치를 쓰면 이 차이가 사라진다.

### PowerShell 5.1 함정 4종 (이미 반영됨 — `publish.ps1` 을 손볼 때 참고)

- **한글 mojibake**: `.ps1` 은 반드시 **UTF-8 BOM**. 없으면 PS 5.1 이 CP949 로 읽어 한글이 깨지고 **인접 구문까지 손상돼 스크립트가 실패**한다.
- **Edge 경로 문법**: `${env:ProgramFiles(x86)}` 로 감싸야 한다(`$env:ProgramFiles(x86)` 는 잘못된 문법).
- **한글 경로 PDF**: non-ASCII 인수를 native exe 로 넘기면 mangle 된다 → ASCII 임시 경로에 만들고 최종 경로로 이동한다.
- **네이티브 stderr 승격**: `msedge` 도 `rclone` 도 성공 메시지·진행률을 **stderr 로** 쓴다. 호출자가 `2>&1` 로 잡으면 `NativeCommandError` 로 감싸이고 `$ErrorActionPreference='Stop'` 이 치명 오류로 승격시켜 **일이 다 끝난 뒤에 죽는다.** 세 지점(Edge·rclone delete·rclone copy)만 `Continue` 로 낮추고, 성공 판정은 **파일 존재와 `$LASTEXITCODE`** 로 한다.

</details>
