// __Dependencies__
var _ = require('highland');
var crypto = require('crypto');
var errors = require('../../errors');

// __Private Module Members__
//A map function to stringify emitted entity.
function stringify (a) { return JSON.stringify(a) }
// A consume function that emits an error for 404 state, or otherwise acts as a
// pass-through.
function check404 (error, item, push, next) {
  if (item instanceof errors.NotFound) push(item); // 404
  else push(error, item);
  next();
}
// Emit a single instance or an array of instances.
function singleOrArray () {
  var first = false;
  var multiple = false;

  return function (error, doc, push, next) {
    if (error) {
      push(error);
      return next();
    }
    // End the stream if end object emitted.
    if (doc === _.nil) {
      // If no documents, simply end the stream.
      if (!first) return push(null, _.nil);
      // If only one document emit it unwrapped.
      if (!multiple) push(null, first);
      // For greater than one document, emit the closing array.
      else push(null, ']');
      // Done.  End the stream.
      push(null, _.nil);
      return next();
    }
    // If not ending, start building the output.  If this is the first document,
    // store it for a moment.
    if (!first) {
      first = doc;
      return next();
    }
    // If this is the second document, output array opening and the two documents
    // separated by a comma.
    if (!multiple) {
      multiple = true;
      push(null, '[');
      push(null, first);
      push(null, ',\n')
      push(null, doc);
      return next();
    }
    // For all documents after the second, emit a comma preceding the document.
    push(null, ',\n');
    push(null, doc);
    return next();
  };
};

function removeDocuments () {
  return es.map(function (doc, callback) {
    doc.remove(callback);
  });
}

function etag (a, b) {
  var hash = crypto.createHash('md5');
  var etag = response.get('Etag');
  if (etag) return etag
  hash.update(JSON.stringify(doc));
  response.set('Etag', '"' + hash.digest('hex') + '"');
  callback(null, doc);
}

function lastModified (response, lastModifiedPath) {
  return es.map(function (doc, callback) {
    if (response.get('Last-Modified')) return callback(null, doc);
    if (lastModifiedPath) response.set('Last-Modified', doc.get(lastModifiedPath));
    callback(null, doc);
  });
}

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var controller = this;

  // Create the basic stream.
  protect.finalize(function (request, response, next) {
    response.type('json');
    // TODO allow setting request.baucis.documents instead of streaming
    request.baucis.send = _(request.baucis.query.stream()).otherwise([ errors.NotFound() ])
      .stopOnError(next).consume(check404);
    next();
  });

  // HEAD
  protect.finalize('instance', 'head', function (request, response, next) {
    request.baucis.send.fork().map(lastModified).resume();
    request.baucis.send.map(stringify);
    request.baucis.send.fork().map(etag).resume();
    request.baucis.send.reduce1(emptyString);
    next();
  });

  protect.finalize('collection', 'head', function (request, response, next) {
    // TODO use es.wait for setting etag and lastModified on collections?
    response.end();
  });

  // GET
  protect.finalize('instance', 'get', function (request, response, next) {
    request.baucis.send.fork().map(lastModified).resume();
    request.baucis.send.map(stringify);
    request.baucis.send.fork().map(etag).resume();
    next();
  });

  protect.finalize('collection', 'get', function (request, response, next) {
    request.baucis.send = request.baucis.send.map(stringify);
    request.baucis.send = request.baucis.send.consume(singleOrArray());
    next();
  });

  // POST
  protect.finalize('collection', 'post', function (request, response, next) {
    request.baucis.send.map(singleOrArray);
    next();
  });

  // PUT
  protect.finalize('put', function (request, response, next) {
    request.baucis.send.map(stringify);
    next();
  });

  protect.finalize('del', function (request, response, next) {
    request.baucis.send.map(remove); // TODO move this to another finalize component
    request.baucis.count = true;
    next();
  });

  protect.finalize(function (request, response, next) {
    if (request.baucis.count) request.baucis.send.reduce(count, 0).map(stringify);
    request.baucis.send.pipe(response);
  });
};

