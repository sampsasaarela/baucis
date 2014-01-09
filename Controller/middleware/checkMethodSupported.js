// __Module Definition__
var mixin = module.exports = function () {
  this.request(true, function (request, response, next) {
    console.log('CGHEKING METHOD')
    var method = request.method === 'DELETE' ? 'del' : request.method.toLowerCase();
    if (request.baucis.controller.get(method) !== false) return next();
    response.send(405, 'The requested method has been disabled for this resource.');
  });
};
