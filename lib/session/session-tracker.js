const Emitter = require('events');
const assert = require('assert');

/**
 * @classdesc This is a singleton class that tracks active sessions in a Map indexed
 * by callSid.  Its function is to allow us to accept inbound REST callUpdate requests
 * for a callSid and to be able to retrieve and operate on the corresponding CallSession.
 */
class SessionTracker extends Emitter {
  constructor({incrementFreeswitchCalls, decrementFreeswitchCalls, logger}) {
    super();

    this.sessions = new Map();
    this.incrementFreeswitchCalls = incrementFreeswitchCalls;
    this.decrementFreeswitchCalls = decrementFreeswitchCalls;
    this._logger = logger;
  }

  get logger() {
    return this._logger;
  }

  get count() {
    return this.sessions.size;
  }

  /**
   * Adds a new CallSession to the Map
   * @param {string} callSid
   * @param {CallSession} callSession
   */
  add(callSid, callSession) {
    assert(callSid);
    this.sessions.set(callSid, callSession);
    void this.incrementFreeswitchCalls(callSession.hostname);
    this.logger.info(`SessionTracker:add callSid ${callSid}, we have ${this.sessions.size} session being tracked`);
  }

  /**
   * Removes a CallSession from the Map
   * @param {string} callSid
   */
  remove(callSid) {
    assert(callSid);
    const session = this.get(callSid);
    void this.decrementFreeswitchCalls(session.hostname);
    this.sessions.delete(callSid);
    this.logger.info(`SessionTracker:remove callSid ${callSid}, we have ${this.sessions.size} being tracked`);
    if (0 === this.sessions.size) this.emit('idle');
  }

  /**
   * Checks if a given callSid is in the Map
   * @param {string} callSid
   */
  has(callSid) {
    return this.sessions.has(callSid);
  }

  /**
   * Retrieves the active CallSession for a given callSid
   * @param {string} callSid
   */
  get(callSid) {
    return this.sessions.get(callSid);
  }
}

module.exports = (deps) => new SessionTracker(deps);
