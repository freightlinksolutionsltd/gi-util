_ = require 'underscore'
module.exports = (Resource) ->
  count = (query, callback) ->
    if not query.systemId?
      callback 'Cannot count ' +
      Resource.modelName + '- no SystemId', null
    else
      count = await Resource.countDocuments query
      callback null, count

  find = (options, callback) ->
    #console.log options
    if options?
      if options.max?
        max = parseInt options.max
      #else
      #  max = 10000

      if options.sort?
        sort = 'field ' + options.sort
      else
        sort = {}

      if options.page?
        page = options.page
      else
        page = 1

      if options.populate?
        populate = options.populate
      else populate = null

      if options.query? and options.query.systemId?
        query = options.query
      else if options.query.$and?
        #Check that at least one of the $and operators contains the systemId query
        found =  _.find options.query.$and, (queryPart) ->
          queryPart.systemId?
        if found
          query = options.query
        else
          callback('systemId not specified as one of the $and conditions', null, 0, 0) if callback
          return

      else
        callback('systemId not specified in query', null, 0, 0) if callback
        return
    else
      callback('options must be specfied for find', null, 0, 0) if callback
      return

    skipFrom = page * max - max

    if max < 1
      callback(null, [], 0, 0) if callback
    else
      try 
        command = Resource.find(query).sort(sort).skip(skipFrom).limit(max)
        if options.populate?
          command.populate populate

        if options.select?
          command.select options.select

        results = await command
        if !results
          callback err, null, 0
        else
          count = await Resource.countDocuments(query)
          #safe because max >= 1
          pageCount = Math.ceil(count/max) or 0
          callback(null, results, pageCount, count) if callback
      catch e
        console.debug "GI-UTIL find ERROR: "
        console.debug e
        console.debug "Query was: "
        console.debug JSON.stringify query
        callback e

  findOne = (query, callback) ->
    if not query? or not query.systemId?
      callback 'Cannot find ' +
      Resource.modelName + ' - no SystemId', null
    else
      try 
        resource = await Resource.findOne query
        if !resource
          callback('No resource') if callback
        else if resource
          callback(null, resource) if callback
        else
          callback('Cannot find ' + Resource.modelName) if callback
      catch e
        console.debug "GI-UTIL findOne ERROR: "
        console.debug e
        console.debug "Query was: "
        console.debug JSON.stringify query
        callback e

  findOneBy = (key, value, systemId, callback) ->
    query =
      systemId: systemId
    query[key] = value

    @findOne query, callback

  findById = (id, systemId, callback) ->
    @findOneBy '_id', id, systemId, callback

  findWithCursor = (opts) ->
    command = Resource.find(opts.query)
    if opts.sort?
      command.sort opts.sort
    
    if opts.populate?
      command.populate opts.populate

    if opts.select?
      command.select opts.select

    command.cursor()

  create = (json, callback) ->
    if not json.systemId?
      callback Resource.modelName  + ' could not be created - no systemId'
    else
      resource = await Resource.create json
      if !resource
        callback 'No resource'
      else if resource
        callback null, resource
      else
        callback Resource.modelName + ' could not be saved'

  update = (id, json, callback) ->
    if not json.systemId?
      callback Resource.modelName + ' could not be updated - no systemId'
    else
      resource = await Resource.findByIdAndUpdate(id, json, {new: true})
      if !resource
        callback 'No resource'
      else if resource
        callback null, resource
      else
        callback Resource.modelName + ' could not be saved'

  destroy =  (id, systemId, callback) ->
    if not systemId?
      callback 'Could not destroy ' + Resource.modelName + ' - no systemId'
    else
      resource = await Resource.findOne { _id : id, systemId: systemId}
      if !resource
        callback 'No resource to destroy'
      else if resource
        deleteResource = await Resource.deleteOne {_id: resource._id, systemId: systemId}
        callback null, deleteResource
      else
        callback Resource.modelName + ' could not be destroyed'
  
  aggregate = (steps, callback) ->
    resource = await Resource.aggregate steps
    if !resource
      callback 'No resource'
    else if resource
      callback null, resource
    else
      callback Resource.modelName + ' could not be found'

  aggregateWithCursor = (steps) ->
    resource = await Resource.aggregate(steps).allowDiskUse(true).cursor({batchSize: 0})
    resource

  find: find
  findById: findById
  findOne: findOne
  findOneBy: findOneBy
  findWithCursor: findWithCursor
  create: create
  update: update
  destroy: destroy
  name: Resource.modelName
  count: count
  aggregate: aggregate
  aggregateWithCursor: aggregateWithCursor
