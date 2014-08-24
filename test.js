const test          = require('tape')
    , level         = require('level')
    , rimraf        = require('rimraf')
    , LevelTTLCache = require('./')

test('test constructor', function (t) {
  t.throws(LevelTTLCache)
  t.throws(LevelTTLCache.bind(null, {}))
  t.throws(LevelTTLCache.bind(null, { db: {} }))
  t.throws(LevelTTLCache.bind(null, { db: {}, name: 'foobar' }))
  t.throws(LevelTTLCache.bind(null, { db: {}, ttl: 100, name: 'foobar' }))
  /*t.throws(LevelTTLCache.bind(null, {
      db   : {}
    , ttl  : 100
    , load : function () {}
    , name : 'foobar'
  }))*/

  /*
  var cache = LevelTTLCache({
          db   : { _ttl: {}, open : function () {} }
        , ttl  : 100
        , load : function () {}
        , name : 'foobar'
        , checkFrequency: 25
      })

  t.ok(cache, 'got a cache!')
  t.equals(typeof cache.get, 'function')
  */
  t.end()
})

function ltest (name, fn, opts) {
  test(name, function (t) {
    var location = '__ttl-' + Math.random()
      , db

    t.__end = t.end
    t.end = function () {
      db.close(function (err) {
        t.notOk(err, 'no error on close()')
        rimraf(location, t.__end)
      })
    }

    level(location, opts, function (err, _db) {
      t.notOk(err, 'no error on open()')

      db = _db

      fn(db, t)
    })
  })
}

ltest('test cache', function (db, t) {
  var entries = [
          { key: 'foo1', value: 'bar1' }
        , { key: 'foo2', value: 'bar2' }
        , { key: 'foo3', value: 'bar3' }
        , { key: 'foo4', value: 'bar4' }
      ]
    , j = 0
    , got = 0
    , cache


  function load (key, callback) {
    t.ok(j < entries.length, 'no unexpected calls') // doesn't call load() more than it needs
    t.equal(key, entries[j].key, 'got expected key for entry ' + j)
    setTimeout(callback.bind(null, null, entries[j].value), 10)
    j++
  }

  cache = LevelTTLCache({
      db   : db
    , ttl  : 100
    , load : load
    , name : 'foobar'
    , checkFrequency: 25
  })

  // sequential
  function get (i) {
    cache.get(entries[i].key, function (err, value) {
      t.equals(value, entries[i].value, 'got expected value for entry ' + i)
      if (i < entries.length - 1)
        return get(i + 1)
      getasync() // next test phase
    })
  }
  get(0)

  // async
  function getasync () {
    for (var i = 0; i < entries.length; i++) {
      (function (i) {
        cache.get(entries[i].key, function (err, value) {
          t.equals(value, entries[i].value, '(async) got expected value for entry ' + i)
          if (++got == entries.length)
            setTimeout(getexpired, 500)
        })
      }(i))
    }
  }

  // post ttl-expire, expect a re-get
  function getexpired() {
    j = 0

    function get (i) {
      cache.get(entries[i].key, function (err, value) {
        t.equals(value, entries[i].value, '(expired) got expected value for entry ' + i)
        // j will only be incremented when load() is called, we reset it to
        // 0 so we should see it climb along with `i` as we fetch the entries
        t.equals(j, i + 1, 'reload occured after ttl for entry ' + i)
        if (i < entries.length - 1)
          get(i + 1)
        else
          setTimeout(function () {
          t.end() // w00t
        }, 1000)
      })
    }
    get(0)
  }
})
