//process.env.NODE_ENV = 'production'

//const idpApi = require('isatdatapro-api');
const idpApi = require('../lib/api-v1');

const gateway = require('../config/default.json').idpGatewayUrl;
const myMailbox = require('../test/mailboxes-local').credentials[1];

/**
 * Retrieves messages from the specified Mailbox and prints to console
 */
async function getMessages() {
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const date = new Date();
  date.setUTCHours(date.getUTCHours() - 24);
  const filter = {
    startTimeUtc: date,
  };
  return Promise.resolve(idpApi.getReturnMessages(auth, filter, gateway))
  .then(async function (result) {
    if (result.errorId !== 0) {
      let errorName = await idpApi.getErrorName(result.errorId);
      console.log(`Error: ${errorName}`);
    } else {
      if (result.messages !== null) {
        let nextTime = idpApi.idpTimeToDate(result.nextStartTime);
        console.log(`Next: ${nextTime} (IDP time: ${idpApi.dateToIdpTime(nextTime)})`);
        console.log(`${result.messages.length} messages returned`);
        /*
        for (let i = 0; i < result.Messages.length; i++) {
          let message = result.Messages[i];
          console.log(`Message ${i}: ${JSON.stringify(message, null, 2)}`);
        }
        */
      } else {
        console.log(`No messages to retreive from ${myMailbox.accessId}.`);
      }
    }
  })
  .catch(err => {
    console.log(err);
    //throw err;
  });
}

async function getMobiles() {
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const filter = {};
  return Promise.resolve(idpApi.getMobileIds(auth, filter, gateway))
  .then(async function (result) {
    if (result.errorId !== 0) {
      let errorName = await idpApi.getErrorName(result.errorId);
      console.log(`Error: ${errorName}`);
    } else {
      console.log(`${JSON.stringify(result, null, 2)}`);
    }
  })
  .catch(err => {
    console.log(err);
    //throw err;
  });
}

async function submitMessages() {
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const testMessage = {
    mobileId: '01105596SKY37E9',
    payloadRaw: [0, 72],   // will display in Modem Simulator "To-Mobile Messages" pane
  };
  const messages = [testMessage];
  return Promise.resolve(idpApi.submitForwardMessages(auth, messages, gateway))
  .then(async function (result) {
    if (result.errorId !== 0) {
      let errorName = await idpApi.getErrorName(result.errorId);
      console.log(`Error: ${errorName}`);
    } else {
      console.log(`${JSON.stringify(result)}`);
    }
  })
  .catch(err => {
    console.log(`Error: ${err.message}`);
    throw err;
  });
}

async function getStatuses() {
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const date = new Date();
  date.setUTCHours(date.getUTCHours() - 24);
  const filter = {
    startTimeUtc: date,
  };
  return Promise.resolve(idpApi.getForwardStatuses(auth, filter, gateway))
  .then(async function (result) {
    if (result.errorId !== 0) {
      let errorName = await idpApi.getErrorName(result.errorId);
      console.log(`Error: ${errorName}`);
    } else {
      console.log(`${JSON.stringify(result, null, 2)}`);
    }
  })
  .catch(err => {
    console.log(`Error: ${err.message}`);
    throw err;
  });
}

async function getForwardMessage() {
  // 4083477, 4083490
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const ids = 4083477;
  return Promise.resolve(idpApi.getForwardMessages(auth, ids, gateway))
  .then(async function (result) {
    if (result.errorId !== 0) {
      let errorName = await idpApi.getErrorName(result.errorId);
      console.log(`Error: ${errorName}`);
    } else {
      console.log(`${JSON.stringify(result, null, 2)}`);
    }
  })
  .catch(err => {
    console.log(`Error: ${err.message}`);
    throw err;
  });
}

async function cancelForwardMessage() {
  // 4083477, 4083490
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const ids = 4083477;
  return Promise.resolve(idpApi.cancelForwardMessages(auth, ids, gateway))
  .then(async function (result) {
    if (result.errorId !== 0) {
      let errorName = await idpApi.getErrorName(result.errorId);
      console.log(`Error: ${errorName}`);
    } else {
      console.log(`${JSON.stringify(result, null, 2)}`);
      if (result.submissions) {
        for (let s=0; s < result.submissions.length; s++) {
          let cancelation = result.submissions[s];
          if (cancelation.errorId !== 0) {
            let cancelationError = await idpApi.getErrorName(cancelation.errorId);
            console.log(`Cancelation of message failed: ${cancelationError}`);
          }
        }
      }
    }
  })
  .catch(err => {
    console.log(`Error: ${err.message}`);
    throw err;
  });
}

getMessages();
//getMobiles();
//submitMessages();
//getStatuses();
//getForwardMessage();
//cancelForwardMessage();
