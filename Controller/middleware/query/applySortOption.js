// __Module Definition__
var decorator = module.exports = function () {
  this.query(function (request, response, next) {
    if (request.query.sort) request.baucis.query.sort(request.query.sort);
    next();
  });
};
