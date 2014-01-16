// __Dependencies__
var express = require('express');

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var controller = this;

  var controllerForStage = protect.controllerForStage = {
    initial: express(),
    request: express(),
    query: express(),
    documents: express(),
    finalize: express()
  };
  var initial = controllerForStage.initial;
  var finalize = controllerForStage.finalize;
  var originalGet = controller.get;

  // __Stage Controllers__
  controller.use(controllerForStage.initial);
  controller.use(controllerForStage.request);
  controller.use(controllerForStage.query);
  controller.use(controllerForStage.documents);
  controller.use(controllerForStage.finalize);

  Object.keys(controllerForStage).forEach(function (stage) {
    controllerForStage[stage].disable('x-powered-by');
  });

  // Pass the method calls through to the "initial" stage middleware controller,
  // so that it precedes all other stages and middleware that might have been
  // already added.
  controller.use = initial.use.bind(initial);
  controller.head = initial.head.bind(initial);
  controller.post = initial.post.bind(initial);
  controller.put = initial.put.bind(initial);
  controller.del = initial.del.bind(initial);
  controller.delete = initial.delete.bind(initial);

  controller.get = function () {
    // When getting options set on the controller, use the original functionality.
    if (arguments.length === 1) return originalGet.apply(controller, arguments);
    // Otherwise set get middleware on initial.
    else return initial.get.apply(initial, arguments);
  };
};
