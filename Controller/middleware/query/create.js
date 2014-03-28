// __Dependencies__
var es = require('event-stream');
var util = require('util');
var errors = require('../../../errors');

// __Private Module Members__
// Parse incoming string into objects.  Works whether an array or single object
// is sent as the request body.  It's very lenient with input outside of objects.
function parse () {
  var depth = 0;
  var buffer = '';

  return es.through(
    function (chunk) {
    var match;
    var head;
    var brace;
    var tail;
    var remaining = chunk.toString();

    while (remaining !== '') {
      match = remaining.match(/[\}\{]/);
      // The head of the string is all characters up to the first brace, if any.
      head = match ? remaining.substr(0, match.index) : remaining;
      // The first brace in the string, if any.
      brace = match ? match[0] : '';
      // The rest of the string, following the brace.
      tail = match ? remaining.substr(match.index + 1) : '';

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
      // Move on to the unprocessed remainder of the string.
      remaining = tail;
    }
  });
}

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.query('post', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    var findBy = request.baucis.controller.get('findBy');
    var url = request.originalUrl || request.url;
    var incoming;
    var pipes;
    // Add trailing slash to URL if needed.
    if (url.lastIndexOf('/') === (url.length - 1)) url = url.slice(0, url.length - 1);
    // Set the status to 201 (Created).
    response.status(201);
    // Check if the body was parsed by some external middleware e.g. `express.json`.
    // If so, create a stream from the POST'd document or documents.  Otherwise,
    // stream and parse the request.
    if (request.body) incoming = es.readArray([].concat(request.body));
    else incoming = es.pipeline(request, parse());
    // Process the incoming document or documents.
    pipes = es.pipeline(
      incoming,
      request.baucis.incoming(),
      // Map function to create a document from incoming JSON.
      es.map(function (incoming, callback) {
        var doc = new Model();
        doc.set(incoming);
        callback(null, doc);
      }),
      // Map function to save a document.
      es.map(function (doc, callback) { doc.save(callback) }),
      // Get the unique ID of each created document.
      es.map(function (doc, callback) { callback(null, doc.get(findBy)) }),
      // Write the IDs to an array for later use.
      es.writeArray(function (error, ids) {
        if (error) return next(error);
        // URL location of newly created document or documents.
        var location;
        // Set the conditions used to build `request.baucis.query`.
        var conditions = request.baucis.conditions[findBy] = { $in: ids };
        // Check for at least one document.
        if (ids.length === 0) return next(errors.BadRequest('You must POST at least one document.'));
        // Set the `Location` header if at least one document was sent.
        if (ids.length === 1) location = url + '/' + ids[0];
        else location = util.format('%s?conditions={ "%s": %s }', url, findBy, JSON.stringify(conditions));
        response.set('Location', location);
        next();
      })
    );

    pipes.on('error', next);
  });
};
