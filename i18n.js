/* Q-Safe Monitor — 화면 문구 (한국어 / English) */
var QS = window.QS || (window.QS = {});

QS.STR = {
ko: {
  tabLive:'측정', tabTrend:'그래프', tabMap:'지도', tabLog:'기록',
  safe:'안전', caution:'주의', danger:'위험', waiting:'대기', off:'꺼짐',
  receiving:'수신 중', lost:'수신 끊김', reconnecting:'재연결 중', ago:'{n}초 전', noDevice:'연결 안 됨', demoBadge:'체험',
  thr:'웹 알람 주의 {c} · 위험 {d}', avg0:'평균 4초', avg1:'평균 20초', avg2:'평균 2분',
  devAlarm:'기기 경보 {s}', sessMax:'세션 최대', sessDose:'세션 누적', devDose:'기기 누적', temp:'온도',
  last2m:'최근 2분', recStart:'기록 시작', recOn:'기록 중', note:'메모',
  liveHint:'모든 알람은 폰에서만 판단합니다. 기기의 경보·소리 설정은 바뀌지 않습니다.',
  r2m:'2분', r10m:'10분', r1h:'1시간', rAll:'전체',
  mean:'평균', min:'최소', max:'최대', sd:'표준편차', rangeDose:'구간 선량', samples:'표본',
  annual:'연간 환산 (평균 × 8,760시간) {v} mSv/년 · 기기가 보낸 평균값 기준', evMarks:'▲ 알람 · │ 메모',
  gpsAcc2:'GPS ±{n} m', gpsNone:'GPS 없음', gpsDenied:'위치 권한 없음',
  mapAvgWarn:'기기 평균이 {a}입니다. 걸으며 재는 지도 측정은 기기를 AVG 4s로 두세요.',
  lag:'위치 보정 {s}초 전', fromRate2:'지도 값: 2초 선량률로 4초 평균', devAvgNote:'기기 화면은 {a} · 지도는 영향 없음',
  legend:'선량률 µSv/h', points:'점 {n}개', tapPoint:'점을 누르면 값이 보입니다', nowLbl:'현재',
  mapOffline:'지도를 불러오지 못했습니다. 인터넷 연결을 확인하세요. 측정 점은 그대로 표시됩니다.', noPoints:'아직 위치가 붙은 측정값이 없습니다.',
  viewing:'{d} 기록을 보는 중', backLive:'실시간으로',
  sessions:'측정 기록', inProgress:'진행 중', minutes:'{n}분', samplesN:'표본 {n}', noSessions:'아직 기록이 없습니다. 기기를 연결하면 자동으로 기록됩니다.',
  logNote:'기록은 이 폰의 브라우저 안에만 저장됩니다. 중요한 기록은 내보내기로 따로 보관하세요.', memOnly:'이 브라우저에서는 저장소를 쓸 수 없어 앱을 닫으면 기록이 사라집니다.',
  export:'내보내기', exportNote:'파일로 저장하거나 공유 창으로 카카오톡·메일에 보냅니다.',
  kvDevice:'기기', kvStart:'시작', kvLen:'길이', kvN:'표본', kvMean:'평균', kvMax:'최대', kvDose:'폰 계산 누적', kvGps:'GPS 점', kvAlarms:'알람',
  viewTrend:'그래프로 보기', viewMap:'지도로 보기', deleteSession:'이 기록 삭제', confirmDelete:'한 번 더 누르면 삭제됩니다', deleted:'기록을 삭제했습니다',
  saved:'파일을 저장했습니다', shared:'공유했습니다', exportFail:'파일을 만들지 못했습니다',
  back:'뒤로', gAlarm:'웹 알람', rise:'급상승 감지', loss:'수신 끊김 알림 (15초)', sessLimit:'세션 누적 한도',
  sound:'소리', vibrate:'진동 (안드로이드)', flash:'위험 시 화면 깜빡임', testSound:'소리 시험',
  alarmNote:'주의·위험은 2회 연속(4초) 넘으면 울리고, 기준의 90% 아래로 3회 연속이면 풀립니다.',
  gGeneral:'일반', language:'언어', autoRec:'연결하면 자동 기록', wake:'기록 중 화면 켜 두기',
  mapType:'지도 종류', mapOsm:'일반 (OpenStreetMap)', mapVw:'국내 상세 (브이월드, 추후)', mapVwSat:'항공사진 (브이월드, 추후)',
  mapScale:'지도 색 범위', fixed:'고정', auto:'자동', gpsAcc:'GPS 정확도 기준', useGps:'위치(GPS) 사용',
  gDevice:'기기 정보', model:'모델', serial:'시리얼', fw:'펌웨어', devAlarmLv:'기기 경보값', btName:'블루투스 이름',
  readonly:'기기가 보낸 $QSFI 줄에서 읽은 값입니다. 이 앱은 기기 설정을 바꾸는 명령을 보내지 않습니다.',
  rawLog:'수신 줄 보기', rawT:'최근 수신 줄', gDemo:'체험 모드 상황', scNormal:'정상', scCaution:'주의 수준', scDanger:'위험 수준', scLost:'수신 끊김', scAvg20:'기기 AVG 20s',
  disconnect:'연결 끊기', version:'앱 버전',
  cTitle:'측정기를 연결하세요', cStep1:'측정기의 제품 정보 화면에서 버튼을 길게 눌러 블루투스를 켭니다.', cStep2:'아래 [기기 연결]을 누르고 목록에서 QSF104…를 고릅니다.',
  cConnect:'기기 연결', cAll:'목록에 기기가 없으면: 모든 기기 보기', cDemo:'체험 모드로 보기', cLog:'지난 기록 보기',
  cIphoneT:'아이폰 사용자', cIphone:'아이폰 Safari는 블루투스 연결을 지원하지 않습니다. App Store에서 무료 앱 Bluefy를 설치하고, Bluefy에서 이 주소를 여세요.', cIphoneLink:'App Store에서 Bluefy 열기',
  cNoBt:'이 브라우저는 블루투스 연결을 지원하지 않습니다. 안드로이드는 Chrome, 아이폰은 Bluefy에서 여세요.',
  cHttps:'블루투스는 https:// 주소에서만 동작합니다.', btFail:'연결하지 못했습니다: {e}', btCancel:'기기 선택을 취소했습니다.',
  btNoService:'이 기기에는 QSF104 통신 서비스(FFE0)가 없습니다. 다른 기기를 고르세요.',
  aDanger:'위험', aCaution:'주의', aRise:'급상승', aLost:'수신 끊김', aSess:'세션 누적 한도', aBat:'배터리 부족',
  aLvMsg:'{v} µSv/h · 기준 {t}', aRiseMsg:'{v} µSv/h · 최근 5분 평균 {b}보다 높음',
  aLostMsg:'15초 동안 측정값이 없습니다. 기기 전원·블루투스·거리를 확인하세요.', aSessMsg:'이번 세션 {v} µSv · 한도 {t}',
  aBatMsg:'3.5 V 아래로 내려가면 기기가 블루투스를 끕니다.', ack:'확인', ackDone:'소리 끔',
  csvT:'CSV', gpxT:'GPX', kmlT:'KML', geojsonT:'GeoJSON', copy:'복사', copied:'복사됨', close:'닫기', save:'저장 · 공유',
  noteT:'메모 붙이기', notePh:'예: 정문 앞, 시료 A', noteSave:'다음 측정값에 붙이기', noteSet:'다음 측정값에 메모를 붙입니다',
  parkNote:'공원 동쪽 길'
},
en: {
  tabLive:'Live', tabTrend:'Trend', tabMap:'Map', tabLog:'Logs',
  safe:'SAFE', caution:'Caution', danger:'Danger', waiting:'Waiting', off:'Off',
  receiving:'Receiving', lost:'No data', reconnecting:'Reconnecting', ago:'{n}s ago', noDevice:'Not connected', demoBadge:'Demo',
  thr:'Web alarm caution {c} · danger {d}', avg0:'AVG 4 s', avg1:'AVG 20 s', avg2:'AVG 2 min',
  devAlarm:'Device alarm {s}', sessMax:'Session max', sessDose:'Session dose', devDose:'Device dose', temp:'Temp',
  last2m:'Last 2 min', recStart:'Record', recOn:'Recording', note:'Note',
  liveHint:'All alarms are decided on the phone. The meter’s own alarm and sound settings are never changed.',
  r2m:'2 min', r10m:'10 min', r1h:'1 h', rAll:'All',
  mean:'Mean', min:'Min', max:'Max', sd:'Std dev', rangeDose:'Dose in range', samples:'Samples',
  annual:'Annualised (mean × 8,760 h) {v} mSv/year · from the meter’s averaged values', evMarks:'▲ alarm · │ note',
  gpsAcc2:'GPS ±{n} m', gpsNone:'No GPS', gpsDenied:'Location not allowed',
  mapAvgWarn:'The meter is averaging over {a}. For walking surveys set the meter to AVG 4s.',
  lag:'Position shifted {s} s back', fromRate2:'Map value: 4-s mean of the 2-s dose rate', devAvgNote:'Meter shows {a} · map unaffected',
  legend:'Dose rate µSv/h', points:'{n} points', tapPoint:'Tap a point to see its value', nowLbl:'now',
  mapOffline:'Could not load the map. Check the internet connection. Measured points are still shown.', noPoints:'No readings with a position yet.',
  viewing:'Viewing the log of {d}', backLive:'Back to live',
  sessions:'Sessions', inProgress:'In progress', minutes:'{n} min', samplesN:'{n} samples', noSessions:'No logs yet. Connecting a meter starts a log automatically.',
  logNote:'Logs are kept only in this phone’s browser. Export anything you need to keep.', memOnly:'This browser cannot store data, so logs are lost when the app closes.',
  export:'Export', exportNote:'Saves a file, or shares it by messenger or e-mail.',
  kvDevice:'Device', kvStart:'Start', kvLen:'Length', kvN:'Samples', kvMean:'Mean', kvMax:'Max', kvDose:'Dose (phone)', kvGps:'GPS points', kvAlarms:'Alarms',
  viewTrend:'Show on chart', viewMap:'Show on map', deleteSession:'Delete this log', confirmDelete:'Tap again to delete', deleted:'Log deleted',
  saved:'File saved', shared:'Shared', exportFail:'Could not create the file',
  back:'Back', gAlarm:'Web alarms', rise:'Sudden-rise alert', loss:'Data-loss alert (15 s)', sessLimit:'Session dose limit',
  sound:'Sound', vibrate:'Vibration (Android)', flash:'Flash screen on danger', testSound:'Test sound',
  alarmNote:'Caution and danger trigger after 2 readings in a row (4 s) and clear after 3 readings below 90% of the level.',
  gGeneral:'General', language:'Language', autoRec:'Record automatically on connect', wake:'Keep screen on while recording',
  mapType:'Map', mapOsm:'Standard (OpenStreetMap)', mapVw:'Korea detail (VWorld, later)', mapVwSat:'Aerial (VWorld, later)',
  mapScale:'Map colour scale', fixed:'Fixed', auto:'Auto', gpsAcc:'GPS accuracy limit', useGps:'Use location (GPS)',
  gDevice:'Device', model:'Model', serial:'Serial', fw:'Firmware', devAlarmLv:'Device alarm level', btName:'Bluetooth name',
  readonly:'Read from the meter’s $QSFI line. This app never sends commands that change device settings.',
  rawLog:'Show received lines', rawT:'Recent lines', gDemo:'Demo scenario', scNormal:'Normal', scCaution:'Caution level', scDanger:'Danger level', scLost:'Data loss', scAvg20:'Meter AVG 20s',
  disconnect:'Disconnect', version:'App version',
  cTitle:'Connect your meter', cStep1:'On the meter’s device info screen, long-press the button to turn Bluetooth on.', cStep2:'Tap [Connect] and pick QSF104… from the list.',
  cConnect:'Connect', cAll:'Meter not listed? Show all devices', cDemo:'Try demo mode', cLog:'Open past logs',
  cIphoneT:'iPhone users', cIphone:'Safari on iPhone cannot connect to Bluetooth devices. Install the free Bluefy app from the App Store and open this address in Bluefy.', cIphoneLink:'Open Bluefy in the App Store',
  cNoBt:'This browser cannot connect to Bluetooth devices. Use Chrome on Android, or Bluefy on iPhone.',
  cHttps:'Bluetooth only works on an https:// address.', btFail:'Could not connect: {e}', btCancel:'No device was selected.',
  btNoService:'This device does not have the QSF104 serial service (FFE0). Pick another device.',
  aDanger:'DANGER', aCaution:'Caution', aRise:'Sudden rise', aLost:'No data', aSess:'Session dose limit', aBat:'Low battery',
  aLvMsg:'{v} µSv/h · level {t}', aRiseMsg:'{v} µSv/h · above the 5-min mean {b}',
  aLostMsg:'No readings for 15 s. Check meter power, Bluetooth and distance.', aSessMsg:'This session {v} µSv · limit {t}',
  aBatMsg:'Below 3.5 V the meter turns Bluetooth off.', ack:'Acknowledge', ackDone:'Muted',
  csvT:'CSV', gpxT:'GPX', kmlT:'KML', geojsonT:'GeoJSON', copy:'Copy', copied:'Copied', close:'Close', save:'Save · share',
  noteT:'Add a note', notePh:'e.g. front gate, sample A', noteSave:'Attach to next reading', noteSet:'The note goes on the next reading',
  parkNote:'Park east side'
}};

QS.lang = (function () { try { var v = localStorage.getItem('qsm.lang'); if (v === 'ko' || v === 'en') return v; } catch (e) {} return (navigator.language || 'ko').slice(0, 2) === 'ko' ? 'ko' : 'en'; })();

QS.t = function (k, v) {
  var s = QS.STR[QS.lang][k];
  if (s == null) s = QS.STR.ko[k];
  if (s == null) s = k;
  if (v) for (var a in v) s = s.split('{' + a + '}').join(v[a]);
  return s;
};

QS.applyText = function () {
  document.documentElement.lang = QS.lang;
  document.querySelectorAll('[data-i]').forEach(function (el) { el.textContent = QS.t(el.dataset.i); });
};
