angular.module('gi.util', ['ngResource', 'ngCookies', 'logglyLogger', 'ngTouch', 'ngRoute', 'ng.deviceDetector']).value('version', '1.9.5').config([
  'giLogProvider',
  function(giLogProvider) {
    if (typeof loggly !== "undefined" && loggly !== null) {
      giLogProvider.setLogglyToken(loggly.key);
      giLogProvider.setLogglyTags("angular," + loggly.tags);
      return giLogProvider.setLogglyExtra(loggly.extra);
    }
  }
]);

angular.module('gi.util').directive('giMatch', [
  '$parse',
  'giLog',
  function($parse,
  Log) {
    return {
      require: '?ngModel',
      restrict: 'A',
      link: function(scope,
  elem,
  attrs,
  ctrl) {
        var evaluateMatch,
  getMatchValue,
  isRequired,
  matchGetter,
  requiredGetter;
        if (!ctrl) {
          Log.warn('giMatch validation requires ngModel to be on the element');
          return;
        } else {
          Log.debug('giMatch linked');
        }
        matchGetter = $parse(attrs.giMatch);
        requiredGetter = $parse(attrs.ngRequired);
        //So it feels like this function is surplus to requirements,
        //but without it wrapping the get Match VAlue function the $watch
        //doesn't fire when you need it to.
        evaluateMatch = function() {
          return getMatchValue();
        };
        //I can't see this function documented anywhere, so we should be careful
        scope.$watch(evaluateMatch,
  function(newVal) {
          return ctrl.$$parseAndValidate();
        });
        ctrl.$validators.giMatch = function() {
          var match;
          if (requiredGetter(scope)) {
            match = getMatchValue();
            if (match != null) {
              return ctrl.$viewValue === match;
            } else {
              //in this case, as there is no password, we have nothing to match
              return true;
            }
          } else {
            //We need not botther validating if the field is not required
            return true;
          }
        };
        isRequired = function() {
          return requiredGetter(scope);
        };
        return getMatchValue = function() {
          var match;
          match = matchGetter(scope);
          if (angular.isObject(match) && match.hasOwnProperty('$viewValue')) {
            match = match.$viewValue;
          }
          return match;
        };
      }
    };
  }
]);

angular.module('gi.util').provider('giAnalytics', function() {
  var enhancedEcommerce, google;
  google = null;
  enhancedEcommerce = false;
  if (typeof ga !== "undefined" && ga !== null) {
    google = ga;
  }
  this.$get = [
    'giLog',
    function(Log) {
      var requireGaPlugin,
    sendAddToCart,
    sendDetailView,
    sendImpression,
    sendPageView;
      requireGaPlugin = function(x) {
        Log.debug('ga requiring ' + x);
        if (google != null) {
          return google('require',
    x);
        }
      };
      sendImpression = function(obj) {
        if ((google != null) && (obj != null)) {
          if (!enhancedEcommerce) {
            requireGaPlugin('ec');
          }
          Log.debug('ga sending impression ' + obj.name);
          return google('ec:addImpression',
    obj);
        }
      };
      sendPageView = function() {
        if (google != null) {
          Log.debug('ga sending page view');
          return google('send',
    'pageview');
        }
      };
      sendAddToCart = function(obj) {
        if ((google != null) && (obj != null)) {
          if (!enhancedEcommerce) {
            requireGaPlugin('ec');
          }
          ga('ec:addProduct',
    obj);
          ga('ec:setAction',
    'add',
    {
            list: obj.category
          });
          return ga('send',
    'event',
    'UX',
    'click',
    'add to cart');
        }
      };
      sendDetailView = function(obj) {
        if ((google != null) && (obj != null)) {
          if (!enhancedEcommerce) {
            requireGaPlugin('ec');
          }
          sendPageView();
          ga('ec:addImpression',
    obj);
          return ga('send',
    'event',
    'Detail',
    'click',
    'View Detail: ' + obj.id,
    1);
        }
      };
      return {
        sendDetailView: sendDetailView,
        Impression: sendImpression,
        PageView: sendPageView,
        sendAddToCart: sendAddToCart
      };
    }
  ];
  return this;
});

