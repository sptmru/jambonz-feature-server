const {FS_STATUS_API, FS_STATUS_API_KEY, JAMBONES_LOGLEVEL, K8S_POD_IP} = require('../../lib/config');
const axios = require('axios');
const pino = require('pino');

const opts = {
  level: JAMBONES_LOGLEVEL
};
const logger = pino(opts, pino.destination({sync: false}));
const sessionTracker = require('../session/session-tracker');
const {count} = sessionTracker;

class FsStatusApiWrapper {
  static async setFreeswitchCalls() {
    const fsStatusUrl = `${FS_STATUS_API}/instanceCalls`;
    try {
      await axios.post(
        fsStatusUrl,
        { instanceId: `${K8S_POD_IP}`, callsQuantity: count || 0 },
        { headers: {'Authorization': `Bearer ${FS_STATUS_API_KEY}` }}
      );
      logger.info('incrementFreeswitchCalls: instance data created');
    } catch (err) {
      // eslint-disable-next-line max-len
      logger.error(`incrementFreeswitchCalls: error creating instance data: ${err.message}`);
    }
  }

  static async getFreeswitchInstance(ms)  {
    const fsStatusUrl = `${FS_STATUS_API}/instanceCalls/${ms}`;
    try {
      const instanceData = await axios.get(
        fsStatusUrl, { headers: {'Authorization': `Bearer ${FS_STATUS_API_KEY}` }}
      );
      return instanceData.data?.instanceId;
    } catch (err) {
      logger.error(`getFreeswitchInstance: error getting ${ms}: ${err.message}`);
    }
  }

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
      await axios.delete(fsStatusUrl, { headers: {'Authorization': `Bearer ${FS_STATUS_API_KEY}` }});
    } catch (error) {
      logger.error(`deleteInstanceData: error deleting ${instanceId} data: ${error}`);
    }
  }
}

module.exports = { FsStatusApiWrapper };
