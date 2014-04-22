// __Dependencies__
var express = require('express');
var BaucisError = require('../BaucisError');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;
  // __Set up request.baucis__
  controller.request(function (request, response, next) {
    if (request.baucis) return next(BaucisError.Configuration('Baucis request property already created!'));
    request.baucis = {};
    request.baucis.api = controller.api();
    request.baucis.controller = controller;
    if (controller.enabled('x-powered-by')) response.set('X-Powered-By', 'Baucis');
    next();
  });
};
