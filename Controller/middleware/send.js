// __Dependencies__
var crypto = require('crypto');
var es = require('event-stream');
var JSONStream = require('JSONStream');
var errors = require('../../errors');

// __Private Module Members__
function singleOrArray () {
  var first = false;
  var multiple = false;

  return es.through(
    function (doc) {
      if (!first) {
        first = JSON.stringify(doc);
      }
      else if (!multiple) {
        multiple = true;
        this.emit('data', '[');
        this.emit('data', first);
        this.emit('data', ',\n')
        this.emit('data', JSON.stringify(doc));
      }
      else {
        this.emit('data', ',\n');
        this.emit('data', JSON.stringify(doc));
      }
    },
    function () {
      if (!first) return this.emit('end');
      else if (!multiple) this.emit('data', first);
      else this.emit('data', ']');
      this.emit('end');
    }
  );
};

function removeDocuments () {
  return es.map(function (doc, callback) {
    doc.remove(callback);
  });
}

function count () {
  var count = 0;

  return es.through(
    function () { count += 1 },
    function () {
      this.emit('data', String(count));
      this.emit('end');
    }
  );
}

function check404 () {
  var count = 0;

  return es.through(
    function (doc) { count += 1, this.emit('data', doc) },
    function () {
      if (count === 0) return this.emit('error', errors.NotFound());
      this.emit('end');
    }
  );
}

function etag (response) {
  var hash = crypto.createHash('md5');
  return es.map(function (doc, callback) {
    if (response.get('Etag')) return callback(null, doc);
    hash.update(JSON.stringify(doc));
    response.set('Etag', '"' + hash.digest('hex') + '"');
    callback(null, doc);
  });
}

function lastModified (response, lastModifiedPath) {
  return es.map(function (doc, callback) {
    if (response.get('Last-Modified')) return callback(null, doc);
    if (lastModifiedPath) response.set('Last-Modified', doc.get(lastModifiedPath));
    callback(null, doc);
  });
}

function emptyString () {
  return es.map(function (doc, callback) {
    callback(null, '');
  });
}

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var controller = this;

  // // TODO these need to happen for all routes
  // // If no routes matched, initialization didn't happen; it's a non-baucis route.
  // if (!request.baucis) return next();

  protect.finalize(function (request, response, next) {
    response.type('json');
    request.baucis.pipe(check404(next));
    next();
  });

  protect.finalize('del', function (request, response, next) {
    request.baucis.pipe(removeDocuments());
    request.baucis.pipe(count());
    next();
  });

  protect.finalize('put', function (request, response, next) {
    request.baucis.pipe(JSONStream.stringify(false));
    next();
  });

  protect.finalize('collection', 'head', function (request, response, next) {
    // TODO use es.wait for setting etag and lastModified on collections!!
    request.baucis.pipe(emptyString());
    next();
  });

  protect.finalize('instance', 'head', function (request, response, next) {
    var lastModifiedPath = request.baucis.controller.get('lastModified');
    request.baucis.pipe(etag(response));
    request.baucis.pipe(lastModified(response, lastModifiedPath));
    request.baucis.pipe(emptyString());
    next();
  });

  protect.finalize('instance', 'get', function (request, response, next) {
    request.baucis.pipe(etag(response));
    request.baucis.pipe(lastModified(response));
    if (request.baucis.count) request.baucis.pipe(count());
    else request.baucis.pipe(JSONStream.stringify(false));
    next();
  });

  protect.finalize('collection', 'get', function (request, response, next) {
    if (request.baucis.count) request.baucis.pipe(count());
    else request.baucis.pipe(JSONStream.stringify());
    next();
  });

  protect.finalize('collection', 'post', function (request, response, next) {
    request.baucis.pipe(singleOrArray());
    next();
  });

  protect.finalize(function (request, response, next) {
    request.baucis.pipe();
  });
};

