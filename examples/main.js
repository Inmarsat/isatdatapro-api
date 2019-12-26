'use strict';

const idpApi = require('../lib');
const mailboxes = require('../config/mailboxes').credentials;
const mailboxIndex = (idpApi.apiUrl.includes('api.inmarsat.com')) ? 1 : 0;
const auth = mailboxes[mailboxIndex];

const RETRIEVAL_OFFSET = 24;
const date = new Date();
date.setUTCHours(date.getUTCHours() - RETRIEVAL_OFFSET);
const filter = {
  startTimeUtc: idpApi.dateToIdpTime(date),
};

idpApi.getMobileOriginatedMessages(auth, filter)
.then(function (result) {
  if (result.Messages && result.Messages !== null) {
    for (let i = 0; i < result.Messages.length; i++) {
      let message = result.Messages[i];
      if (message.Payload) {
        //TODO
      } else if (message.RawPayload) {
        //TODO
      }
      console.log(JSON.stringify(message, null, 2));
    }
  }
})
.catch(err => {
  console.log(err);
});
