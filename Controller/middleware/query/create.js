// __Dependencies__
var url = require('url');
var JSONStream = require('JSONStream');
var es = require('event-stream');

// __Private Module Members__

function parse () {
  var braces = 0;
  var buffer = '';

  return es.through(
    function (incoming) {
      var remaining = incoming.toString();
      // TODO simplify, revisit comments
      while (remaining !== '') {
        var opens = remaining.indexOf('{');
        var closes = remaining.indexOf('}');
        // If the chunk doesn't contain a "{" or a "}," buffer the entire chunk
        // unless the parser isn't inside an object.
        if (opens === -1 && closes === -1) {
          if (braces !== 0) buffer += remaining;
          remaining = '';
          continue;
        }
        // If the chunk only contains a "{" buffer it and the characters to the
        // right of the brace.
        if (closes === -1) {
          buffer += remaining.substring(opens);
          braces += 1;
          remaining = '';
          continue;
        }
        // If the chunk only contains a "}" buffer up to and including the brace.
        // If the brace indicates the end of the object, emit.  If the parser is
        // outside of an object, don't do anything.
        if (opens === -1) {
          if (braces === 0) continue;
          buffer += remaining.substring(0, closes + 1);
          braces -= 1;
          remaining = remaining.substring(closes + 1);
          if (braces === 0) this.emit('data', JSON.parse(buffer)), buffer = '';
          continue;
        }

        if (closes < opens) {
          if (braces === 0) {
            remaining = remaining.substring(opens)
            continue;
          }
          buffer += remaining.substring(0, closes + 1);
          braces -= 1;
          remaining = remaining.substring(closes + 1);
          if (braces === 0) this.emit('data', JSON.parse(buffer)), buffer = '';
          continue;
        }

        if (opens < closes) {
          buffer += remaining.substring(opens, closes);
          braces += 1;
          remaining = remaining.substring(closes);
          continue;
        }
      }
    },
    function () {
      this.emit('end');
    }
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