angular.module('gi.util').factory('giCrud', [
  '$resource',
  '$q',
  'giSocket',
  function($resource,
  $q,
  Socket) {
    var factory,
  formDirectiveFactory;
    formDirectiveFactory = function(name,
  Model) {
      var formName,
  lowerName;
      lowerName = name.toLowerCase();
      formName = lowerName + 'Form';
      return {
        restrict: 'E',
        scope: {
          submitText: '@',
          model: '='
        },
        templateUrl: 'gi.commerce.' + formName + '.html',
        link: {
          pre: function($scope) {
            $scope.save = function() {
              $scope.model.selectedItem.acl = "public-read";
              return Model.save($scope.model.selectedItem).then(function() {
                var alert;
                alert = {
                  name: lowerName + '-saved',
                  type: 'success',
                  msg: name + " Saved."
                };
                $scope.$emit('event:show-alert',
  alert);
                $scope.$emit(lowerName + '-saved',
  $scope.model.selectedItem);
                return $scope.clear();
              },
  function(err) {
                var alert;
                alert = {
                  name: lowerName + '-not-saved',
                  type: 'danger',
                  msg: "Failed to save " + name + ". " + err.data.error
                };
                return $scope.$emit('event:show-alert',
  alert);
              });
            };
            $scope.clear = function() {
              $scope.model.selectedItem = {};
              $scope[formName].$setPristine();
              $scope.confirm = false;
              return $scope.$emit(lowerName + '-form-cleared');
            };
            return $scope.destroy = function() {
              if ($scope.confirm) {
                return Model.destroy($scope.model.selectedItem._id).then(function() {
                  var alert;
                  alert = {
                    name: lowerName + '-deleted',
                    type: 'success',
                    msg: name + ' Deleted.'
                  };
                  $scope.$emit('event:show-alert',
  alert);
                  $scope.$emit(lowerName + '-deleted');
                  return $scope.clear();
                },
  function() {
                  var alert;
                  alert = {
                    name: name + " not deleted",
                    msg: name + " not deleted.",
                    type: "warning"
                  };
                  $scope.$emit('event:show-alert',
  alert);
                  return $scope.confirm = false;
                });
              } else {
                return $scope.confirm = true;
              }
            };
          }
        }
      };
    };
    factory = function(resourceName,
  prefix,
  idField) {
      var _version,
  all,
  allCached,
  bulkMethods,
  bulkResource,
  clearCache,
  count,
  destroy,
  exports,
  get,
  getCached,
  items,
  itemsById,
  methods,
  queryMethods,
  queryResource,
  resource,
  save,
  updateMasterList,
  version;
      if (prefix == null) {
        prefix = '/api';
      }
      if (idField == null) {
        idField = '_id';
      }
      methods = {
        query: {
          method: 'GET',
          params: {},
          isArray: true
        },
        save: {
          method: 'PUT',
          params: {},
          isArray: false
        },
        create: {
          method: 'POST',
          params: {},
          isArray: false
        }
      };
      bulkMethods = {
        save: {
          method: 'PUT',
          params: {},
          isArray: true
        }
      };
      queryMethods = {
        query: {
          method: 'POST',
          params: {},
          isArray: true
        }
      };
      bulkResource = $resource(prefix + '/' + resourceName + '',
  {},
  bulkMethods);
      resource = $resource(prefix + '/' + resourceName + '/:id',
  {},
  methods);
      queryResource = $resource(prefix + '/' + resourceName + '/query',
  {},
  queryMethods);
      items = [];
      itemsById = {};
      updateMasterList = function(newItem) {
        var replaced;
        replaced = false;
        if (angular.isArray(newItem)) {
          angular.forEach(newItem,
  function(newRec,
  i) {
            // Nice quick check if the item already exists in the master list
            replaced = false;
            if (itemsById[newRec[idField]] != null) {
              // Find and update
              angular.forEach(items,
  function(item,
  j) {
                if (!replaced) {
                  if (item[idField] === newRec[idField]) {
                    items[j] = newRec;
                    return replaced = true;
                  }
                }
              });
            } else {
              items.push(newRec);
            }
            return itemsById[newRec[idField]] = newRec;
          });
        } else {
          replaced = false;
          angular.forEach(items,
  function(item,
  index) {
            if (!replaced) {
              if (newItem[idField] === item[idField]) {
                replaced = true;
                return items[index] = newItem;
              }
            }
          });
          if (!replaced) {
            items.push(newItem);
          }
          itemsById[newItem[idField]] = newItem;
        }
      };
      all = function(params) {
        var cacheable,
  deferred,
  options,
  r;
        deferred = $q.defer();
        options = {};
        cacheable = true;
        r = resource;
        if ((params == null) && items.length > 0) {
          deferred.resolve(items);
        } else {
          if (params != null) {
            cacheable = false;
          }
          options = params;
          if ((params != null ? params.query : void 0) != null) {
            r = queryResource;
          }
          r.query(options,
  function(results) {
            if (cacheable) {
              items = results;
              angular.forEach(results,
  function(item,
  index) {
                return itemsById[item[idField]] = item;
              });
            }
            return deferred.resolve(results);
          },
  function(err) {
            return deferred.reject(err);
          });
        }
        return deferred.promise;
      };
      save = function(item) {
        var deferred;
        deferred = $q.defer();
        if (angular.isArray(item)) {
          bulkResource.save({},
  item,
  function(result) {
            updateMasterList(result);
            return deferred.resolve(result);
          },
  function(failure) {
            return deferred.reject(failure);
          });
        } else {
          if (item[idField]) {
            //we are updating
            resource.save({
              id: item[idField]
            },
  item,
  function(result) {
              updateMasterList(result);
              return deferred.resolve(result);
            },
  function(failure) {
              return deferred.reject(failure);
            });
          } else {
            //we are createing a new object on the server
            resource.create({},
  item,
  function(result) {
              updateMasterList(result);
              return deferred.resolve(result);
            },
  function(failure) {
              return deferred.reject(failure);
            });
          }
        }
        return deferred.promise;
      };
      getCached = function(id) {
        return itemsById[id];
      };
      allCached = function() {
        return items;
      };
      get = function(id) {
        var deferred;
        deferred = $q.defer();
        resource.get({
          id: id
        },
  function(item) {
          if (items.length > 0) {
            updateMasterList(item);
          }
          return deferred.resolve(item);
        },
  function(err) {
          return deferred.reject(err);
        });
        return deferred.promise;
      };
      destroy = function(id) {
        var deferred;
        deferred = $q.defer();
        resource.delete({
          id: id
        },
  function() {
          var removed;
          removed = false;
          delete itemsById[id];
          angular.forEach(items,
  function(item,
  index) {
            if (!removed) {
              if (item[idField] === id) {
                removed = true;
                return items.splice(index,
  1);
              }
            }
          });
          return deferred.resolve();
        },
  function(err) {
          return deferred.reject(err);
        });
        return deferred.promise;
      };
      count = function() {
        return items.length;
      };
      clearCache = function() {
        items = [];
        return itemsById = {};
      };
      Socket.emit('watch:' + resourceName);
      Socket.on(resourceName + '_created',
  function(data) {
        updateMasterList(data);
        return _version += 1;
      });
      Socket.on(resourceName + '_updated',
  function(data) {
        updateMasterList(data);
        return _version += 1;
      });
      _version = 0;
      version = function() {
        return _version;
      };
      exports = {
        query: all,
        all: all,
        cache: updateMasterList,
        get: get,
        getCached: getCached,
        allCached: allCached,
        destroy: destroy,
        save: save,
        count: count,
        version: version,
        clearCache: clearCache
      };
      return exports;
    };
    return {
      //export the crud factory method
      factory: factory,
      formDirectiveFactory: formDirectiveFactory
    };
  }
]);

angular.module('gi.util').factory('giGeo', [
  '$q',
  '$http',
  '$cookieStore',
  function($q,
  $http,
  $cookies) {
    var cookieID;
    cookieID = "giGeo";
    return {
      country: function() {
        var deferred,
  geoInfo;
        deferred = $q.defer();
        geoInfo = $cookies.get(cookieID);
        if (geoInfo == null) {
          $http.get("/api/geoip").success(function(info) {
            $cookies.put(cookieID,
  info);
            return deferred.resolve(info.country_code);
          }).error(function(data) {
            return deferred.reject(data);
          });
        } else {
          deferred.resolve(geoInfo.country_code);
        }
        return deferred.promise;
      }
    };
  }
]);

angular.module('gi.util').provider('giI18n', [
  function() {
    var countries,
  defaultCountryCode;
    countries = {};
    defaultCountryCode = "ROW";
    this.setMessagesForCountry = function(messages,
  countryCode) {
      if (countries[countryCode] == null) {
        countries[countryCode] = {};
      }
      return angular.forEach(messages,
  function(msg) {
        return countries[countryCode][msg.key] = msg.value;
      });
    };
    this.setDefaultCountry = function(countryCode) {
      return defaultCountryCode = countryCode;
    };
    this.$get = [
      function() {
        var messages;
        messages = countries[defaultCountryCode];
        return {
          setCountry: function(countryCode) {
            if (countries[countryCode] != null) {
              return messages = countries[countryCode];
            } else if (countries[defaultCountryCode] != null) {
              return messages = countries[defaultCountryCode];
            }
          },
          getMessage: function(messageKey) {
            return messages[messageKey] || "";
          },
          getCapitalisedMessage: function(messageKey) {
            var msg;
            msg = messages[messageKey];
            if (msg != null) {
              return msg.charAt(0).toUpperCase() + msg.slice(1);
            } else {
              return "";
            }
          }
        };
      }
    ];
    return this;
  }
]);

