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

## GitHub Releases URL 규칙

- Repository: `https://github.com/ocean0179/Focus-Player`
- Tag: package version `0.1.2` → `v0.1.2`
- Release asset base URL: `https://github.com/ocean0179/Focus-Player/releases/download/v0.1.2`
- Latest manifest endpoint: `https://github.com/ocean0179/Focus-Player/releases/latest/download/latest.json`

Repository owner/name은 `scripts/release-config.js`에서 한 번만 관리한다.

## GitHub Releases manifest 준비

기본 URL은 package version과 repository 설정으로 자동 계산된다.

```powershell
$env:FOCUS_PLAYER_RELEASE_NOTES = "Release notes"
npm run manifest:update
```

다른 public hosting을 사용할 때만 다음 환경 변수로 기본 URL을 덮어쓴다.

```powershell
$env:FOCUS_PLAYER_UPDATE_BASE_URL = "https://downloads.example.com/focus-player/v0.1.1"
npm run manifest:update
```

생성 파일은 `release/latest.json`이며 Git 추적 대상이 아니다. GitHub Release에는 NSIS installer, 해당 `.sig`, `latest.json`을 함께 올린다.

GitHub repository가 public으로 전환되어 `src-tauri/tauri.conf.json`에 다음 고정 endpoint를 연결했다.

```json
[
  "https://github.com/ocean0179/Focus-Player/releases/latest/download/latest.json"
]
```

이 endpoint는 GitHub의 최신 non-draft, non-prerelease Release에 업로드된 `latest.json`으로 연결된다. Updater가 실제로 가져오는 파일은 `latest.json`과 manifest가 가리키는 NSIS installer다. `.sig` 내용은 manifest 안에 포함되므로 updater가 별도 `.sig` URL을 요청하지 않는다. standalone `.sig`는 release 검증과 자동화 입력을 위해 함께 보관한다. MSI는 수동 설치 대안이며 현재 manifest는 NSIS만 가리킨다.

`.env` 파일은 Tauri signing에 사용되지 않는다. GitHub Actions에서는 private key와 선택적 password를 repository secret으로 저장하고 각각 `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 환경 변수로 전달한다.
