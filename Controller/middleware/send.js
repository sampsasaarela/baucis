// __Dependencies__
var _ = require('highland');
var crypto = require('crypto');
var errors = require('../../errors');

// __Private Module Members__
// A map function to stringify emitted entity.
function stringify (a) { return JSON.stringify(a) }
// A reduce that is used to create empty response body.
function empty () { return '' }
// A reduce function to count emitted entities.
function count (a, b) { return a + 1 }
// A consume function that emits an error for 404 state, or otherwise acts as a
// pass-through.
function check404 (error, item, push, next) {
  if (item instanceof errors.NotFound) push(item); // 404
  else push(error, item);
  next();
}
// Emit a single instance or an array of instances.
function singleOrArray (alwaysArray) {
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
      if (!multiple && alwaysArray) push(null, '[');
      if (!multiple) push(null, first);
      // For greater than one document, emit the closing array.
      else push(null, ']');
      if (!multiple && alwaysArray) push(null, ']');
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

function remove (error, doc, push, next) {
  if (error) {
    push(error);
    return next();
  }
  if (doc === _.nil) {
    push(null, _.nil);
    return next();
  }

  doc.remove(function (error) {
    push(error, doc);
    return next();
  });
}


function etag (response) {
  return function (a, b) {
    var hash = crypto.createHash('md5');
    var etag = response.get('Etag');
    if (etag) return etag;
    hash.update(JSON.stringify(a));
    response.set('Etag', '"' + hash.digest('hex') + '"');
    return;
  };
}

function lastModified (response, lastModifiedPath) {
  return function (error, doc, push, next) {
    if (error) {
      push(error);
      return next();
    }
    if (doc === _.nil) {
      push(null, _.nil);
      return next();
    }
    if (!response.get('Last-Modified') && lastModifiedPath) {
      response.set('Last-Modified', doc.get(lastModifiedPath));
    }
    next();
  };
}

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var controller = this;

  // Create the basic stream.
  protect.finalize(function (request, response, next) {
    response.type('json');
    // TODO allow setting request.baucis.documents instead of streaming
    var stream = request.baucis.query.stream();
    stream.on('error', next);
    request.baucis.send = _(stream).otherwise([ errors.NotFound() ]).consume(check404);
    next();
  });

  // HEAD
  protect.finalize('instance', 'head', function (request, response, next) {
    request.baucis.send.observe().map(lastModified).resume();
    request.baucis.send = request.baucis.send.map(stringify);
    request.baucis.send.observe().map(etag).resume();
    request.baucis.send = request.baucis.send.reduce1(empty);
    next();
  });

  protect.finalize('collection', 'head', function (request, response, next) {
    // TODO use es.wait for setting etag and lastModified on collections?
    request.baucis.send = request.baucis.send.reduce1(empty);
    next();
  });

  // GET
  protect.finalize('instance', 'get', function (request, response, next) {
    request.baucis.send.observe().map(lastModified).resume();
    request.baucis.send = request.baucis.send.map(stringify);
    request.baucis.send.observe().reduce1(etag(response)).resume();
    next();
  });

  protect.finalize('collection', 'get', function (request, response, next) {
    request.baucis.send = request.baucis.send.map(stringify);
    if (request.baucis.count) request.baucis.send = request.baucis.send.reduce(0, count).map(stringify);
    else request.baucis.send = request.baucis.send.consume(singleOrArray(true));
    next();
  });

  // POST
  protect.finalize('collection', 'post', function (request, response, next) {
    request.baucis.send = request.baucis.send.map(stringify);
    request.baucis.send = request.baucis.send.consume(singleOrArray());
    next();
  });

  // PUT
  protect.finalize('put', function (request, response, next) {
    request.baucis.send = request.baucis.send.map(stringify);
    next();
  });

  // DELETE
  protect.finalize('del', function (request, response, next) {
    request.baucis.send = request.baucis.send.consume(remove); // TODO move this to another finalize component
    request.baucis.send = request.baucis.send.reduce(0, count).map(stringify);
    next();
  });

  protect.finalize(function (request, response, next) {
    request.baucis.send.stopOnError(next).pipe(response);
  });
};