angular.module('gi.util').factory('giLocalStorage', [
  '$window',
  function($window) {
    return {
      get: function(key) {
        if ($window.localStorage[key]) {
          return angular.fromJson($window.localStorage[key]);
        } else {
          return false;
        }
      },
      set: function(key,
  val) {
        if (val == null) {
          $window.localStorage.removeItem(key);
        } else {
          $window.localStorage[key] = angular.toJson(val);
        }
        return $window.localStorage[key];
      }
    };
  }
]);

angular.module('gi.util').provider('giLog', [
  'LogglyLoggerProvider',
  function(LogglyLoggerProvider) {
    var prefix,
  wrap;
    prefix = "";
    this.setLogglyToken = function(token) {
      if (token != null) {
        return LogglyLoggerProvider.inputToken(token);
      }
    };
    this.setLogglyTags = function(tags) {
      if (tags != null) {
        return LogglyLoggerProvider.inputTag(tags);
      }
    };
    this.setLogglyExtra = function(extra) {
      if (extra != null) {
        LogglyLoggerProvider.setExtra(extra);
      }
      if (extra.customer != null) {
        prefix += extra.customer;
      } else {
        prefix = "NO CUSTOMER";
      }
      if (extra.product != null) {
        prefix += ":" + extra.product;
      }
      if (extra.environment != null) {
        prefix += ":" + extra.environment;
      }
      if (extra.version != null) {
        prefix += ":" + extra.version;
      }
      return prefix += ": ";
    };
    wrap = function(msg) {
      var obj;
      if ((typeof msg) === 'string') {
        return prefix + msg;
      } else {
        obj = {
          prefix: prefix,
          message: msg
        };
        return obj;
      }
    };
    this.$get = [
      '$log',
      function($log) {
        return {
          log: function(msg) {
            return $log.log(wrap(msg));
          },
          debug: function(msg) {
            return $log.debug(wrap(msg));
          },
          info: function(msg) {
            return $log.info(wrap(msg));
          },
          warn: function(msg) {
            return $log.warn(wrap(msg));
          },
          error: function(msg) {
            return $log.warn(wrap(msg));
          }
        };
      }
    ];
    return this;
  }
]);

angular.module('gi.util').factory('giSocket', [
  '$rootScope',
  function($rootScope) {
    var socket;
    if (typeof io !== "undefined" && io !== null) {
      socket = io.connect();
    }
    return {
      on: function(eventName,
  callback) {
        if (typeof io !== "undefined" && io !== null) {
          return socket.on(eventName,
  function() {
            var args;
            // This is some javascript magic proto inheritance maybe?
            // Tried taking it out and it breaks, but no idea where
            // the arguments variable comes from
            args = arguments;
            if (callback) {
              return $rootScope.$apply(function() {
                return callback.apply(socket,
  args);
              });
            }
          });
        }
      },
      emit: function(eventName,
  data,
  callback) {
        if (typeof io !== "undefined" && io !== null) {
          return socket.emit(eventName,
  data,
  function() {
            var args;
            args = arguments;
            if (callback) {
              return $rootScope.$apply(function() {
                return callback.apply(socket,
  args);
              });
            }
          });
        }
      }
    };
  }
]);

var indexOf = [].indexOf;

angular.module('gi.util').factory('giUtil', [
  function() {
    return {
      emailRegex: /^[0-9a-zA-Z][-0-9a-zA-Z.+_]*@[-0-9a-zA-Z.+_]+\.[a-zA-Z]{2,4}$/,
      vatRegex: /^(AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|GB|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|SE|SI|SK|RO)(\w{8,12})$/,
      countrySort: function(topCodes) {
        return function(country) {
          var index,
  ref;
          if ((country != null ? country.code : void 0) != null) {
            index = (ref = country.code,
  indexOf.call(topCodes,
  ref) >= 0);
            if (index) {
              return topCodes.indexOf(country.code);
            } else {
              return country.name;
            }
          }
          return "";
        };
      }
    };
  }
]);

var mongo, sql;

mongo = require('./mongo');

sql = require('./sql');

module.exports = {
  mongo: mongo,
  sql: sql
};

var _, connectMongo, crudModelFactory, getConnectionString, modelFactory, mongoose, schemaFactory;

_ = require('underscore');

mongoose = require('mongoose');

crudModelFactory = require('../crudModelFactory');

connectMongo = require('connect-mongo');

getConnectionString = function(conf) {
  var separator, uri;
  if (conf.connectionString) {
    return conf.connectionString;
  } else {
    uri = "mongodb://";
    if (conf.username != null) {
      uri += conf.username + ":" + conf.password + "@";
    }
    separator = "";
    if (conf.servers != null) {
      _.each(conf.servers, function(server) {
        uri += separator + server.host + ":" + server.port;
        return separator = ",";
      });
    } else {
      uri += conf.host + ":" + conf.port;
    }
    uri += "/" + conf.name;
    if (conf.ssl) {
      uri += "?ssl=true";
    } else {
      uri += "?ssl=false";
    }
    if (conf.authSource != null) {
      uri += "&authSource=" + conf.authSource;
    }
    return uri;
  }
};

schemaFactory = function(def) {
  var _schema;
  if (def.options != null) {
    _schema = new mongoose.Schema(def.schemaDefinition, def.options);
  } else {
    _schema = new mongoose.Schema(def.schemaDefinition);
  }
  return _schema;
};

modelFactory = function(def) {
  var ref;
  if (mongoose.models[def.name]) {
    return mongoose.model(def.name);
  } else if (((ref = def.options) != null ? ref.collectionName : void 0) != null) {
    return mongoose.model(def.name, def.schema, def.options.collectionName);
  } else {
    return mongoose.model(def.name, def.schema);
  }
};

module.exports = {
  connect: function(conf, cb) {
    var port, uri;
    port = parseInt(conf.port);
    uri = getConnectionString(conf);
    mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    mongoose.connection.on('connected', function() {
      if (cb) {
        return cb();
      }
    });
    return mongoose.connection.on('error', function(err) {
      if (cb) {
        return cb(err);
      }
    });
  },
  sessionStore: function(express, conf, cb) {
    var options, sessionStore;
    options = {
      mongoUrl: getConnectionString(conf),
      autoRemove: "interval",
      mongoOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    };
    //MongoStore = new connectMongo(express)
    sessionStore = connectMongo.create(options);
    return sessionStore;
  },
  crudFactory: crudModelFactory,
  modelFactory: modelFactory,
  schemaFactory: schemaFactory
};

var processQueryQueue, queryQueue, queueInProgress, runQuery, tedious;

tedious = require('tedious');

queryQueue = [];

queueInProgress = false;

