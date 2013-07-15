LevelTTLCache
=============

**A pass-through cache for arbitrary objects or binary data using LevelDB, expired by a TTL**

---------------------------------------------

[![Build Status](https://secure.travis-ci.org/rvagg/level-ttl-cache.png)](http://travis-ci.org/rvagg/level-ttl-cache)

[![NPM](https://nodei.co/npm/level-ttl-cache.png?)](https://nodei.co/npm/level-ttl-cache/)

Requires [LevelUP](https://github.com/rvagg/node-levelup) (or [Level](https://github.com/level/level)) and [sublevel](https://github.com/dominictarr/level-sublevel) to be installed separately.

Also builds on [LevelTTL](https://github.com/rvagg/node-level-ttl) to provide TTL-based cache timeouts, you'll need to initialise it too. You can also set a custom check-frequency when you initialise LevelTTL.

Note that none of these libraries are included in the *dependencies* of LevelTTLCache so you'll need to install them and set them up prior to initialising a LevelTTLCache instance.

```js
const level    = require('level')
    , sublevel = require('level-sublevel')
    , ttl      = require('level-ttl')
    , Cache    = require('level-ttl-cache')

var db = level('/my/big/cache.db')

db = sublevel(db) // setup sublevel
db = ttl(db)      // setup level-ttl, set checkFrequency here if desired

// you can create as many caches as you need and they can live separately
var cache = Cache({
    db   : db
  , name : 'mybigcache'  // should be unique per cache, used to make a sublevel
  , ttl  : 1000 * 60 * 5 // 5 minute ttl for all entries in this cache
  , load : function (key, callback) {
      // do some (possibly async) work to load the value for `key`
      // and return it as the second argument to the callback,
      // the first argument should be null unless there is an error
      callback(null, value)
    }
})

// our cache now has a `get` method that operates like a simple read-only
// key/value store but whose entries are kept for a certain period of time
// in a leveldb instance, after which they expire and need to be re-loaded
// from our load() function

cache.get('foo', function (err, value) {
  // `value` may or may not have come via our load() function, depending on
  // whether load() was called for this key within the last 5 minutes and
  // successfully returned a value
})
```

The cache doesn't require an explicit shut-down, instead you ought to `close()` the original `db` instance, which will halt the LevelTTL check cycle and close the underlying LevelDB store.

<a name="licence"></a>
Licence &amp; copyright
-------------------

Copyright (c) 2013 Rod Vagg.

LevelTTLCache is licensed under an MIT +no-false-attribs license. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.