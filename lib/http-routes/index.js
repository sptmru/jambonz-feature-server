const express = require('express');
const api = require('./api');
const routes = express.Router();
const sessionTracker = require('../session/session-tracker');

const readiness = (req, res) => {
  const {count} = sessionTracker;
  const {srf} = require('../..');
  const {getFreeswitch} = srf.locals;
  if (getFreeswitch()) {
    return res.status(200).json({calls: count});
  }
  return res.status(200).json({calls: 0});
};

routes.use('/v1', api);

// health check
routes.get('/health', readiness);

module.exports = routes;
