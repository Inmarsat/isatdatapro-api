const idpApi = require('isatdatapro-api');

const myMailbox = {
  mailboxId: 1234,   //: Replace this with your own Mailbox ID
  accessId: 'myAccessId',   //: Replace this with your mailbox Access ID
  password: 'myPassword',   //: Replace this with your mailbox password
};

/**
 * Retrieves messages from the specified Mailbox and prints up to 2 to console
 */
(async function getMessages() {
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const date = new Date();
  date.setUTCHours(date.getUTCHours() - 24);
  const filter = {
    startTimeUtc: date,
  };
  return Promise.resolve(idpApi.getReturnMessages(auth, filter))
  .then(async function (result) {
    if (result.errorId !== 0) {
      let errorName = await idpApi.getErrorName(result.errorId);
      console.log(`Error: ${errorName}`);
    } else {
      if (result.messages !== null) {
        let nextTime = new Date(result.nextStartTimeUtc);
        console.log(`Next: ${nextTime} (IDP time: ${idpApi.dateToIdpTime(nextTime)})`);
        console.log(`${result.messages.length} messages retrieved`);
        for (let i = 0; i < Math.min(result.messages.length, 2); i++) {
          let message = result.messages[i];
          console.log(`Message ${i}: ${JSON.stringify(message, null, 2)}`);
        }
      } else {
        console.log(`No messages to retreive from ${myMailbox.mailboxId}.`);
      }
    }
  })
  .catch(err => {
    console.log(err);
  });
})();
