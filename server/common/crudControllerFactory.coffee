helper = require '../controllers/helper'
_ = require 'underscore'
async = require 'async'

module.exports = (model) ->

  index = (req, res, next) ->
    if req.method.toUpperCase() is "POST"
      options = req.body
      if options.query?
        options.query.systemId = req.systemId
    else
      options = helper.getOptions req, model

    model.find options
    , (err, result, pageCount) ->
      if err
        res.status(404).json(err) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
      else
        if next
          res.giResult = result
          next()
        else
          res.status(200).json(result) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

  bulkUpdate = (req, res, next) ->
    errors = []
    results = []
    async.each req.body, (obj, cb) ->
      obj.systemId = req.systemId
      if obj._id?
        model.update obj._id, obj, (err, result) ->
          if err
            errors.push {message: err, obj: obj}
            cb()
          else if result
            results.push {message: "ok", obj: result}
            cb()
          else
            errors.push {message: "create failed for reasons unknown", obj: obj}
            cb()
      else
        model.create obj, (err, result) ->
          if err
            errors.push {message: err, obj: obj}
            cb()
          else if result
            results.push {message: "ok", obj: result}
            cb()
          else
            errors.push {message: "create failed for reasons unknown", obj: obj}
            cb()
    , () ->
      resultCode = 200
      if errors.length > 0
        resultCode = 500
      if next
        res.giResult = errors.concat results
        res.giResultCode = resultCode
        next()
      else
        res.status(resultCode).json(errors.concat(results)) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility


  create = (req, res, next) ->
    if _.isArray req.body
      errors = []
      results = []
      async.each req.body, (obj, cb) ->
        obj.systemId = req.systemId
        model.create obj, (err, result) ->
          if err
            errors.push {message: err, obj: obj}
            cb()
          else if result
            results.push {message: "ok", obj: obj}
            cb()
          else
            errors.push {message: "create failed for reasons unknown", obj: obj}
            cb()
      , () ->
        resultCode = 200
        if errors.length > 0
          resultCode = 500
        if next
          res.giResult = errors.concat results
          res.giResultCode = resultCode
          next()
        else
          res.status(resultCode).json(errors.concat(results)) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

    else
      req.body.systemId = req.systemId
      model.create req.body, (err, obj) ->
        if err
          res.status(500).json({error: err.toString()}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        else
          if next
            res.giResult = obj
            next()
          else
            res.status(200).json(obj) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

  show = (req, res, next) ->
    if req.params?.id and req.systemId
      model.findById req.params.id, req.systemId, (err, obj) ->
        if err
          res.status(404).json() #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        else if obj
          if next
            res.giResult = obj
            next()
          else
            res.status(200).json(obj) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        else
          res.status(404).json() #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    else
      res.status(404).json() #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

  update = (req, res, next) ->
    if req.params?.id and req.systemId
      req.body.systemId = req.systemId
      # wierdly, mongoose doesn't work if you put an id
      # in the update payload
      payload = req.body
      if req.body._id
        delete payload._id

      model.update req.params.id, payload, (err, obj) ->
        if err
          res.status(400).json({message: err}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        else
          if next
            res.giResult = obj
            next()
          else
            res.status(200).json(obj) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    else
      res.status(400).json() #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

  destroy = (req, res, next) ->
    if req.params?.id and req.systemId
      model.destroy req.params.id, req.systemId, (err) ->
        if err
          res.status(400).json({message: err}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        else
          if next
            res.giResult = 'Ok'
            next()
          else
            res.status(200).json() #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    else
      res.status(404).json() #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

  count = (req, res, next) ->
    options = helper.getOptions req, model

    model.count options.query
    , (err, result) ->
      if err
        res.status(404).json({message: err}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
      else
        if next
          res.giResult = {count: result}
          next()
        else
          res.status(200).json(result) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

  name: model.name
  index: index
  create: create
  show: show
  update: update
  destroy: destroy
  count: count
  bulkUpdate: bulkUpdate
