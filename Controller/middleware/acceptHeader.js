// __Module Definition__
var decorator = module.exports = function () {
  // Build the "Accept" response header.
  this.request(true, function (request, response, next) {
    var putOff = (request.baucis.controller.get('put') === false);
    var postOff = (request.baucis.controller.get('post') === false);

    if (putOff && postOff) return next();

    response.set('Accept', 'application/json, application/x-www-form-urlencoded');
    next();
  });
};
