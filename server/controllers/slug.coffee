unorm = require 'unorm'
module.exports =
  get: (req, res) ->
    if req.query?.text
      result = unorm.nfd(req.query.text).replace(/^\s\s*/, "")
      .replace(/\s\s*/g, "-").replace(/&/g, "and").toLowerCase()
      res.status(200).json({slug: result}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
    else
      res.status(200).json({slug: ""}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility