#!/usr/bin/env node
const bent = require('bent');
const getJSON = bent('json');
const {PORT, K8S_POD_IP} = require('../lib/config');
const {FsStatusApiWrapper} = require('../lib/utils/fs-status-api');

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

(async function() {

  try {
    do {
      const obj = await getJSON(`http://127.0.0.1:${PORT}/`);
      const {calls} = obj;
      if (calls === 0) {
        console.log('no calls on the system, we can exit');
        void FsStatusApiWrapper.deleteInstanceData(K8S_POD_IP);
        process.exit(0);
      }
      else {
        console.log(`waiting for ${calls} to exit..`);
      }
      await sleep(10000);
    } while (1);
  } catch (err) {
    console.error(err, 'Error querying health endpoint');
    process.exit(-1);
  }
})();
