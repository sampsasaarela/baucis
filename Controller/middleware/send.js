// __Dependencies__
var es = require('event-stream');
var crypto = require('crypto');
var errors = require('../../errors');

// __Private Module Members__
// A map that is used to create empty response body.
function empty (doc, callback) { callback(null, '') }
// Emit a single instance or an array of instances.
function singleOrArray (alwaysArray) {
  var first = false;
  var multiple = false;

  return es.through(
    function (doc) {
      // Start building the output.  If this is the first document,
      // store it for a moment.
      if (!first) {
        first = doc;
        return;
      }
      // If this is the second document, output array opening and the two documents
      // separated by a comma.
      if (!multiple) {
        multiple = true;
        this.emit('data', '[');
        this.emit('data', JSON.stringify(first));
        this.emit('data', ',\n')
        this.emit('data', JSON.stringify(doc));
        return;
      }
      // For all documents after the second, emit a comma preceding the document.
      this.emit('data', ',\n');
      this.emit('data', JSON.stringify(doc));
    },
    function () {
      // If no documents, simply end the stream.
      if (!first) return this.emit('end');
      // If only one document emit it unwrapped, unless always returning an array.
      if (!multiple && alwaysArray) this.emit('data', '[');
      if (!multiple) this.emit('data', JSON.stringify(first));
      // For greater than one document, emit the closing array.
      else this.emit('data', ']');
      if (!multiple && alwaysArray) this.emit('data', ']');
      // Done.  End the stream.
      this.emit('end');
    }
  );
};

function etag (response) {
  return es.map(function (doc, callback) {
    var hash = crypto.createHash('md5');
    var etag = response.get('Etag');
    if (etag) return callback(null, doc);
    hash.update(JSON.stringify(doc));
    response.set('Etag', '"' + hash.digest('hex') + '"');
    callback(null, doc);
  });
}

function lastModified (response, lastModifiedPath) {
  return es.map(function (doc, callback) {
    if (!response.get('Last-Modified') && lastModifiedPath) {
      response.set('Last-Modified', doc.get(lastModifiedPath));
    }
    callback(null, doc);
  });
}

function reduce (accumulated, f) {
  return es.through(
    function (doc) {
      accumulated = f(accumulated, doc);
    },
    function () {
      this.emit('data', accumulated);
      this.emit('end');
    }
  );
}

function count () {
  return reduce(0, function (a, b) { return a + 1 });
}

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var controller = this;

  // Create the basic stream.
  protect.finalize(function (request, response, next) {
    var count = 0;
    response.type('json');
    request.baucis.send = es.pipeline(
      // Stream the relevant documents from Mongo, based on constructed query.
      request.baucis.query.stream(),
      // Check for 404.
      es.through(
        function (doc) {
          count += 1;
          this.emit('data', doc);
        },
        function () {
          if (count === 0) return this.emit('error', errors.NotFound());
          else return this.emit('end');
        }
      ),
      // Apply user streams.
      request.baucis.outgoing()
    );
    response.format({
      json: function () {
        request.baucis.formatter = singleOrArray;
        next();
      }
    });
  });

  // HEAD
  protect.finalize('instance', 'head', function (request, response, next) {
    request.baucis.send = es.pipeline(
      request.baucis.send,
      lastModified(response, controller.get('lastModified')),
      es.stringify(),
      etag(response),
      es.map(empty)
    );
    next();
  });

  protect.finalize('collection', 'head', function (request, response, next) {
    request.baucis.send = es.pipeline(
      request.baucis.send,
      es.map(empty)
    );
    next();
  });

  // GET
  protect.finalize('instance', 'get', function (request, response, next) {
    request.baucis.send = es.pipeline(
      request.baucis.send,
      lastModified(response, controller.get('lastModified')),
      etag(response),
      request.baucis.formatter()
    );
    next();
  });

  protect.finalize('collection', 'get', function (request, response, next) {
    request.baucis.send = es.pipeline(
      request.baucis.send,
      request.baucis.count ? es.pipeline(count(), es.stringify()) : request.baucis.formatter(true)
    );
    next();
  });

  // POST
  protect.finalize('collection', 'post', function (request, response, next) {
    request.baucis.send = es.pipeline(
      request.baucis.send,
      request.baucis.formatter()
    );
    next();
  });

  // PUT
  protect.finalize('put', function (request, response, next) {
    request.baucis.send = es.pipeline(
      request.baucis.send,
      request.baucis.formatter()
    );
    next();
  });

  // DELETE
  protect.finalize('del', function (request, response, next) {
    request.baucis.send = es.pipeline(
      request.baucis.send,
      // Remove each document from the database.
      es.map(function (doc, callback) { doc.remove(callback) }),
      count(),
      es.stringify()
    );
    next();
  });

  protect.finalize(function (request, response, next) {
    request.baucis.send.on('error', next);
    request.baucis.send.pipe(response);
  });
};

