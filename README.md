# Q-Safe Monitor v0.1.0

QSF104 시리즈(FW V7.8 이상) 방사능 측정기를 휴대폰과 블루투스로 연결하는 웹앱입니다. 설치 없이 주소만 열면 됩니다.

- 실시간 선량률·CPM·배터리 표시, 웹 전용 알람(주의 0.50 · 위험 1.00 µSv/h 기본)
- 추이 그래프·통계, 기록 저장(휴대폰 브라우저 안), CSV·GPX·KML·GeoJSON 내보내기
- GPS 지도(OpenStreetMap)에 선량률을 색 점으로 표시
- 한국어 / English (휴대폰 언어를 따르고, 설정에서 바꿈)
- **읽기 전용** : 기기 설정을 바꾸는 명령은 코드에 없습니다

## 1. GitHub Pages 에 올리기 (무료)

1. github.com 에서 회사용 계정을 만듭니다.
2. 오른쪽 위 **+** → **New repository** → 이름 `qsafe-monitor`, **Public** 선택 → **Create repository**.
   (무료 GitHub Pages 는 공개 저장소에서만 됩니다. 이 앱에는 비밀번호·키 같은 비밀 정보가 없습니다.)
3. 저장소 화면에서 **uploading an existing file** (또는 **Add file → Upload files**) 를 누르고,
   이 폴더 안의 내용(`index.html`, `css`, `js`, `icons`, `sw.js`, `manifest.webmanifest`, `README.md`)을 **폴더째** 끌어다 놓은 뒤 **Commit changes**.
4. **Settings → Pages** → Build and deployment 의 Source 를 **Deploy from a branch**, Branch 를 **main / (root)** 로 하고 **Save**.
5. 1~2분 뒤 같은 화면 위쪽에 주소가 나옵니다 : `https://계정이름.github.io/qsafe-monitor/`

나중에 `app.qsafe.co.kr` 같은 회사 주소를 쓰려면 Settings → Pages 의 **Custom domain** 에 그 주소를 넣고, 메이크샵 DNS 에 CNAME 레코드(`app` → `계정이름.github.io`)를 추가하면 됩니다.
휴대폰에 저장된 기록은 주소별로 따로 저장되므로, 고객에게 배포하기 전에 주소를 정해 두세요.

## 2. 휴대폰에서 시험

**안드로이드 (Chrome)**
1. 위 주소를 Chrome 으로 엽니다. 먼저 **체험 모드로 보기** 로 화면을 둘러봅니다.
2. 측정기 제품 정보 화면에서 버튼을 길게 눌러 블루투스를 켭니다.
3. 앱에서 **연결 끊기**(설정) → **기기 연결** → 목록에서 `QSF104…` 선택.
   Chrome 이 "근처 기기", "위치" 권한을 물으면 허용합니다. GPS 를 쓰려면 휴대폰 위치(GPS)를 켜 둡니다.
4. 목록에 안 보이면 **모든 기기 보기** 를 누릅니다 (블루투스 이름을 바꾼 기기 등).
5. 메뉴 → **홈 화면에 추가** 하면 앱처럼 아이콘으로 실행됩니다.

**아이폰**
1. App Store 에서 무료 앱 **Bluefy** 를 설치합니다 (Safari 는 블루투스를 지원하지 않음).
2. Bluefy 에서 위 주소를 열고 같은 순서로 연결합니다.

## 3. 알아 둘 점

- 화면이 꺼지거나 다른 앱으로 가면 블루투스·GPS 가 멈춥니다. 기록 중에는 화면을 켜 두도록 되어 있습니다(설정에서 끌 수 있음).
- 연결이 끊기면 앱이 2~15초 간격으로 다시 연결합니다. 5분 넘게 끊기면 그 기록을 닫고, 다시 연결되면 새 기록을 시작합니다.
- 기록은 이 휴대폰 브라우저 안에만 있습니다. 중요한 기록은 **기록 → 내보내기** 로 저장하세요.
- **FW V7.9** 부터 `$QSF` 10번째 필드(최근 2초 선량률)가 오면, 지도 값은 그 값의 4초 평균을 2초 전 위치에 붙입니다.
  기기 화면을 20초·2분 평균으로 두어도 지도는 정확합니다. V7.8 기기는 기기가 보낸 평균값을 (평균 시간 ÷ 2) 전 위치에 붙입니다.
- 설정 → 기기 정보 → **수신 줄 보기** 로 기기가 보낸 원래 줄을 볼 수 있습니다 (펌웨어 점검용).
- 주소 끝에 `#demo` 를 붙이면 바로 체험 모드로 열립니다.

## 4. 파일을 고쳐서 다시 올릴 때

`sw.js` 맨 위의 `VERSION` 을 올린 뒤(예: `qsm-0.1.1`) 파일을 다시 올립니다. 휴대폰은 앱을 두 번 열면 새 버전으로 바뀝니다.

## 5. 파일 구성

| 파일 | 하는 일 |
| --- | --- |
| `index.html`, `css/app.css` | 화면 |
| `js/protocol.js` | 20바이트 조각을 줄로 조립, `$QSF` / `$QSFI` 해석 |
| `js/ble.js` | Web Bluetooth 연결 (서비스 FFE0, 특성 FFE1 알림), 자동 재연결 |
| `js/geo.js` | 휴대폰 GPS |
| `js/store.js` | 기록 저장 (IndexedDB) |
| `js/app.js` | 화면 동작, 웹 알람, 기록 |
| `js/chart.js` | 그래프 |
| `js/tilemap.js` | OpenStreetMap 지도 (외부 라이브러리 없음) |
| `js/export.js` | CSV · GPX · KML · GeoJSON |
| `js/sound.js` | 경보음 · 진동 |
| `js/demo.js` | 체험 모드 (가상 기기) |
| `js/i18n.js` | 한국어 / English 문구 |
| `sw.js`, `manifest.webmanifest`, `icons/` | 홈 화면 설치·오프라인 |

CSV 열 : `time,device,rate_uSv_h,cpm,err_pct,alarm,dose_uSv,battery,temp_c,marker,battery_mV,lat,lon,gps_acc_m,rate_2s_uSv_h`
(앞 11개 열은 PC 용 QSF104 모니터와 같습니다.)

지도 © OpenStreetMap contributors
