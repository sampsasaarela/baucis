// __Module Definition__
var mixin = module.exports = function () {
  var controller = this;

  controller.request(true, function (request, response, next) {
    if (request.baucis) return next(new Error('Baucis request property already created!'));
    request.baucis = {};
    request.baucis.controller = controller;
    response.set('X-Powered-By', 'Baucis');
    next();
  });
};
