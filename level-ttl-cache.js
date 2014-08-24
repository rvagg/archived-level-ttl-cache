const spaces = require('level-spaces')
    , ttl    = require('level-ttl')


function LevelTTLCache (options) {
  if (!(this instanceof LevelTTLCache))
    return new LevelTTLCache(options)

  if (typeof options != 'object')
    throw new Error('must supply an options object')
  if (!options.db)
    throw new Error('must supply a `db` option')
  if (typeof options.name != 'string')
    throw new Error('must supply a `name` option')
  if (typeof options.ttl != 'number')
    throw new Error('must supply a `ttl` (number) option')
  if (typeof options.load != 'function')
    throw new Error('must supply a `load` (function) option')

  this._options    = options
  var db           = spaces(options.db, 'ttl-cache/' + options.name)
  this._db         = ttl(db, options)
  this._getputopts = { ttl: options.ttl }
  if (options.valueEncoding)
    this._getputopts.valueEncoding = options.valueEncoding
  if (options.keyEncoding)
    this._getputopts.keyEncoding = options.keyEncoding

  this._loading    = {} // in-flight loading requests, so we don't double-up
}


function executeCallbacks (key, err, value) {
  var cbs = this._loading[key]

  if (!cbs)
    return

  ;delete this._loading[key]

  cbs.forEach(function (callback) {
    callback(err, value)
  })
}


LevelTTLCache.prototype.get = function (key, callback) {
  var self    = this
    , jsonkey = JSON.stringify(key)

  if (this._loading[jsonkey])
    return this._loading[jsonkey].push(callback)

  this._loading[jsonkey] = []
  this._loading[jsonkey].push(callback)

  this._db.get(key, this._getputopts, afterGet)

  function afterGet (err, value) {
    if (err) {
      if (err.name != 'NotFoundError')
        return executeCallbacks.call(self, jsonkey, err)

      return self._options.load(key, afterLoad)
    }

    return executeCallbacks.call(self, jsonkey, null, value)
  }

  function afterLoad (err, value) {
    if (err)
      return executeCallbacks.call(self, jsonkey, err)

    self._db.put(key, value, self._getputopts, afterPut)

    function afterPut (err) {
      executeCallbacks.call(self, jsonkey, err, err ? undefined : value)
    }
  }
}


module.exports = LevelTTLCache