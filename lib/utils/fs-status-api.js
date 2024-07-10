const {FS_STATUS_API, FS_STATUS_API_KEY, JAMBONES_LOGLEVEL} = require('../../lib/config');
const axios = require('axios');
const pino = require('pino');

const opts = {
  level: JAMBONES_LOGLEVEL
};
const logger = pino(opts, pino.destination({sync: false}));

class FsStatusApiWrapper {
  static async incrementFreeswitchCalls(ms) {
    const fsStatusUrl = `${FS_STATUS_API}/instanceCalls/${ms}`;
    try {
      await axios.put(
        fsStatusUrl,
        { modificationType: 'INCREMENT'}, { headers: {'Authorization': `Bearer ${FS_STATUS_API_KEY}` }}
      );
      logger.info(`incrementFreeswitchCalls: incremented freeswitch call status for ${ms}`);
    } catch (err) {
      // eslint-disable-next-line max-len
      logger.error(`incrementFreeswitchCalls: error incrementing freeswitch call status for ${ms}: ${err.message}`);
    }
  }

  static async decrementFreeswitchCalls(ms) {
    const fsStatusUrl = `${FS_STATUS_API}/instanceCalls/${ms}`;
    try {
      await axios.put(
        fsStatusUrl,
        { modificationType: 'DECREMENT'}, { headers: {'Authorization': `Bearer ${FS_STATUS_API_KEY}` }}
      );
      logger.info(`incrementFreeswitchCalls: decremented freeswitch call status for ${ms}`);
    } catch (err) {
      // eslint-disable-next-line max-len
      logger.error(`incrementFreeswitchCalls: error decrementing freeswitch call status for ${ms}: ${err.message}`);
    }
  }

  static async deleteInstanceData(instanceId) {
    const fsStatusUrl = `${FS_STATUS_API}/instanceCalls/${instanceId}`;
    try {
      await axios.delete(fsStatusUrl, {'Authorization': `Bearer ${FS_STATUS_API_KEY}` });
    } catch (error) {
      logger.error(`deleteInstanceData: error deleting instance data: ${error.message}`);
    }
  }
}

module.exports = { FsStatusApiWrapper };
