// __Dependencies__
var url = require('url');
var JSONStream = require('JSONStream');
var es = require('event-stream');

// __Private Module Members__
function create (Model) {
  return es.map(function (incoming, callback) {
    var pending = new Model();
    pending.set(incoming);
    pending.save(callback);
  });
}

function mapIds (findBy) {
  return es.map(function (doc, callback) {
    callback(null, doc.get(findBy));
  });
}

function setLocation (url, findBy, response) {
  var location;
  var first;
  var multiple = false;
  var url = url.lastIndexOf('/') === url.length - 1 ? url : url + '/';
  return es.through(
    function (id) {
      if (!first) {
        first = id;
        location = url + id;
      }
      else if (!multiple) {
        multiple = true;
        location = url + '?conditions={ "' + findBy + '": { "$in": [ "' + first + '", "' + id + '"';
      }
      else {
        location += ', "';
        location += id;
        location += '"'
      }
      this.emit('data', id);
    },
    function () {
      if (multiple) location += ' ] } }';
      if (location) response.set('Location', location);
      this.emit('end');
    }
  );
}

function updateConditions (ids) {
  return es.map(function (id, callback) { ids.push(id), callback(null, id) });
}

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.query('post', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    var findBy = request.baucis.controller.get('findBy');
    var ids = [];

    response.status(201);
    request.baucis.conditions[findBy] = { $in: ids };

    var pipeline = es.pipeline(
      request,
      JSONStream.parse(), // TODO+url+encoded?
      create(Model),
      mapIds(findBy),
      setLocation(request.originalUrl, findBy, response),
      updateConditions(ids)
    );

    pipeline.on('error', next);
    pipeline.on('end', next);
  });
};
