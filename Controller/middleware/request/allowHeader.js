// __Module Definition__
var decorator = module.exports = function () {
  // Build the "Allow" response header
  this.request(true, function (request, response, next) {
    var allowed = request.baucis.controller.activeVerbs().map(function (verb) {
      if (verb === 'del') return 'DELETE';
      return verb.toUpperCase();
    });

    response.set('Allow', allowed.join());
    next();
  });
};
