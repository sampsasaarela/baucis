// __Dependencies__
var url = require('url');
var es = require('event-stream');

// __Private Module Members__

function parse () {
  var depth = 0;
  var buffer = '';

  return es.through(
    function (incoming) {
      var remaining = incoming.toString();

       while (remaining !== '') {
        var match = remaining.match(/[\}\{]/);
        // The head of the string is all characters up to the first brace, if any.
        var head = match ? remaining.substr(0, match.index) : remaining;
        // The first brace in the string, if any.
        var brace = match ? match[0] : '';
        // The rest of the string, following the brace.
        var tail = match ? remaining.substr(match.index + 1) : '';

        if (depth === 0) {
          // The parser is outside an object.
          // Ignore the head of the string.
          // Add brace if it's an open brace.
          if (brace === '{') {
            depth += 1;
            buffer += brace;
          }
        }
        else {
          // The parser is inside an object.
          // Add the head of the string to the buffer.
          buffer += head;
          // Increase or decrease depth if a brace was found.
          if (brace === '{') depth += 1;
          else if (brace === '}') depth -= 1;
          // Add the brace to the buffer.
          buffer += brace;
          // If the object ended, emit it.
          if (depth === 0) {
            this.emit('data', JSON.parse(buffer));
            buffer = '';
          }
        }
        // Move on.
        remaining = tail;
      }
    },
    function () { this.emit('end') }
  );
}

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

  // TODO can't alter body beforehand

  controller.query('post', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    var findBy = request.baucis.controller.get('findBy');
    var ids = [];

    response.status(201);
    request.baucis.conditions[findBy] = { $in: ids };

    var pipeline = es.pipeline(
      request,
      parse(), // TODO+url+encoded?
      create(Model),
      mapIds(findBy),
      setLocation(request.originalUrl, findBy, response),
      updateConditions(ids)
    );

    pipeline.on('error', next);
    pipeline.on('end', next);
  });
};
