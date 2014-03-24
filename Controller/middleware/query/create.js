// __Dependencies__
var _ = require('highland');

// __Private Module Members__
// Parse incoming string into objects.  Works whether an array or single object
// is sent as the request body.  It's very lenient with input outside of objects.
function parse () {
  var depth = 0;
  var buffer = '';

  return function (incoming) {
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
  };
}

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.query('post', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    var findBy = request.baucis.controller.get('findBy');
    var incoming;
    // Function used to map documents to their unique ID.
    function ids (doc) { return doc.get(findBy) }
    // Function to save an incoming document.
    function create (doc) {
      var pending = new Model();
      pending.set(incoming);
      pending.save(callback);
    }
    // Set the status to 201 (Created).
    response.status(201);
    // Check if the body was parsed by some external middleware e.g. `express.json`.
    // If so, create a stream from the POST'd document or documents.  Otherwise,
    // stream and parse the request.
    if (request.body) {
      incoming = _([].concat(request.body));
    }
    else {
      incoming = _(request).map(parse);
    }
    // Process the incoming document or documents.
    incoming.stopOnError(next).map(mapIn).map(create).map(ids).toArray(function (ids) {
      var conditions = request.baucis.conditions[findBy] = { $in: ids };

      if (ids.length === 0) return next(errors.BadRequest('You must POST at least one document.'));
      if (ids.length === 1) return response.set('Location', url + ids[0]);

      response.set('Location', url + '?conditions=' + JSON.stringify(conditions));
    });
  });
};
