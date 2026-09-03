# Focus Player updater release 준비

Focus Player는 Tauri v2 공식 updater와 GitHub Releases의 정적 `latest.json` 구조를 사용한다.

## Signing key

- Private key: `C:\Users\osyeo\.tauri\focus-player.key`
- Public key: `C:\Users\osyeo\.tauri\focus-player.key.pub`
- 앱 설정에는 public key 내용만 포함된다.
- private key를 잃으면 기존 설치본에 새 업데이트를 배포할 수 없으므로 별도 보안 백업이 필요하다.

현재 private key는 password 없이 생성됐다. GitHub Actions로 이전하기 전에 password가 설정된 운영용 키로 교체할 경우, 앱을 최초 배포하기 전에 수행해야 한다.

## 로컬 updater artifact build

PowerShell에서 private key 경로를 현재 프로세스 환경 변수로 설정한다.

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\Users\osyeo\.tauri\focus-player.key"
npm run build:app
```

`build:app`은 `tauri build --ci`를 사용하므로 대화형 password prompt를 열지 않는다. Tauri는 MSI와 NSIS installer 옆에 `.sig` 파일을 생성한다.

## GitHub Releases manifest 준비

GitHub repository와 release tag가 정해진 뒤 asset base URL을 환경 변수로 전달한다.

```powershell
$env:FOCUS_PLAYER_UPDATE_BASE_URL = "https://github.com/OWNER/REPO/releases/download/v0.1.1"
$env:FOCUS_PLAYER_RELEASE_NOTES = "Release notes"
npm run manifest:update
```

생성 파일은 `release/latest.json`이며 Git 추적 대상이 아니다. GitHub Release에는 NSIS installer, 해당 `.sig`, `latest.json`을 함께 올린다.

Repository URL이 확정되면 `src-tauri/tauri.conf.json`의 `plugins.updater.endpoints`에 다음 형식의 실제 HTTPS endpoint를 추가한다.

```json
[
  "https://github.com/OWNER/REPO/releases/latest/download/latest.json"
]
```

`.env` 파일은 Tauri signing에 사용되지 않는다. GitHub Actions에서는 private key와 선택적 password를 repository secret으로 저장하고 각각 `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 환경 변수로 전달한다.
