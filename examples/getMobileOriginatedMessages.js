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
  return Promise.resolve(idpApi.getMobileOriginatedMessages(auth, filter, gateway))
  .then(function (result) {
    if (result.ErrorID !== 0) {
      console.log(`Error: ${idpApi.getErrorName(result.ErrorID)}`);
    } else {
      let nextTime = idpApi.idpTimeToDate(result.NextStartUTC);
      console.log(`Next: ${nextTime} (IDP time: ${idpApi.dateToIdpTime(nextTime)})`);
      if (result.Messages !== null) {
        console.log(`${result.Messages.length} messages returned`);
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
    throw err;
  });
}

getMessages();
