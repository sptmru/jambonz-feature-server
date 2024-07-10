#!/usr/bin/env node
const {FsStatusApiWrapper} = require('../lib/utils/fs-status-api');

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

(async function() {

  try {
    do {
      await FsStatusApiWrapper.setFreeswitchCalls();
      await sleep(10000);
    } while (1);
  } catch (err) {
    console.error(err, 'Error adding instance data to FS status API');
    process.exit(-1);
  }
})();
