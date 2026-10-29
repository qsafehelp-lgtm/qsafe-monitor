/* Q-Safe Monitor — 내보내기 : CSV (PC 모니터와 같은 열 + 위치·2초 선량률), GPX, KML, GeoJSON */
var QS = window.QS || (window.QS = {});

QS.Export = {
  /* rs : 측정값, dev : 기기 이름, lv : {caution, danger} */
  make: function (kind, rs, dev, lv) {
    var f3 = function (v) { return (+v).toFixed(3); };
    var ts = function (ms) { return QS.ymd(ms) + ' ' + QS.hms(ms); };
    var iso = function (ms) { return new Date(ms).toISOString(); };
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var cls = function (v) { return v >= lv.danger ? 5 : v >= lv.caution ? 4 : v >= 0.3 ? 3 : v >= 0.15 ? 2 : 1; };
    var mr = function (r) { return r.mrate != null ? r.mrate : r.rate; };
    if (kind === 'csv') {
      var head = 'time,device,rate_uSv_h,cpm,err_pct,alarm,dose_uSv,battery,temp_c,marker,battery_mV,lat,lon,gps_acc_m,rate_2s_uSv_h';
      return [head].concat(rs.map(function (r) {
        var g = r.lat != null;
        return [ts(r.t), String(dev).replace(/,/g, ' '), f3(r.rate), r.cpm, r.err, r.alarm, f3(r.dose), r.bat, (+r.temp).toFixed(1),
          String(r.marker || '').replace(/[,\r\n]/g, ' '), r.mv, g ? r.lat.toFixed(6) : '', g ? r.lon.toFixed(6) : '', g ? Math.round(r.acc) : '',
          r.rate2 != null ? f3(r.rate2) : ''].join(',');
      })).join('\r\n') + '\r\n';
    }
    var gp = rs.filter(function (r) { return r.lat != null; });
    if (kind === 'gpx') {
      return ['<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Q-Safe Monitor" xmlns="http://www.topografix.com/GPX/1/1" xmlns:qsf="urn:qsafe:qsf104">',
        ' <trk><name>' + esc(dev) + ' ' + (rs.length ? ts(rs[0].t) : '') + '</name><trkseg>']
        .concat(gp.map(function (r) {
          return '  <trkpt lat="' + r.lat.toFixed(6) + '" lon="' + r.lon.toFixed(6) + '"><time>' + iso(r.t) + '</time><extensions><qsf:rate>' + f3(mr(r)) + '</qsf:rate><qsf:cpm>' + r.cpm + '</qsf:cpm></extensions></trkpt>';
        }), [' </trkseg></trk>', '</gpx>']).join('\n');
    }
    if (kind === 'kml') {
      var colors = { 1: 'ffb4d79a', 2: 'ff6aa32f', 3: 'ff2ab9c9', 4: 'ff1f9aef', 5: 'ff2c3bde' };   // aabbggrr
      var styles = [1, 2, 3, 4, 5].map(function (k) { return ' <Style id="lv' + k + '"><IconStyle><color>' + colors[k] + '</color><scale>0.6</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/shaded_dot.png</href></Icon></IconStyle></Style>'; });
      return ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>' + esc(dev) + '</name>']
        .concat(styles, gp.map(function (r) {
          return ' <Placemark><name>' + f3(mr(r)) + ' µSv/h</name><TimeStamp><when>' + iso(r.t) + '</when></TimeStamp><styleUrl>#lv' + cls(mr(r)) + '</styleUrl><Point><coordinates>' + r.lon.toFixed(6) + ',' + r.lat.toFixed(6) + '</coordinates></Point></Placemark>';
        }), ['</Document></kml>']).join('\n');
    }
    return JSON.stringify({ type: 'FeatureCollection', features: gp.map(function (r) {
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [+r.lon.toFixed(6), +r.lat.toFixed(6)] },
        properties: { time: iso(r.t), rate_uSv_h: +f3(r.rate), map_rate_uSv_h: +f3(mr(r)), cpm: r.cpm, err_pct: r.err, dose_uSv: +f3(r.dose), gps_acc_m: Math.round(r.acc), marker: r.marker || '' } };
    }) });
  },

  mime: { csv: 'text/csv', gpx: 'application/gpx+xml', kml: 'application/vnd.google-earth.kml+xml', geojson: 'application/geo+json' },

  /* 공유 창이 되면 공유, 아니면 파일로 저장. 결과: 'shared' | 'saved' | 'cancel' */
  save: function (kind, text, baseName) {
    var name = baseName + '.' + kind;
    var body = kind === 'csv' ? '﻿' + text : text;           // CSV 는 엑셀용 BOM
    var type = this.mime[kind] || 'text/plain';
    var file = null;
    try { file = new File([body], name, { type: type }); } catch (e) {}
    if (file && navigator.canShare && navigator.share) {
      try {
        if (navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], title: name }).then(function () { return 'shared'; }, function (e) {
            if (e && e.name === 'AbortError') return 'cancel';
            QS.Export.download(body, name, type); return 'saved';
          });
        }
      } catch (e) {}
    }
    this.download(body, name, type);
    return Promise.resolve('saved');
  },

  download: function (body, name, type) {
    var url = URL.createObjectURL(new Blob([body], { type: type })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
};
