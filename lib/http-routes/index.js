const express = require('express');
const api = require('./api');
const routes = express.Router();
const sessionTrackerFactory = require('../session/session-tracker');

const readiness = (req, res) => {
  const logger = req.app.locals.logger;
  const {srf} = require('../..');
  const sessionTracker = srf.locals.sessionTracker = sessionTrackerFactory({
    incrementFreeswitchCalls: srf.locals.incrementFreeswitchCalls,
    decrementFreeswitchCalls: srf.locals.decrementFreeswitchCalls,
    logger
  });
  const {count} = sessionTracker;
  const {getFreeswitch} = srf.locals;
  if (getFreeswitch()) {
    return res.status(200).json({calls: count});
  }
  logger.info('responding to /health check with failure as freeswitch is not up');
  res.sendStatus(480);
};

routes.use('/v1', api);

// health check
routes.get('/health', readiness);

module.exports = routes;
