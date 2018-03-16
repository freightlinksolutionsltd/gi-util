request = require 'request'
common = require '../common'

module.exports = () ->
  apiEndpoint = process.env.GOINC_API_ENDPOINT
  apiVer = process.env.GOINC_API_VERSION

  my: (req, res) ->
    xForward = req.get('x-forwarded-for')
    if xForward? and (xForward isnt "")
      ipToSend = xForward.split(',')[0]
    else
      ipToSend = req.ip

    common.log "IP request: " + ipToSend
    uri = apiEndpoint + "/" + apiVer + "/" + "geoip/" + ipToSend
    request uri, (err, response, body) ->
      common.log 'back from goinc api'
      if err?
        common.log 'error: ' + err
        res.status(500).json(err) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
      else
        common.log body
        if response.statusCode is 200
          res.status(200).json(JSON.parse(body)) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
        else
          res.status(404).json({}) #Changed 'res.json(status,obj)' to 'res.status(status).json(obj)' for express 4.x compatibility
