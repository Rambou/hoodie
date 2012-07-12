// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Hoodie.Store = (function() {

  function Store(hoodie) {
    this.hoodie = hoodie;
    this.clear = __bind(this.clear, this);

    if (!this.is_persistent()) {
      this.db = {
        getItem: function() {
          return null;
        },
        setItem: function() {
          return null;
        },
        removeItem: function() {
          return null;
        },
        key: function() {
          return null;
        },
        length: function() {
          return 0;
        },
        clear: function() {
          return null;
        }
      };
    }
    this.hoodie.on('account:sign_out', this.clear);
  }

  Store.prototype.db = {
    getItem: function(key) {
      return window.localStorage.getItem(key);
    },
    setItem: function(key, value) {
      return window.localStorage.setItem(key, value);
    },
    removeItem: function(key) {
      return window.localStorage.removeItem(key);
    },
    key: function(nr) {
      return window.localStorage.key(nr);
    },
    length: function() {
      return window.localStorage.length;
    },
    clear: function() {
      return window.localStorage.clear();
    }
  };

  Store.prototype.save = function(type, id, object, options) {
    var defer, is_new;
    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    if (typeof object !== 'object') {
      defer.reject(Hoodie.Errors.INVALID_ARGUMENTS("object is " + (typeof object)));
      return defer.promise();
    }
    object = $.extend({}, object);
    if (id && !this._is_valid_id(id)) {
      return defer.reject(Hoodie.Errors.INVALID_KEY({
        id: id
      })).promise();
    }
    if (!this._is_valid_type(type)) {
      return defer.reject(Hoodie.Errors.INVALID_KEY({
        type: type
      })).promise();
    }
    if (id) {
      is_new = typeof this._cached["" + type + "/" + id] !== 'object';
    } else {
      is_new = true;
      id = this.uuid();
    }
    if (options.remote) {
      object._synced_at = this._now();
    } else if (!options.silent) {
      object.updated_at = this._now();
      object.created_at || (object.created_at = object.updated_at);
    }
    delete object.id;
    delete object.type;
    try {
      object = this.cache(type, id, object, options);
      defer.resolve(object, is_new).promise();
    } catch (error) {
      defer.reject(error).promise();
    }
    return defer.promise();
  };

  Store.prototype.create = function(type, object, options) {
    if (options == null) {
      options = {};
    }
    return this.save(type, void 0, object);
  };

  Store.prototype.update = function(type, id, object_update, options) {
    var defer, _load_promise,
      _this = this;
    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    _load_promise = this.load(type, id).pipe(function(current_obj) {
      var changed_properties, key, value;
      if (typeof object_update === 'function') {
        object_update = object_update($.extend({}, current_obj));
      }
      if (!object_update) {
        return defer.resolve(current_obj);
      }
      changed_properties = (function() {
        var _results;
        _results = [];
        for (key in object_update) {
          value = object_update[key];
          if (!(current_obj[key] !== value)) {
            continue;
          }
          current_obj[key] = value;
          _results.push(key);
        }
        return _results;
      })();
      if (!changed_properties.length) {
        return defer.resolve(current_obj);
      }
      return _this.save(type, id, current_obj, options).then(defer.resolve, defer.reject);
    });
    _load_promise.fail(function() {
      return _this.save(type, id, object_update, options).then(defer.resolve, defer.reject);
    });
    return defer.promise();
  };

  Store.prototype.updateAll = function(filter_or_objects, object_update, options) {
    var promise,
      _this = this;
    if (options == null) {
      options = {};
    }
    if (this.hoodie.isPromise(filter_or_objects)) {
      promise = filter_or_objects;
    } else {
      promise = this.hoodie.defer().resolve(filter_or_objects).resolve();
    }
    return promise.pipe(function(objects) {
      var defer, object, _update_promises;
      defer = _this.hoodie.defer();
      _update_promises = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(this.update(object.type, object.id, object_update, options));
        }
        return _results;
      }).call(_this);
      $.when.apply(null, _update_promises).then(defer.resolve);
      return defer.promise();
    });
  };

  Store.prototype.load = function(type, id) {
    var defer, object;
    defer = this.hoodie.defer();
    if (!(typeof type === 'string' && typeof id === 'string')) {
      return defer.reject(Hoodie.Errors.INVALID_ARGUMENTS("type & id are required")).promise();
    }
    try {
      object = this.cache(type, id);
      if (!object) {
        return defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise();
      }
      defer.resolve(object);
    } catch (error) {
      defer.reject(error);
    }
    return defer.promise();
  };

  Store.prototype.loadAll = function(filter) {
    var current_type, defer, id, key, keys, obj, results, type;
    if (filter == null) {
      filter = function() {
        return true;
      };
    }
    defer = this.hoodie.defer();
    keys = this._index();
    if (typeof filter === 'string') {
      type = filter;
      filter = function(obj) {
        return obj.type === type;
      };
    }
    try {
      results = (function() {
        var _i, _len, _ref, _results;
        _results = [];
        for (_i = 0, _len = keys.length; _i < _len; _i++) {
          key = keys[_i];
          if (!(this._is_semantic_id(key))) {
            continue;
          }
          _ref = key.split('/'), current_type = _ref[0], id = _ref[1];
          obj = this.cache(current_type, id);
          if (filter(obj)) {
            _results.push(obj);
          } else {
            continue;
          }
        }
        return _results;
      }).call(this);
      defer.resolve(results).promise();
    } catch (error) {
      defer.reject(error).promise();
    }
    return defer.promise();
  };

  Store.prototype["delete"] = function(type, id, options) {
    var defer, key, object;
    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    object = this.cache(type, id);
    if (!object) {
      return defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise();
    }
    if (object._synced_at && !options.remote) {
      object._deleted = true;
      this.cache(type, id, object);
    } else {
      key = "" + type + "/" + id;
      this.db.removeItem(key);
      this._cached[key] = false;
      this.clear_changed(type, id);
    }
    return defer.resolve($.extend({}, object)).promise();
  };

  Store.prototype.destroy = Store.prototype["delete"];

  Store.prototype.cache = function(type, id, object, options) {
    var key;
    if (object == null) {
      object = false;
    }
    if (options == null) {
      options = {};
    }
    key = "" + type + "/" + id;
    if (object) {
      this._cached[key] = $.extend(object, {
        type: type,
        id: id
      });
      this._setObject(type, id, object);
      if (options.remote) {
        this.clear_changed(type, id);
        return $.extend({}, this._cached[key]);
      }
    } else {
      if (this._cached[key] != null) {
        return $.extend({}, this._cached[key]);
      }
      this._cached[key] = this._getObject(type, id);
    }
    if (this._cached[key] && (this._is_dirty(this._cached[key]) || this._is_marked_as_deleted(this._cached[key]))) {
      this.mark_as_changed(type, id, this._cached[key]);
    } else {
      this.clear_changed(type, id);
    }
    if (this._cached[key]) {
      return $.extend({}, this._cached[key]);
    } else {
      return this._cached[key];
    }
  };

  Store.prototype.clear_changed = function(type, id) {
    var key;
    if (type && id) {
      key = "" + type + "/" + id;
      delete this._dirty[key];
    } else {
      this._dirty = {};
    }
    return this.hoodie.trigger('store:dirty');
  };

  Store.prototype.is_marked_as_deleted = function(type, id) {
    return this._is_marked_as_deleted(this.cache(type, id));
  };

  Store.prototype.mark_as_changed = function(type, id, object) {
    var key, timeout,
      _this = this;
    key = "" + type + "/" + id;
    this._dirty[key] = object;
    this.hoodie.trigger('store:dirty');
    timeout = 2000;
    window.clearTimeout(this._dirty_timeout);
    return this._dirty_timeout = window.setTimeout((function() {
      return _this.hoodie.trigger('store:dirty:idle');
    }), timeout);
  };

  Store.prototype.changed_docs = function() {
    var key, object, _ref, _results;
    _ref = this._dirty;
    _results = [];
    for (key in _ref) {
      object = _ref[key];
      _results.push(object);
    }
    return _results;
  };

  Store.prototype.is_dirty = function(type, id) {
    if (!type) {
      return $.isEmptyObject(this._dirty);
    }
    return this._is_dirty(this.cache(type, id));
  };

  Store.prototype.clear = function() {
    var defer;
    defer = this.hoodie.defer();
    try {
      this.db.clear();
      this._cached = {};
      this.clear_changed();
      defer.resolve();
    } catch (error) {
      defer.reject(error);
    }
    return defer.promise();
  };

  Store.prototype.is_persistent = function() {
    try {
      if (!window.localStorage) {
        return false;
      }
      localStorage.setItem('Storage-Test', "1");
      if (localStorage.getItem('Storage-Test') !== "1") {
        return false;
      }
      localStorage.removeItem('Storage-Test');
    } catch (e) {
      return false;
    }
    return true;
  };

  Store.prototype.uuid = function(len) {
    var chars, i, radix;
    if (len == null) {
      len = 7;
    }
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    radix = chars.length;
    return ((function() {
      var _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        _results.push(chars[0 | Math.random() * radix]);
      }
      return _results;
    })()).join('');
  };

  Store.prototype._setObject = function(type, id, object) {
    var key, store;
    key = "" + type + "/" + id;
    store = $.extend({}, object);
    delete store.type;
    delete store.id;
    return this.db.setItem(key, JSON.stringify(store));
  };

  Store.prototype._getObject = function(type, id) {
    var json, key, obj;
    key = "" + type + "/" + id;
    json = this.db.getItem(key);
    if (json) {
      obj = JSON.parse(json);
      obj.type = type;
      obj.id = id;
      if (obj.created_at) {
        obj.created_at = new Date(Date.parse(obj.created_at));
      }
      if (obj.updated_at) {
        obj.updated_at = new Date(Date.parse(obj.updated_at));
      }
      if (obj._synced_at) {
        obj._synced_at = new Date(Date.parse(obj._synced_at));
      }
      return obj;
    } else {
      return false;
    }
  };

  Store.prototype._now = function() {
    return new Date;
  };

  Store.prototype._is_valid_id = function(key) {
    return /^[a-z0-9\-]+$/.test(key);
  };

  Store.prototype._is_valid_type = function(key) {
    return /^[a-z$][a-z0-9]+$/.test(key);
  };

  Store.prototype._is_semantic_id = function(key) {
    return /^[a-z$][a-z0-9]+\/[a-z0-9]+$/.test(key);
  };

  Store.prototype._cached = {};

  Store.prototype._dirty = {};

  Store.prototype._is_dirty = function(object) {
    if (!object._synced_at) {
      return true;
    }
    if (!object.updated_at) {
      return false;
    }
    return object._synced_at.getTime() < object.updated_at.getTime();
  };

  Store.prototype._is_marked_as_deleted = function(object) {
    return object._deleted === true;
  };

  Store.prototype._index = function() {
    var i, _i, _ref, _results;
    _results = [];
    for (i = _i = 0, _ref = this.db.length(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      _results.push(this.db.key(i));
    }
    return _results;
  };

  return Store;

})();