processQueryQueue = function() {
  var conn, debug, nextQuery, request, result;
  nextQuery = queryQueue.shift();
  if (nextQuery != null) {
    queueInProgress = true;
    result = [];
    debug = nextQuery.query.indexOf("SELECT") !== 0;
    if (debug) {
      console.log(nextQuery.query);
    }
    conn = new tedious.Connection(nextQuery.conn);
    request = new tedious.Request(nextQuery.query, function(err, rowCount) {
      conn.close();
      if (err) {
        nextQuery.cb(err);
      } else {
        if (nextQuery.returnArray) {
          nextQuery.cb(null, result);
        } else {
          if (result[0]) {
            nextQuery.cb(null, result[0]);
          } else {
            nextQuery.cb(null, {});
          }
        }
      }
      //recursive call to process anything else on the queue
      return processQueryQueue();
    });
    request.on('row', function(columns) {
      var obj;
      obj = {};
      columns.forEach(function(column) {
        return obj[column.metadata.colName] = column.value;
      });
      return result.push(obj);
    });
    return conn.on('connect', function(err) {
      if (err) {
        console.log('error with sql connection ' + err);
        nextQuery.cb(err);
        //recursive call to process anything else on the queue
        return processQueryQueue();
      } else {
        return conn.execSql(request);
      }
    });
  } else {
    queueInProgress = false;
  }
};

runQuery = function(query, returnArray, connConf, cb) {
  var obj;
  obj = {
    query: query,
    returnArray: returnArray,
    conn: connConf,
    cb: cb
  };
  queryQueue.push(obj);
  if (!queueInProgress) {
    processQueryQueue();
  }
};

module.exports = {
  runQuery: runQuery,
  _processQueryQueue: processQueryQueue
};

var QueryBuilder, crudModelFactory, modelFactory, queryQueue, schemaFactory, sqlHelper, tedious;

tedious = require('tedious');

crudModelFactory = require('../crudModelFactory');

queryQueue = require('./queryQueue');

sqlHelper = require('./sqlHelper');

QueryBuilder = class QueryBuilder {
  constructor(table, dbConnection1, idColumn1) {
    this.table = table;
    this.dbConnection = dbConnection1;
    this.idColumn = idColumn1;
    this.query = "";
    this.returnArray = true;
  }

  exec(cb) {
    return queryQueue.runQuery(this.query, this.returnArray, this.dbConnection, cb);
  }

  create(obj, cb) {
    var key, separator, value, values;
    this.returnArray = false;
    values = "VALUES";
    this.query = 'INSERT INTO ' + this.table;
    separator = ' (';
    for (key in obj) {
      value = obj[key];
      values += separator + "'" + value + "'";
      this.query += separator + key;
      separator = ', ';
    }
    this.query += ') OUTPUT INSERTED.* ' + values + ') ';
    return this.exec(cb);
  }

  find(query, cb) {
    this.returnArray = true;
    this.query = "SELECT * FROM " + this.table;
    this.query += sqlHelper.generateWhereClause(query);
    if (cb != null) {
      return this.exec(cb);
    } else {
      return this;
    }
  }

  findOne(query, cb) {
    this.returnArray = false;
    this.query = 'SELECT TOP 1 * FROM ' + this.table;
    this.query += sqlHelper.generateWhereClause(query);
    if (cb != null) {
      return this.exec(cb);
    } else {
      return this;
    }
  }

  sort(query, cb) {
    //TODO: add sort@query = @query + " ORDER BY "
    if (cb != null) {
      return this.exec(cb);
    } else {
      return this;
    }
  }

  skip(num, cb) {
    //TODO: add pagination sort@query = @query + " ORDER BY "
    if (cb != null) {
      return this.exec(cb);
    } else {
      return this;
    }
  }

  limit(num, cb) {
    //TODO: add Top num to query
    if (cb != null) {
      return this.exec(cb);
    } else {
      return this;
    }
  }

  count(query, cb) {
    this.query = 'SELECT COUNT(*) FROM ' + this.table;
    if (cb != null) {
      return this.exec(cb);
    } else {
      return this;
    }
  }

  findByIdAndUpdate(id, obj, cb) {
    var key, separator, value;
    this.returnArray = false;
    value = "";
    this.query = 'UPDATE ' + this.table + ' SET';
    separator = '';
    for (key in obj) {
      value = obj[key];
      if (key !== this.idColumn) {
        if (value != null) {
          this.query += separator + " " + key + "= '" + value + "'";
          separator = ',';
        }
      }
    }
    this.query += ' WHERE ' + this.idColumn + ' = ' + id;
    if (cb) {
      return this.exec((err, obj) => {
        var query;
        if (err) {
          return cb(err, obj);
        } else {
          query = {};
          query[this.idColumn] = id;
          return this.findOne(query, cb);
        }
      });
    } else {
      return this;
    }
  }

  remove(query, cb) {
    this.returnArray = false;
    this.query = 'DELETE FROM ' + this.table + ' WHERE ' + this.idColumn + ' = ' + query[this.idColumn];
    if (cb != null) {
      return this.exec(cb);
    } else {
      return this;
    }
  }

};

schemaFactory = function(def) {
  return {
    schema: def.schemaDefinition,
    virtual: function(name) {
      return {
        get: function(fn) {},
        set: function(fn) {}
      };
    },
    methods: {},
    pre: function(event, fn) {}
  };
};

modelFactory = function(def, dbConnection) {
  var collectionName, idColumn, qb, ref, ref1;
  collectionName = def.name;
  if (((ref = def.options) != null ? ref.collectionName : void 0) != null) {
    collectionName = def.options.collectionName;
  }
  idColumn = "_id";
  if (((ref1 = def.options) != null ? ref1.idColumn : void 0) != null) {
    idColumn = def.options.idColumn;
  }
  qb = new def.Qb(collectionName, dbConnection, idColumn);
  qb.modelName = def.name;
  return qb;
};

module.exports = {
  connect: function(conf) {
    var dbConnection;
    dbConnection = new tedious.Connection(conf);
    return dbConnection;
  },
  QueryBuilder: QueryBuilder,
  schemaFactory: schemaFactory,
  modelFactory: modelFactory,
  crudFactory: crudModelFactory
};

var _, generateWhereClause;

_ = require('underscore');

generateWhereClause = function(query) {
  var clause;
  clause = "";
  _.each(query, function(value, key) {
    if (clause === "") {
      clause = " WHERE ";
    } else {
      clause = clause + " AND ";
    }
    if (value.$gt != null) {
      return clause = clause + key + " > '" + value.$gt + "'";
    } else if (value.$gte != null) {
      return clause = clause + key + " >= '" + value.$gte + "'";
    } else if (value.$lt != null) {
      return clause = clause + key + " < '" + value.$lt + "'";
    } else if (value.$lte != null) {
      return clause = clause + key + " <= '" + value.$lte + "'";
    } else {
      return clause = clause + key + " = '" + value + "'";
    }
  });
  return clause;
};

