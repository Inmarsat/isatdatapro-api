const myMailbox = {
  "description": "myMailbox",
  "accessId": "myAccessId",
  "password": "myPassword"
};

const idpApi = require('isatdatapro-api');

async function getMessages() {
  const auth = {
    accessId: myMailbox.accessId,
    password: myMailbox.password
  };
  const date = new Date();
  date.setUTCHours(date.getUTCHours() - 24);
  const filter = {
    startTimeUtc: idpApi.dateToIdpTime(date),
  };
  return Promise.resolve(idpApi.getMobileOriginatedMessages(auth, filter))
  .then(function (result) {
    if (result.ErrorID !== 0) {
      console.log(`Error: ${idpApi.getErrorName(result.ErrorID)}`);
    } else {
      if (result.Messages !== null) {
        for (let i = 0; i < result.Messages.length; i++) {
          let message = result.Messages[i];
          console.log(`Message ${i}: ${JSON.stringify(message, null, 2)}`);
        }
      } else {
        console.log('No messages to retreive.');
      }
    }
  })
  .catch(err => {
    throw err;
  });
}