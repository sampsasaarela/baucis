// __Dependencies__
var express = require('express');
var errors = require('../errors');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

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