module.exports = {
  generateWhereClause: generateWhereClause
};

module.exports = require('./requestOptions');

var moment, processSplit, processSplits;

moment = require('moment');

processSplit = function(split) {
  var date, result, splits2;
  result = null;
  if (split.indexOf('|') !== -1) {
    splits2 = split.split('|');
    switch (splits2[0]) {
      case "lt":
        result = {
          $lt: splits2[1]
        };
        break;
      case "ltdate":
        date = moment(splits2[1], ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss"]);
        result = {
          $lt: date
        };
        break;
      case "lte":
        result = {
          $lte: splits2[1]
        };
        break;
      case "gt":
        result = {
          $gt: splits2[1]
        };
        break;
      case "gtdate":
        date = moment(splits2[1], ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss"]);
        result = {
          $gt: date
        };
        break;
      case "gte":
        result = {
          $gte: splits2[1]
        };
        break;
      case "exists":
        result = {
          $exists: splits2[1] === "true"
        };
        break;
      case "startswith":
        result = {
          $regex: new RegExp("^" + splits2[1], "i")
        };
    }
  } else {
    result = split;
    switch (split) {
      case "isnull":
        result = {
          $type: 10
        };
    }
  }
  return result;
};

processSplits = function(splits, k) {
  var results;
  results = [];
  splits.forEach((split) => {
    var obj;
    obj = {};
    obj[k] = this.processSplit(split);
    return results.push(obj);
  });
  return results;
};

module.exports = {
  processSplit: processSplit,
  processSplits: processSplits
};

var splitter;

splitter = require('./querySplitter');

module.exports = {
  getOptions: function(req, model) {
    var i, k, len, options, parent, ref, ref1, splits, v, x;
    options = {
      query: {
        systemId: req.systemId
      }
    };
    if (req.giFilter != null) {
      //are there any restrictions on this model
      if (req.giFilter[model.name]) {
        options.query._id = req.giFilter[model.name];
      }
      //are there any parent restrictions we need
      //to take into account
      if (model.relations != null) {
        ref = model.relations().parents;
        for (i = 0, len = ref.length; i < len; i++) {
          parent = ref[i];
          if (req.giFilter[parent.modelName]) {
            options.query[parent.field] = req.giFilter[parent.modelName];
          }
        }
      }
    }
    ref1 = req.query;
    for (k in ref1) {
      v = ref1[k];
      if (k === 'max') {
        if (!isNaN(v)) {
          if (v < 1) {
            options.max = 0;
          } else {
            options.max = v;
          }
        }
      } else if (k === 'sort') {
        options.sort = v;
      } else if (k === 'page') {
        options.page = v;
      } else {
        if (v.indexOf('*and*') !== -1) {
          splits = v.split('*and*');
          options.query.$and = (function() {
            var j, len1, ref2, results;
            ref2 = splitter.processSplits(splits, k);
            results = [];
            for (j = 0, len1 = ref2.length; j < len1; j++) {
              x = ref2[j];
              results.push(x);
            }
            return results;
          })();
        } else if (v.indexOf('*or*') !== -1) {
          splits = v.split('*or*');
          options.query.$or = (function() {
            var j, len1, ref2, results;
            ref2 = splitter.processSplits(splits, k);
            results = [];
            for (j = 0, len1 = ref2.length; j < len1; j++) {
              x = ref2[j];
              results.push(x);
            }
            return results;
          })();
        } else {
          options.query[k] = splitter.processSplit(v, k);
        }
      }
    }
    return options;
  }
};

var common, configure, controllers, middleware, models, routes;

common = require('./common');

routes = require('./routes');

middleware = require('./middleware');

models = require('./models');

controllers = require('./controllers');

middleware = require('./middleware');

configure = function(app, dal) {
  common.extend(app.models, models(dal));
  common.extend(app.controllers, controllers(app));
  common.extend(app.middleware, middleware);
  common.configure();
  return routes.configure(app, common.rest);
};

module.exports = {
  common: common,
  mocks: require('../test/server/mocks'),
  configure: configure,
  middleware: middleware
};

var configure;

configure = function(app, rest) {
  rest.routeResource('timePatterns', app, app.middleware.userAction, app.controllers.timePattern);
  return app.get('/api/geoip', app.middleware.publicAction, app.controllers.geoip.my);
};

exports.configure = configure;

var _, async, helper;

helper = require('../controllers/helper');

_ = require('underscore');

async = require('async');

module.exports = function(model) {
  var bulkUpdate, count, create, destroy, index, show, update;
  index = function(req, res, next) {
    var options;
    if (req.method.toUpperCase() === "POST") {
      options = req.body;
      if (options.query != null) {
        options.query.systemId = req.systemId;
      }
    } else {
      options = helper.getOptions(req, model);
    }
    return model.find(options, function(err, result, pageCount) {
      if (err) {
        return res.status(404).json(err); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
      } else {
        if (next) {
          res.giResult = result;
          return next();
        } else {
          return res.status(200).json(result); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        }
      }
    });
  };
  bulkUpdate = function(req, res, next) {
    var errors, results;
    errors = [];
    results = [];
    return async.each(req.body, function(obj, cb) {
      obj.systemId = req.systemId;
      if (obj._id != null) {
        return model.update(obj._id, obj, function(err, result) {
          if (err) {
            errors.push({
              message: err,
              obj: obj
            });
            return cb();
          } else if (result) {
            results.push({
              message: "ok",
              obj: result
            });
            return cb();
          } else {
            errors.push({
              message: "create failed for reasons unknown",
              obj: obj
            });
            return cb();
          }
        });
      } else {
        return model.create(obj, function(err, result) {
          if (err) {
            errors.push({
              message: err,
              obj: obj
            });
            return cb();
          } else if (result) {
            results.push({
              message: "ok",
              obj: result
            });
            return cb();
          } else {
            errors.push({
              message: "create failed for reasons unknown",
              obj: obj
            });
            return cb();
          }
        });
      }
    }, function() {
      var resultCode;
      resultCode = 200;
      if (errors.length > 0) {
        resultCode = 500;
      }
      if (next) {
        res.giResult = errors.concat(results);
        res.giResultCode = resultCode;
        return next();
      } else {
        return res.status(resultCode).json(errors.concat(results)); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
      }
    });
  };
  create = function(req, res, next) {
    var errors, results;
    if (_.isArray(req.body)) {
      errors = [];
      results = [];
      return async.each(req.body, function(obj, cb) {
        obj.systemId = req.systemId;
        return model.create(obj, function(err, result) {
          if (err) {
            errors.push({
              message: err,
              obj: obj
            });
            return cb();
          } else if (result) {
            results.push({
              message: "ok",
              obj: obj
            });
            return cb();
          } else {
            errors.push({
              message: "create failed for reasons unknown",
              obj: obj
            });
            return cb();
          }
        });
      }, function() {
        var resultCode;
        resultCode = 200;
        if (errors.length > 0) {
          resultCode = 500;
        }
        if (next) {
          res.giResult = errors.concat(results);
          res.giResultCode = resultCode;
          return next();
        } else {
          return res.status(resultCode).json(errors.concat(results)); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        }
      });
    } else {
      req.body.systemId = req.systemId;
      return model.create(req.body, function(err, obj) {
        if (err) {
          return res.status(500).json({
            error: err.toString() //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          });
        } else {
          if (next) {
            res.giResult = obj;
            return next();
          } else {
            return res.status(200).json(obj); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          }
        }
      });
    }
  };
  show = function(req, res, next) {
    var ref;
    if (((ref = req.params) != null ? ref.id : void 0) && req.systemId) {
      return model.findById(req.params.id, req.systemId, function(err, obj) {
        if (err) {
          return res.status(404).json(); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        } else if (obj) {
          if (next) {
            res.giResult = obj;
            return next();
          } else {
            return res.status(200).json(obj); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          }
        } else {
          return res.status(404).json(); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        }
      });
    } else {
      return res.status(404).json(); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    }
  };
  update = function(req, res, next) {
    var payload, ref;
    if (((ref = req.params) != null ? ref.id : void 0) && req.systemId) {
      req.body.systemId = req.systemId;
      // wierdly, mongoose doesn't work if you put an id
      // in the update payload
      payload = req.body;
      if (req.body._id) {
        delete payload._id;
      }
      return model.update(req.params.id, payload, function(err, obj) {
        if (err) {
          return res.status(400).json({
            message: err //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          });
        } else {
          if (next) {
            res.giResult = obj;
            return next();
          } else {
            return res.status(200).json(obj); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          }
        }
      });
    } else {
      return res.status(400).json(); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    }
  };
  destroy = function(req, res, next) {
    var ref;
    if (((ref = req.params) != null ? ref.id : void 0) && req.systemId) {
      return model.destroy(req.params.id, req.systemId, function(err) {
        if (err) {
          return res.status(400).json({
            message: err //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          });
        } else {
          if (next) {
            res.giResult = 'Ok';
            return next();
          } else {
            return res.status(200).json(); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          }
        }
      });
    } else {
      return res.status(404).json(); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    }
  };
  count = function(req, res, next) {
    var options;
    options = helper.getOptions(req, model);
    return model.countDocuments(options.query, function(err, result) {
      if (err) {
        return res.status(404).json({
          message: err //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        });
      } else {
        if (next) {
          res.giResult = {
            count: result
          };
          return next();
        } else {
          return res.status(200).json(result); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        }
      }
    });
  };
  return {
    name: model.name,
    index: index,
    create: create,
    show: show,
    update: update,
    destroy: destroy,
    count: count,
    bulkUpdate: bulkUpdate
  };
};

var _;

_ = require('underscore');

module.exports = function(Resource) {
  var aggregate, aggregateWithCursor, count, create, destroy, find, findById, findOne, findOneBy, findWithCursor, update;
  count = async function(query, callback) {
    if (query.systemId == null) {
      return callback('Cannot count ' + Resource.modelName + '- no SystemId', null);
    } else {
      count = (await Resource.countDocuments(query));
      return callback(null, count);
    }
  };
  find = async function(options, callback) {
    var command, e, found, max, page, pageCount, populate, query, results, skipFrom, sort;
    //console.log options
    if (options != null) {
      if (options.max != null) {
        max = parseInt(options.max);
      }
      //else
      //  max = 10000
      if (options.sort != null) {
        sort = 'field ' + options.sort;
      } else {
        sort = {};
      }
      if (options.page != null) {
        page = options.page;
      } else {
        page = 1;
      }
      if (options.populate != null) {
        populate = options.populate;
      } else {
        populate = null;
      }
      if ((options.query != null) && (options.query.systemId != null)) {
        query = options.query;
      } else if (options.query.$and != null) {
        //Check that at least one of the $and operators contains the systemId query
        found = _.find(options.query.$and, function(queryPart) {
          return queryPart.systemId != null;
        });
        if (found) {
          query = options.query;
        } else {
          if (callback) {
            callback('systemId not specified as one of the $and conditions', null, 0, 0);
          }
          return;
        }
      } else {
        if (callback) {
          callback('systemId not specified in query', null, 0, 0);
        }
        return;
      }
    } else {
      if (callback) {
        callback('options must be specfied for find', null, 0, 0);
      }
      return;
    }
    skipFrom = page * max - max;
    if (max < 1) {
      if (callback) {
        return callback(null, [], 0, 0);
      }
    } else {
      try {
        command = Resource.find(query).sort(sort).skip(skipFrom).limit(max);
        if (options.populate != null) {
          command.populate(populate);
        }
        if (options.select != null) {
          command.select(options.select);
        }
        results = (await command);
        if (!results) {
          return callback(err, null, 0);
        } else {
          count = (await Resource.countDocuments(query));
          //safe because max >= 1
          pageCount = Math.ceil(count / max) || 0;
          if (callback) {
            return callback(null, results, pageCount, count);
          }
        }
      } catch (error) {
        e = error;
        console.debug("GI-UTIL find ERROR: ");
        console.debug(e);
        console.debug("Query was: ");
        console.debug(JSON.stringify(query));
        return callback(e);
      }
    }
  };
  findOne = async function(query, callback) {
    var e, resource;
    if ((query == null) || (query.systemId == null)) {
      return callback('Cannot find ' + Resource.modelName + ' - no SystemId', null);
    } else {
      try {
        resource = (await Resource.findOne(query));
        if (!resource) {
          if (callback) {
            return callback('No resource');
          }
        } else if (resource) {
          if (callback) {
            return callback(null, resource);
          }
        } else {
          if (callback) {
            return callback('Cannot find ' + Resource.modelName);
          }
        }
      } catch (error) {
        e = error;
        console.debug("GI-UTIL findOne ERROR: ");
        console.debug(e);
        console.debug("Query was: ");
        console.debug(JSON.stringify(query));
        return callback(e);
      }
    }
  };
  findOneBy = function(key, value, systemId, callback) {
    var query;
    query = {
      systemId: systemId
    };
    query[key] = value;
    return this.findOne(query, callback);
  };
  findById = function(id, systemId, callback) {
    return this.findOneBy('_id', id, systemId, callback);
  };
  findWithCursor = function(opts) {
    var command;
    command = Resource.find(opts.query);
    if (opts.sort != null) {
      command.sort(opts.sort);
    }
    if (opts.populate != null) {
      command.populate(opts.populate);
    }
    if (opts.select != null) {
      command.select(opts.select);
    }
    return command.cursor();
  };
  create = async function(json, callback) {
    var resource;
    if (json.systemId == null) {
      return callback(Resource.modelName + ' could not be created - no systemId');
    } else {
      resource = (await Resource.create(json));
      if (!resource) {
        return callback('No resource');
      } else if (resource) {
        return callback(null, resource);
      } else {
        return callback(Resource.modelName + ' could not be saved');
      }
    }
  };
  update = async function(id, json, callback) {
    var resource;
    if (json.systemId == null) {
      return callback(Resource.modelName + ' could not be updated - no systemId');
    } else {
      resource = (await Resource.findByIdAndUpdate(id, json, {
        new: true
      }));
      if (!resource) {
        return callback('No resource');
      } else if (resource) {
        return callback(null, resource);
      } else {
        return callback(Resource.modelName + ' could not be saved');
      }
    }
  };
  destroy = async function(id, systemId, callback) {
    var deleteResource, resource;
    if (systemId == null) {
      return callback('Could not destroy ' + Resource.modelName + ' - no systemId');
    } else {
      resource = (await Resource.findOne({
        _id: id,
        systemId: systemId
      }));
      if (!resource) {
        return callback('No resource to destroy');
      } else if (resource) {
        deleteResource = (await Resource.deleteOne({
          _id: resource._id,
          systemId: systemId
        }));
        return callback(null, deleteResource);
      } else {
        return callback(Resource.modelName + ' could not be destroyed');
      }
    }
  };
  aggregate = async function(steps, callback) {
    var resource;
    resource = (await Resource.aggregate(steps));
    if (!resource) {
      return callback('No resource');
    } else if (resource) {
      return callback(null, resource);
    } else {
      return callback(Resource.modelName + ' could not be found');
    }
  };
  aggregateWithCursor = async function(steps) {
    var resource;
    resource = (await Resource.aggregate(steps).allowDiskUse(true).cursor({
      batchSize: 0
    }));
    return resource;
  };
  return {
    find: find,
    findById: findById,
    findOne: findOne,
    findOneBy: findOneBy,
    findWithCursor: findWithCursor,
    create: create,
    update: update,
    destroy: destroy,
    name: Resource.modelName,
    count: count,
    aggregate: aggregate,
    aggregateWithCursor: aggregateWithCursor
  };
};

var extend, log;

extend = function(object, properties) {
  var key, val;
  for (key in properties) {
    val = properties[key];
    object[key] = val;
  }
  return object;
};

log = require("./log");

module.exports = {
  extend: extend,
  rest: require('./rest'),
  timePatterns: require('../../common/timePatterns'),
  dal: require('./dal'),
  crudControllerFactory: require('./crudControllerFactory'),
  crudModelFactory: require('./crudModelFactory'),
  log: log.log,
  configure: log.configure
};

var configure, log, loggly, logglyClient, prefix, tags;

loggly = require('loggly');

logglyClient = null;

prefix = "";

tags = [];

configure = function() {
  var customer, environment, product, version;
  customer = process.env.GI_CUSTOMER;
  product = process.env.GI_PRODUCT;
  environment = process.env.GI_APP_ENVIRONMENT;
  version = process.env.GI_APP_VERSION;
  if (customer != null) {
    prefix += customer;
    tags.push(customer);
  } else {
    prefix = "NO CUSTOMER";
    tags.push(["NO CUSTOMER"]);
  }
  if (product != null) {
    prefix += ":" + product;
    tags.push(product);
  }
  if (environment != null) {
    prefix += ":" + environment;
    tags.push(environment);
  }
  if (version != null) {
    prefix += ":" + version;
    tags.push(version);
  }
  prefix += ": ";
  if (process.env.LOGGLY_API_KEY != null) {
    return logglyClient = loggly.createClient({
      token: process.env.LOGGLY_API_KEY,
      subdomain: process.env.LOGGLY_SUB_DOMAIN,
      json: true
    });
  } else {
    return console.log('loggly not available');
  }
};

log = function(msg) {
  var obj;
  console.log(msg);
  if (logglyClient != null) {
    if ((typeof msg) === 'string') {
      return logglyClient.log(prefix + msg, tags);
    } else {
      obj = {
        prefix: prefix,
        message: msg
      };
      return logglyClient.log(obj, tags);
    }
  }
};

module.exports = {
  configure: configure,
  log: log
};

var respondIfOk, routeResource;

respondIfOk = function(req, res) {
  if (res.giResult != null) {
    return res.status(200).json(res.giResult); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
  } else {
    return res.status(500).json({
      message: 'something went wrong' //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    });
  }
};

routeResource = function(name, app, middleware, controller) {
  app.get('/api/' + name, middleware, controller.index, this._respondIfOk);
  app.post('/api/' + name, middleware, controller.create, this._respondIfOk);
  app.put('/api/' + name, middleware, controller.bulkUpdate, this._respondIfOk);
  app.get('/api/' + name + '/count', middleware, controller.count, this._respondIfOk);
  app.put('/api/' + name + '/:id', middleware, controller.update, this._respondIfOk);
  app.get('/api/' + name + '/:id', middleware, controller.show, this._respondIfOk);
  app.delete('/api/' + name + '/:id', middleware, controller.destroy, this._respondIfOk); //Changed 'app.del' to 'app.delete' for express 4.x compatibility
  return app.post('/api/' + name + '/query', middleware, controller.index, this._respondIfOk);
};

exports.routeResource = routeResource;

exports._respondIfOk = respondIfOk;

var noCache;

noCache = function(req, res, next) {
  //for the benefit of IE9 - which insists on caching
  //all of my requests
  res.set("Cache-Control", "max-age=0,no-cache,no-store");
  return next();
};

exports.noCache = noCache;

var common, request;

request = require('request');

common = require('../common');

module.exports = function() {
  var apiEndpoint, apiVer;
  apiEndpoint = process.env.GOINC_API_ENDPOINT;
  apiVer = process.env.GOINC_API_VERSION;
  return {
    my: function(req, res) {
      var ipToSend, uri, xForward;
      xForward = req.get('x-forwarded-for');
      if ((xForward != null) && (xForward !== "")) {
        ipToSend = xForward.split(',')[0];
      } else {
        ipToSend = req.ip;
      }
      common.log("IP request: " + ipToSend);
      uri = apiEndpoint + "/" + apiVer + "/" + "geoip/" + ipToSend;
      return request(uri, function(err, response, body) {
        common.log('back from goinc api');
        if (err != null) {
          common.log('error: ' + err);
          return res.status(500).json(err); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        } else {
          common.log(body);
          if (response.statusCode === 200) {
            return res.status(200).json(JSON.parse(body)); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          } else {
            return res.status(404).json({}); //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
          }
        }
      });
    }
  };
};

var common, geoip, slug;

common = require('../common');

slug = require('./slug');

geoip = require('./geoip');

module.exports = function(app) {
  return {
    slug: slug,
    timePattern: common.crudControllerFactory(app.models.timePatterns),
    geoip: geoip()
  };
};

var unorm;

unorm = require('unorm');

module.exports = {
  get: function(req, res) {
    var ref, result;
    if ((ref = req.query) != null ? ref.text : void 0) {
      result = unorm.nfd(req.query.text).replace(/^\s\s*/, "").replace(/\s\s*/g, "-").replace(/&/g, "and").toLowerCase();
      return res.status(200).json({
        slug: result //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
      });
    } else {
      return res.status(200).json({
        slug: "" //Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
      });
    }
  }
};

module.exports = function(dal) {
  var model, modelDefinition;
  modelDefinition = {
    name: 'Counters',
    schemaDefinition: {
      systemId: 'ObjectId',
      name: 'String',
      number: 'Number'
    }
  };
  modelDefinition.schema = dal.schemaFactory(modelDefinition);
  model = dal.modelFactory(modelDefinition);
  return {
    getNext: async function(name, systemId, callback) {
      var res;
      res = (await model.findOneAndUpdate({
        name: name,
        systemId: systemId
      }, {
        $inc: {
          number: 1
        }
      }, {
        upsert: true,
        new: true
      }));
      if (!res) {
        if (callback) {
          return callback('error', null);
        }
      } else {
        if (callback) {
          return callback(null, res.number);
        }
      }
    },
    previewNext: async function(name, systemId, callback) {
      var res;
      res = (await model.findOne({
        name: name,
        systemId: systemId
      }));
      if (!res) {
        if (callback) {
          return callback('error', null);
        }
      } else if (res != null ? res.number : void 0) {
        if (callback) {
          return callback(null, res.number + 1);
        }
      } else {
        if (callback) {
          return callback(null, 1);
        }
      }
    }
  };
};

var common;

common = require('../common');

module.exports = function(dal) {
  return {
    counters: require('./counters')(dal),
    timePatterns: require('./timePatterns')(dal),
    resources: require('./resources')(dal)
  };
};

var common;

common = require('../common');

module.exports = function(dal) {
  var crud, exports, model, modelDefinition, registerTypes;
  modelDefinition = {
    name: 'Resource',
    schemaDefinition: {
      systemId: 'ObjectId',
      name: 'String'
    }
  };
  modelDefinition.schema = dal.schemaFactory(modelDefinition);
  model = dal.modelFactory(modelDefinition);
  crud = dal.crudFactory(model);
  registerTypes = function(systemId, models, cb) {
    var key, resourceType, results, val;
    results = [];
    for (key in models) {
      val = models[key];
      resourceType = {
        name: val.name,
        systemId: systemId
      };
      results.push(crud.update(val._id, resourceType, cb));
    }
    return results;
  };
  exports = common.extend({}, crud);
  exports.registerTypes = registerTypes;
  return exports;
};

var _, common, moment;

_ = require('underscore');

moment = require('moment');

common = require('../common');

module.exports = function(dal) {
  var checkValidPattern, create, crud, exports, model, modelDefinition, timeAfterXSecondsOnFrom, timeOnBetween, update;
  modelDefinition = {
    name: 'TimePattern',
    schemaDefinition: {
      systemId: 'ObjectId',
      name: 'String',
      pattern: ['Number'],
      recurrence: 'String',
      base: 'Date'
    }
  };
  modelDefinition.schema = dal.schemaFactory(modelDefinition);
  model = dal.modelFactory(modelDefinition);
  crud = dal.crudFactory(model);
  checkValidPattern = function(recurrence, pattern) {
    var calculatedPeriodTotal, expectedPeriodTotal, i, item, len, secondsPerDay;
    if ((recurrence == null) || (pattern == null)) {
      return true;
    } else {
      secondsPerDay = 60 * 60 * 24;
      expectedPeriodTotal = 0;
      if (recurrence === 'weekly') {
        expectedPeriodTotal = secondsPerDay * 7;
      } else if (recurrence === 'monthly') {
        expectedPeriodTotal = secondsPerDay * 31;
      } else if (recurrence === 'yearly') {
        expectedPeriodTotal = secondsPerDay * 365;
      }
      
      //TODO: we will need a special category and consideration for leap years
      //      does the pattern include the leap day in line, or at the end for
      //      instance

      //TODO: We need to define what we do with monthly recurrences where the
      //      calculated period total exceeds the defined period (for instance,
      //      months with fewer than 31 days)
      //      Here the right answer is somewhat simpler - just cut off the array
      calculatedPeriodTotal = 0;
      for (i = 0, len = pattern.length; i < len; i++) {
        item = pattern[i];
        calculatedPeriodTotal += item;
      }
      return calculatedPeriodTotal <= expectedPeriodTotal;
    }
  };
  create = function(json, callback) {
    if ((json.pattern != null) && (json.recurrence != null)) {
      if (this._checkValidPattern(json.recurrence, json.pattern)) {
        return crud.create(json, callback);
      } else {
        return callback('pattern exceeds recurrence', null);
      }
    } else {
      return crud.create(json, callback);
    }
  };
  update = function(id, json, callback) {
    var that;
    that = this;
    if ((json.recurrence != null) || (json.pattern != null)) {
      return crud.findById(id, json.systemId, function(err, obj) {
        if (err) {
          return callback(err, null);
        } else if (!obj) {
          return callback('could not find time pattern with id ' + id, null);
        } else {
          if (json.recurrence != null) {
            obj.recurrence = json.recurrence;
          }
          if (json.pattern != null) {
            obj.pattern = json.pattern;
          }
          if (that._checkValidPattern(obj.recurrence, obj.pattern)) {
            return crud.update(id, json, callback);
          } else {
            return callback('pattern exceeds recurrence', null);
          }
        }
      });
    } else {
      return crud.update(id, json, callback);
    }
  };
  timeOnBetween = function(start, stop, patternId, systemId, callback) {
    return crud.findById(patternId, systemId, function(err, obj) {
      var result;
      if (err || !obj) {
        if (callback) {
          return callback('Could not find pattern with id: ' + patternId);
        }
      } else {
        result = common.timePatterns.timeOnBetween(start, stop, obj.pattern, obj.recurrence);
        if (callback) {
          return callback(null, result);
        }
      }
    });
  };
  timeAfterXSecondsOnFrom = function(start, x, patternId, systemId, callback) {
    return crud.findById(patternId, systemId, function(err, obj) {
      var result;
      if (err || !obj) {
        if (callback) {
          return callback('Could not find pattern with id: ' + patternId);
        }
      } else {
        result = common.timePatterns.timeAfterXSecondsOnFrom(start, x, obj.pattern, obj.recurrence);
        if (callback) {
          return callback(null, result);
        }
      }
    });
  };
  //Standard Crud
  exports = common.extend({}, crud);
  //Crud Overrides
  exports.create = create;
  exports.update = update;
  //Public Methods
  exports.timeOnBetween = timeOnBetween;
  exports.timeAfterXSecondsOnFrom = timeAfterXSecondsOnFrom;
  //Private Methods
  exports._checkValidPattern = checkValidPattern;
  return exports;
};
