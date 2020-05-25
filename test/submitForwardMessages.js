'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');
const mailboxes = require('./mailboxes-local').credentials;
const testTerminals = require('./mailboxes-local').testTerminals;

const mailboxIndex = 2
const testMobileId = testTerminals[mailboxIndex].mobileId;
const auth = mailboxes[mailboxIndex];

const RETRIEVAL_OFFSET = 24;   //: for Forward statuses

describe('#ForwardMessage test suite', function() {
  const TEST_MESSAGE_SIZE = 100;
  let forwardIds = [];
  
  describe('#submitForwardMessages()', function () {
    let userMessageId = 0;
    beforeEach(function() {
      userMessageId += 1;
    });
    const apiKeys = ['errorId', 'submissions'];
    const submissionKeys = ['errorId', 'messageId', 'userMessageId', 
      'mobileId', 'stateTime', 'scheduledSendTime', 'mobileWakeupPeriod',
      'size'
    ];
    const description = `should return an array of Submissions `
        + `with ${submissionKeys}`;
    it(description, function () {
      const testMessage = {
        mobileId: testMobileId,
        userMessageId: userMessageId,
        payloadRaw: [0, 72],   // getLocation
      };
      console.log(`Submitting message to ${testMobileId}`);
      const messages = [testMessage];
      return Promise.resolve(idpApi.submitForwardMessages(auth, messages))
      .then(function (result) {
        expect(result).to.be.an('Object').that.includes.all.keys(apiKeys);
        expect(result.errorId).to.equal(0);
        expect(result.submissions).to.be.an('Array').that.has.lengthOf(1);
        let submission = result.submissions[0];
        expect(submission).to.be.an('Object')
          .that.includes.all.keys(submissionKeys);
        forwardIds.push(submission.messageId);
        console.log(`Added ${submission.messageId} to forwardIds ${JSON.stringify(forwardIds)}`);
        expect(submission.userMessageId).to.equal(userMessageId);
        expect(submission.mobileId).to.equal(testMobileId);
        if (submission.mobileWakeupPeriod) {
          expect(submission).has.property('scheduledSendTime');
        }
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
  });
  
  describe('#getForwardStatuses()', function () {
    //const auth = mailboxes[mailboxIndex];
    //Get the status of the submitted message
    const apiKeys = ['errorId', 'statuses', 'more', 'nextStartTime'];
    const statusKeys = ['errorId', 'messageId', 'referenceNumber',
      'state', 'stateTime', 'isClosed'
    ];
    const description = `should return an array of Statuses with ${statusKeys}`;
    it(description, function () {
      console.log(`Checking locally stored statuses: ${forwardIds}`);
      let filter = {};
      if (forwardIds.length > 0) {
        filter.ids = forwardIds;
      } else {
        const date = new Date();
        date.setUTCHours(date.getUTCHours() - RETRIEVAL_OFFSET);
        filter.startTimeUtc = date;
      }
      return Promise.resolve(idpApi.getForwardStatuses(auth, filter))
      .then(function (result) {
        //console.log('getForwardStatuses RESULT: ' + JSON.stringify(result, null, 2));
        expect(result).to.be.an('Object').that.includes.all.keys(apiKeys);
        if (result.errorId !== 0) {
          idpApi.getErrorName(result.errorId).then(errorName => {
            console.log('getForwardStatuses ERROR: ' + errorName);
          });
        }
        expect(result.errorId).to.equal(0);
        expect(result.more).to.be.a('boolean');
        if (result.more) {
          expect(result.nextStartTime).to.be.a('string');
        }
        expect(result.statuses).to.be.an('Array');
        for (let i = 0; i < result.statuses.length; i++) {
          let status = result.statuses[i];
          expect(status)
            .to.be.an('Object')
            .that.includes.all.keys(statusKeys);
          expect(status.errorId).to.be.a('number');
          expect(status.state).to.be.a('number');
          expect(status.stateTime).to.be.a('string');
        }
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    });
  });
  
  describe('#getForwardMessages()', function() {
    const apiKeys = ['errorId', 'messages'];
    const messageKeys = ['messageId', 'mobileId', 'mailboxTime', 'errorId',
      'isClosed', 'state', 'stateTime', 'referenceNumber', 'payloadJson', 'payloadRaw'
    ];
    it(`should return array of message(s) each with ${messageKeys}`, function () {
      if (forwardIds.length > 0) {
        return Promise.resolve(idpApi.getForwardMessages(auth, forwardIds))
        .then(function (result) {
          console.log('getForwardMessages RESULT: ' + JSON.stringify(result, null, 2));
          expect(result).to.be.an('Object').that.includes.all.keys(apiKeys);
          expect(result.errorId).to.equal(0);
          expect(result.messages).to.be.an('Array')
            .that.has.lengthOf.greaterThan(0);
          for (let i = 0; i < result.messages.length; i++) {
            let message = result.messages[i];
            expect(message).to.be.an('Object')
              .that.includes.all.keys(messageKeys);
          }
        })
        .catch(err => {
          console.log(`Error: ${err.message}`);
          throw err;
        });
      }
    });
    //Retrieve the message that was submitted
  });

  describe('#cancelForwardMessages()', function() {
    const apiKeys = ['errorId', 'submissions'];
    const submissionKeys = ['errorId', 'messageId', 'userMessageId', 
      'mobileId', 'stateTime', 'scheduledSendTime', 'mobileWakeupPeriod',
      'size'
    ];
    const description = `should return a list of submissions each with ${submissionKeys}`;
    //Retrieve the message that was submitted
    it(description, function () {
      if (forwardIds.length > 0) {
        let ids = forwardIds[forwardIds.length - 1];
        return Promise.resolve(idpApi.cancelForwardMessages(auth, ids))
        .then(function (result) {
          //console.log('cancelForwardMessages RESULT: ' + JSON.stringify(result, null, 2));
          expect(result).to.be.an('Object').that.includes.all.keys(apiKeys);
          expect(result.errorId).to.equal(0);
          expect(result.submissions).to.be.an('Array').that.has.lengthOf.greaterThan(0);
          for (let i = 0; i < result.submissions.length; i++) {
            let submission = result.submissions[i];
            expect(submission).to.be.an('Object')
              .that.includes.all.keys(submissionKeys);
          }
        })
        .catch(err => {
          console.log(`Error: ${err.message}`);
          throw err;
        });
      }
    });
  });
});
