// __Dependencies__
var express = require('express');
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  // __Body Parsers__
  // // Middleware for parsing JSON POST/PUTs
  // controller.use(express.json());
  // // Middleware for parsing form POST/PUTs
  // controller.use(express.urlencoded());

  // __Setup request.baucis__
  controller.request(function (request, response, next) {
    if (request.baucis) return next(errors.Configuration('Baucis request property already created!'));
    request.baucis = {};
    request.baucis.api = controller.get('api');
    request.baucis.controller = controller;
    if (controller.enabled('x-powered-by')) response.set('X-Powered-By', 'Baucis');
    next();
  });
};
