// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.request(true, function (request, response, next) {
    if (request.baucis) return next(new Error('Baucis request property already created!'));
    request.baucis = {};
    request.baucis.controller = controller;
    if (controller.enabled('x-powered-by')) response.set('X-Powered-By', 'Baucis');
    next();
  });
};
