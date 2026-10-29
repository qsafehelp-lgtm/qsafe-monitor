/* Q-Safe Monitor — 기록 저장 (브라우저 IndexedDB). 저장소를 못 쓰면 메모리에만 둔다. */
var QS = window.QS || (window.QS = {});

QS.Store = {
  db: null,
  ok: false,

  open: function () {
    var self = this;
    return new Promise(function (resolve) {
      var req;
      try { req = indexedDB.open('qsafe-monitor', 1); } catch (e) { resolve(false); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('readings')) db.createObjectStore('readings', { autoIncrement: true }).createIndex('sid', 'sid');
      };
      req.onsuccess = function () { self.db = req.result; self.ok = true; resolve(true); };
      req.onerror = function () { resolve(false); };
      req.onblocked = function () { resolve(false); };
    });
  },

  persist: function () {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
  },

  _req: function (store, mode, fn) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!self.ok) { resolve(null); return; }
      try {
        var tx = self.db.transaction(store, mode), st = tx.objectStore(store), out = fn(st);
        tx.oncomplete = function () { resolve(out && 'result' in out ? out.result : out); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      } catch (e) { reject(e); }
    });
  },

  putSession: function (s) { return this._req('sessions', 'readwrite', function (st) { return st.put(s); }).catch(function () {}); },
  addReading: function (r) { return this._req('readings', 'readwrite', function (st) { return st.add(r); }).catch(function () {}); },
  addReadings: function (rs) { return this._req('readings', 'readwrite', function (st) { rs.forEach(function (r) { st.add(r); }); }).catch(function () {}); },

  listSessions: function () {
    return this._req('sessions', 'readonly', function (st) { return st.getAll(); })
      .then(function (a) { return (a || []).sort(function (x, y) { return y.start - x.start; }); })
      .catch(function () { return []; });
  },

  getReadings: function (sid) {
    return this._req('readings', 'readonly', function (st) { return st.index('sid').getAll(sid); })
      .then(function (a) { return (a || []).sort(function (x, y) { return x.t - y.t; }); })
      .catch(function () { return []; });
  },

  deleteSession: function (sid) {
    var self = this;
    return this._req('readings', 'readwrite', function (st) {
      var cur = st.index('sid').openKeyCursor(IDBKeyRange.only(sid));
      cur.onsuccess = function () { var c = cur.result; if (c) { st.delete(c.primaryKey); c.continue(); } };
    }).then(function () { return self._req('sessions', 'readwrite', function (st) { return st.delete(sid); }); }).catch(function () {});
  }
};
