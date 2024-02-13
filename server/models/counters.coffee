module.exports = (dal) ->

  modelDefinition =
    name: 'Counters'
    schemaDefinition:
      systemId: 'ObjectId'
      name: 'String'
      number: 'Number'

  modelDefinition.schema = dal.schemaFactory modelDefinition
  model = dal.modelFactory modelDefinition

  getNext: (name, systemId, callback) ->
    res = await model.findOneAndUpdate {name: name, systemId: systemId}, {$inc : {number: 1}}, {upsert: true, new: true}
    if !res
      callback('error', null) if callback
    else
      callback(null, res.number) if callback

  previewNext: (name, systemId, callback) ->
    res = await model.findOne {name: name, systemId: systemId}
    if !res
      callback('error', null) if callback
    else if res?.number
      callback(null, res.number + 1) if callback
    else
      callback(null, 1) if callback
