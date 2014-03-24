// __Dependencies__
var _ = require('highland');
var crypto = require('crypto');
var errors = require('../../errors');

// __Private Module Members__
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
    request.baucis.send = _(request.baucis.documents).otherwise([ errors.NotFound() ])
      .stopOnError(next).map(check404);
    next();
  });

  // HEAD
  protect.finalize('instance', 'head', function (request, response, next) {
    request.baucis.send.fork().map(lastModified).resume();
    request.baucis.send.invoke('stringify', JSON);
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
    request.baucis.send.invoke('stringify', JSON);
    request.baucis.send.fork().map(etag).resume();
    next();
  });

  protect.finalize('collection', 'get', function (request, response, next) {
    request.baucis.send.invoke('stringify', JSON);
    next();
  });

  // POST
  protect.finalize('collection', 'post', function (request, response, next) {
    request.baucis.send.map(singleOrArray);
    next();
  });

  // PUT
  protect.finalize('put', function (request, response, next) {
    request.baucis.send.invoke('stringify', JSON);
    next();
  });

  protect.finalize('del', function (request, response, next) {
    request.baucis.send.map(remove);
    request.baucis.count = true;
    next();
  });

  protect.finalize(function (request, response, next) {
    if (request.baucis.count) request.baucis.send.reduce(count, 0).map(String);
    request.baucis.send.pipe(response);
  });
};

