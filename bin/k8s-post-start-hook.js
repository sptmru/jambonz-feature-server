#!/usr/bin/env node
const {FsStatusApiWrapper} = require('../lib/utils/fs-status-api');

(async function() {

  try {
    void FsStatusApiWrapper.setFreeswitchCalls();
  } catch (err) {
    console.error(err, 'Error adding instance data to FS status API');
    process.exit(-1);
  }
})();
