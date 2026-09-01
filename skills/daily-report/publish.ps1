<#
  보고서 HTML → PDF 변환 → Google 공유드라이브 업로드. 일일·주간 공용.

  사용법:
    .\publish.ps1 -Html <채워진 보고서 html 경로> [-DataDir <경로>] [-PdfOnly]

  설정: $DataDir/report-config.json (기본 $DataDir = ~/.claude/chan-reports).
        없으면 daily-report / weekly-report 스킬이 첫 실행 때 물어서 만든다.
        업로드 경로는 rclone.parent + "/" + author 로 조립하고, 없으면 rclone mkdir 로 만든다.
        rclone.remote 나 rclone.parent 가 비면 PDF 만 만들고 업로드는 건너뛴다.

  파일명 규칙: {YYMMDD}-{문서종류}-{작성자} {직함}
    예) 260703-일일보고서-홍길동 주임.html / 260708-주간보고서-홍길동 주임.html

  업데이트 정책: 업로드 전 공유드라이브에서 **같은 날짜 + 같은 문서종류**의 기존 보고서를 먼저
  삭제한 뒤 새로 올린다 → 날짜·종류당 1건만 유지(중복 누적 방지).
  ⚠️ 날짜만으로 지우면 같은 날 일일·주간을 둘 다 올릴 때 서로를 지운다 — 그래서 종류까지 본다.

  이 파일은 반드시 UTF-8 BOM 으로 저장한다 (PowerShell 5.1 이 BOM 없으면 CP949 로 읽어 깨진다).
  ponytail: Edge 헤드리스로 PDF 뽑고 rclone copy 로 올리는 게 전부. 별도 PDF 라이브러리·데몬 없음.
#>
param(
  [Parameter(Mandatory=$true)][string]$Html,
  [string]$DataDir,
  [switch]$PdfOnly
)
$ErrorActionPreference = "Stop"

# 사용자 데이터는 플러그인 폴더가 아니라 홈에 둔다 — 플러그인은 갱신 때 통째로 교체되기 때문이다.
if (-not $DataDir) { $DataDir = Join-Path $HOME ".claude\chan-reports" }

# 설정 로드 — JSON 은 BOM 이 없어도 되지만 PS 5.1 은 -Encoding UTF8 을 줘야 한글이 안 깨진다.
$cfgPath = Join-Path $DataDir "report-config.json"
if (-not (Test-Path $cfgPath)) { throw "report-config.json 없음: $cfgPath (스킬 첫 실행 때 생성된다)" }
$cfg         = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$REMOTE      = "$($cfg.rclone.remote)".Trim()
$UPLOAD_HTML = [bool]$cfg.uploadHtml

# 업로드 폴더 = 공유 부모 폴더 / 본인 이름. 사람마다 자기 폴더를 쓰므로 서로 안 덮어쓴다.
# 폴더가 없으면 아래에서 만든다(rclone mkdir).
$author = "$($cfg.author)".Trim()
$parent = "$($cfg.rclone.parent)".Trim().Trim('/')
if ($author -match '[\\/:*?"<>|]') { throw "author 에 경로 문자가 들어 있다: $author" }
$DRIVE_FOLDER = if ($parent -and $author) { "$parent/$author" } else { "" }

# Edge 위치
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edge)) { throw "msedge.exe 를 찾을 수 없음." }

$Html = (Resolve-Path $Html).Path
if (-not (Test-Path $Html)) { throw "HTML 없음: $Html" }

# PDF 경로 = HTML 옆
$pdf = [System.IO.Path]::ChangeExtension($Html, ".pdf")

