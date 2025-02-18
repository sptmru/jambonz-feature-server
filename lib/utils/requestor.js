const assert = require('assert');

function isAbsoluteUrl(u) {
  return typeof u === 'string' &&
    u.startsWith('https://') || u.startsWith('http://');
}

class Requestor {
  constructor(logger, account_sid, hook, secret) {
    assert(typeof hook === 'object');

    this.logger = logger;
    this.url = hook.url;
    this.method = hook.method || 'POST';

    this.username = hook.username;
    this.password = hook.password;
    this.secret = secret;
    this.account_sid = account_sid;

    assert(isAbsoluteUrl(this.url));
    assert(['GET', 'POST'].includes(this.method));

    const {stats} = require('../../').srf.locals;
    this.stats = stats;

  }

}

module.exports = Requestor;
