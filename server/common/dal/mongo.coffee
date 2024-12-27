_ = require 'underscore'
mongoose = require 'mongoose'
crudModelFactory = require '../crudModelFactory'
connectMongo = require 'connect-mongo'

getConnectionString = (conf) ->
  if conf.connectionString
    conf.connectionString
  else
    uri = "mongodb://"

    if conf.username?
      uri += conf.username + ":" + conf.password + "@"

    separator = ""
    if conf.servers?
      _.each conf.servers, (server) ->
        uri += separator +  server.host + ":" + server.port
        separator = ","
    else
      uri += conf.host + ":" + conf.port

    uri += "/" + conf.name
    if conf.ssl
      uri += "?ssl=true"
    else
      uri += "?ssl=false"
    if conf.authSource?
      uri += "&authSource=" + conf.authSource
    uri

schemaFactory = (def) ->
  if def.options?
    _schema = new mongoose.Schema def.schemaDefinition, def.options
  else
    _schema = new mongoose.Schema def.schemaDefinition
  _schema

modelFactory = (def) ->
  if mongoose.models[def.name]
    return mongoose.model(def.name)
  else if def.options?.collectionName?
    return mongoose.model(def.name, def.schema, def.options.collectionName)
  else
    return mongoose.model(def.name, def.schema)

module.exports =

  connect: (conf, cb) ->
    port = parseInt conf.port

    uri = getConnectionString(conf)

    mongoose.connect uri, { useNewUrlParser: true, useUnifiedTopology: true }

    mongoose.connection.on 'connected',  () ->
      cb() if cb

    mongoose.connection.on 'error', (err) ->
      cb(err) if cb

  sessionStore: (express, conf, cb) ->
    options =
      mongoUrl: getConnectionString(conf)
      autoRemove: "interval"
      mongoOptions:
        useNewUrlParser: true
        useUnifiedTopology: true

    #MongoStore = new connectMongo(express)

    sessionStore = connectMongo.create(options)
    sessionStore

  crudFactory: crudModelFactory
  modelFactory: modelFactory
  schemaFactory: schemaFactory
