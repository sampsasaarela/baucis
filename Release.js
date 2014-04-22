// __Dependencies__
var deco = require('deco');
var express = require('express');
var BaucisError = require('./BaucisError');
// __Module Definition__
var Release = module.exports = deco(function (options) {
  var release = this;

  release.mount = function (controller) {
    controller.activated(true);
    release.use(controller.path(), controller);
  };

  if (!Array.isArray(options.controllers) || options.controllers.length === 0) {
    throw BaucisError.Configuration('There are no controllers in release "%s"', options.release);
  }
  // Mount all published controllers for this version.
  options.controllers.forEach(release.mount.bind(release));
});

Release.factory(express);
Release.decorators(deco.builtin.setOptions);
