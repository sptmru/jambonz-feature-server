const router = require('express').Router();
const pino = require('pino');
const sysError = require('./error');
const sessionTrackerFactory = require('../../session/session-tracker');
const {TaskName} = require('../../utils/constants.json');
const {DbErrorUnprocessableRequest} = require('../utils/errors');
const {JAMBONES_LOGLEVEL} = require('../../config');

const logger = pino({
  level: JAMBONES_LOGLEVEL
}, pino.destination({sync: false}));

const { srf } = require('../../../app');

const sessionTracker = srf.locals.sessionTracker = sessionTrackerFactory({
  incrementFreeswitchCalls: srf.locals.incrementFreeswitchCalls,
  decrementFreeswitchCalls: srf.locals.decrementFreeswitchCalls,
  logger
});

/**
 * validate the call state
 */
function retrieveCallSession(callSid, opts) {
  const cs = sessionTracker.get(callSid);
  if (cs) {
    const task = cs.currentTask;
    if (!task || task.name != TaskName.Conference) {
      throw new DbErrorUnprocessableRequest(`conference api failure: indicated call is not waiting: ${task.name}`);
    }
  }
  return cs;
}

/**
 * notify a waiting session that a conference has started
 */
router.post('/:callSid', async(req, res) => {
  const logger = req.app.locals.logger;
  const callSid = req.params.callSid;
  logger.debug({body: req.body}, 'got conference request');
  try {
    const cs = retrieveCallSession(callSid, req.body);
    if (!cs) {
      logger.info(`conference: callSid not found ${callSid}`);
      return res.sendStatus(404);
    }
    res.status(202).end();
    cs.notifyConferenceEvent(req.body);
  } catch (err) {
    sysError(logger, res, err);
  }
});

module.exports = router;