# Windows PowerShell 5.1 은 non-ASCII 인수를 native exe(msedge)로 넘길 때 mangle → 한글 경로면
# --print-to-pdf/입력 URI 가 무시되고 output.pdf 로 폴백된다. ASCII 임시 경로로 생성 후 최종 경로로 이동(cmdlet=Unicode-safe).
$tmpDir  = Join-Path ([System.IO.Path]::GetTempPath()) ("dr-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
$tmpHtml = Join-Path $tmpDir "report.html"
$tmpPdf  = Join-Path $tmpDir "report.pdf"
$udd     = Join-Path $tmpDir "udd"
Copy-Item $Html $tmpHtml -Force
$uri = "file:///" + $tmpHtml.Replace('\','/')

Write-Host "PDF 변환: $Html -> $pdf"
# 실행 중인 Edge 인스턴스에 attach 되면 headless 프린트 플래그가 무시되므로 전용 임시 user-data-dir 사용.
# ponytail: msedge 는 성공 메시지("N bytes written")도 stderr 로 쓴다. 호출자가 2>&1 로 잡으면
# PS 5.1 이 그걸 NativeCommandError 로 감싸고 $ErrorActionPreference='Stop' 이 치명 오류로 승격시켜
# **PDF 를 다 만들고 나서 죽는다.** 이 호출 동안만 Continue 로 낮춘다(성공 판정은 아래 파일 존재로 한다).
$eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
& $edge --headless --disable-gpu --no-first-run --no-pdf-header-footer "--user-data-dir=$udd" "--print-to-pdf=$tmpPdf" $uri | Out-Null
$ErrorActionPreference = $eap
# 헤드리스가 파일 쓸 때까지 잠깐 대기
$deadline = [DateTime]::Now.AddSeconds(30)
while (-not (Test-Path $tmpPdf) -and [DateTime]::Now -lt $deadline) { Start-Sleep -Milliseconds 300 }
if (-not (Test-Path $tmpPdf)) { Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue; throw "PDF 생성 실패." }
Move-Item $tmpPdf $pdf -Force
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

# 업로드 설정이 없으면 여기서 끝 (PDF 는 남는다)
if (-not $REMOTE -or -not $DRIVE_FOLDER) {
  Write-Host "업로드 대상 미설정 — PDF 만 생성했다: $pdf" -ForegroundColor Yellow
  return
}

# rclone 위치 (PATH 미반영 환경 대비 폴백)
$rclone = (Get-Command rclone -ErrorAction SilentlyContinue).Source
if (-not $rclone) {
  $rclone = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter rclone.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $rclone) { throw "rclone 을 찾을 수 없음. winget install Rclone.Rclone 후 셸 재시작." }

$dest = "${REMOTE}:${DRIVE_FOLDER}"

# 같은 날짜 + 같은 종류의 기존 보고서를 먼저 삭제(중복 누적 방지). 작성자 suffix 등 이름 변형에는
# 무관하게 정리하되 문서종류는 구분한다. rclone --include 는 암묵 exclude-all 을 붙이므로
# 매칭 파일만 지운다(폴더 통째 삭제 아님).
# ponytail: 삭제 실패는 무시해야 한다 — 첫 발행이면 대상 폴더가 아직 없어서 rclone 이 에러를 낸다.
# 그런데 PS 5.1 은 네이티브 stderr 를 NativeCommandError 로 감싸고 $ErrorActionPreference='Stop' 이
# 그걸 치명 오류로 승격시켜 **업로드에 못 가고 죽는다**. 이 블록만 Continue 로 낮춘다.
$base = [System.IO.Path]::GetFileNameWithoutExtension($pdf)   # 예: 260703-일일보고서-홍길동 주임
$m = [regex]::Match($base, '^(\d{6})-([^-]+)')
$eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
# 첫 발행이면 내 이름 폴더가 아직 없다 — 만들어 둔다(이미 있으면 무해).
Write-Host "폴더 확인/생성: $dest"
& $rclone mkdir $dest
if ($m.Success) {
  $prefix = $m.Groups[1].Value + "-" + $m.Groups[2].Value      # 예: 260703-일일보고서
  Write-Host "기존 동일날짜·동일종류 보고서 삭제: $dest ($prefix*)"
  & $rclone delete $dest --include "$prefix*"
} else {
  # 명명 규칙을 안 따르면 정확 base 만 삭제(안전 폴백)
  Write-Host "명명 규칙 불일치 — 정확 일치분만 삭제: $base.*"
  & $rclone delete $dest --include "$base.*"
}
$ErrorActionPreference = $eap

# ponytail: rclone 은 --progress 를 stderr 로 쓴다 — 위 삭제 블록과 같은 이유로 Continue 를 유지하고,
# 성공/실패 판정은 stderr 가 아니라 $LASTEXITCODE 로 한다(그래야 그 검사가 죽은 코드가 되지 않는다).
$eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
Write-Host "업로드: $pdf -> $dest"
& $rclone copy $pdf $dest --progress
$rc = $LASTEXITCODE
if ($rc -eq 0 -and $UPLOAD_HTML -and -not $PdfOnly) {
  Write-Host "업로드(HTML): $Html -> $dest"
  & $rclone copy $Html $dest
  $rc = $LASTEXITCODE
}
$ErrorActionPreference = $eap
if ($rc -ne 0) { throw "rclone 업로드 실패 (exit $rc). rclone config 확인." }

Write-Host "완료 -> $dest" -ForegroundColor Green
