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
  if (!options.db._ttl)
    throw new Error('must supply a LevelUP set up with level-ttl')

  this._options = options
  this._db      = options.db.sublevel('ttl-cache/' + options.name)
}

LevelTTLCache.prototype.get = function (key, callback) {
  var self = this

  this._db.get(key, function (err, value) {
    if (err) {
      if (err.name != 'NotFoundError')
        return callback(err)

      return self._options.load(key, function (err, value) {
        if (err)
          return callback(err)
        self._db.put(
            key
          , value
          , { ttl: self._options.ttl }
          , function (err) {
              if (err)
                return callback(err)
              callback(null, value)
            }
        )
      })
    }

    callback(null, value)
  })
}

module.exports = LevelTTLCache