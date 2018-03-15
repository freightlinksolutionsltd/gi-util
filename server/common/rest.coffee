respondIfOk = (req, res) ->
  if res.giResult?
    res.status(200).json(res.giResult) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
  else
    res.status(500).json({message: 'something went wrong'}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility

routeResource = (name, app, middleware, controller) ->
  app.get( '/api/' + name
  , middleware, controller.index, @_respondIfOk)
  app.post('/api/' + name
  , middleware, controller.create, @_respondIfOk)
  app.put('/api/' + name
  , middleware, controller.bulkUpdate, @_respondIfOk)
  app.get( '/api/' + name + '/count'
  , middleware, controller.count, @_respondIfOk)
  app.put( '/api/' + name + '/:id'
  , middleware, controller.update, @_respondIfOk)
  app.get( '/api/' + name + '/:id'
  , middleware, controller.show, @_respondIfOk)
  app.delete( '/api/' + name + '/:id'  #Changed 'app.del' to 'app.delete' for express 4.x compatibility
  , middleware, controller.destroy, @_respondIfOk)
  app.post('/api/' + name + '/query'
  , middleware, controller.index, @_respondIfOk)

exports.routeResource = routeResource
exports._respondIfOk = respondIfOk
