angular.module 'gi.util'
, ['ngResource', 'ngCookies', 'logglyLogger', 'ngTouch', 'ngRoute']

angular.module('gi.util').config ['giLogProvider', (giLogProvider) ->
  if loggly?
    giLogProvider.setLogglyToken loggly.key
    giLogProvider.setLogglyTags "angular," + loggly.tags
    giLogProvider.setLogglyExtra loggly.extra
]
