'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');
const mailboxes = require('./mailboxes-local').credentials;
const testTerminals = require('./mailboxes-local').testTerminals;
//const modemMessages = require('./modem-messages');

// Set to 0 for simulator or 1 for live gateway
// TODO: REMOVE const config = require('config');
//console.log(`Testing NODE_ENV ${config.util.getEnv('NODE_ENV')} at ${idpApi.apiUrl}`);
let mailboxIndex = 0
if (idpApi.apiUrl.includes('api.inmarsat.com')) {
  mailboxIndex = 2;
}
const testMobileId = testTerminals[mailboxIndex].mobileId;
const auth = mailboxes[mailboxIndex];

describe('api-v1', function() {
  const RETRIEVAL_OFFSET = 24;

  describe('#getIdpVersion()', function () {
    it('should return a version string', function () {
      return Promise.resolve(idpApi.getIdpVersion())
      .then(result => {
        console.log('Returned:', JSON.stringify(result));
        expect(result).to.be.a('string');
        //TODO: additional criteria on format X.Y.Z.a
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
  });
  
  describe('#getIdpTime()', function () {
    it('should return UTC time', function () {
      return Promise.resolve(idpApi.getIdpTime())
      .then(function (result) {
        console.log('Returned:', JSON.stringify(result));
        expect(result).to.be.a('Date');
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
  });
  
  describe('#dateToIdpTime()', function () {
    let d = new Date();
    let dString = d.toISOString();
    let result;
    it(`${d} should return IDP datestamp`, function() {
      result = idpApi.dateToIdpTime(d);
      expect(result).to.be.a('string').with.length(19);
      console.log(`result: ${result}`);
    })
    it(`${dString} should return IDP datestamp`, function() {
      result = idpApi.dateToIdpTime(dString);
      expect(result).to.be.a('string').with.length(19);
      console.log(`result: ${result}`);
    })
    it(`other should return 1970-01-01 00:00:00`, function() {
      result = idpApi.dateToIdpTime('other');
      expect(result).to.equal('1970-01-01 00:00:00');
      console.log(`result: ${result}`);
    })
  });
  
  describe('#getErrorDefinitions()', function () {
    const keys = ['errorId', 'name', 'description'];
    const testDesc = 'should return a non-empty Array of error code objects'
                      + ` with properties ${keys}`;
    it(testDesc, function () {
      return Promise.resolve(idpApi.getErrorDefinitions())
      .then(function (result) {
        expect(result)
          .to.be.an('Array')
          .that.has.lengthOf.above(1);
        console.log(`Returned ${result.length} definitions`);
        //console.log('First entry:', JSON.stringify(result[0], null, 2));
        for (let i = 0; i < result.length; i++) {
          expect(result[i]).to.have.all.keys(keys);
        }
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
  });
  
  describe('#getErrorName()', function () {
    const testCases = {
      0: 'NO_ERRORS',
      1000: 'UNDEFINED',
    };
    context('with number', function () {
      for (let key in testCases) {
        if (!testCases.hasOwnProperty(key)) continue;
        it(key + ' should return ' + testCases[key], function () {
          return Promise.resolve(idpApi.getErrorName(key))
          .then(function (result) {
            console.log(`${result}`);
            expect(result).to.equal(testCases[key]);
          })
          .catch(err => {
            console.log(`Error: ${err.message}`);
            throw err;
          });
        })
      }
    })
  });
  
  describe('#getReturnMessages()', function () {
    /* Native API responses
    const apiKeys = ['ErrorID', 'Messages', 'More', 'NextStartUTC', 'NextStartID'];
    const messageKeys = ['ID', 'MobileID', 'ReceiveUTC', 'MessageUTC', 'RegionName', 'SIN'];
    const payloadKeys = ['SIN', 'MIN', 'Name', 'Fields'];
    */
    const apiKeys = ['errorId', 'messages', 'more', 'nextStartTime', 'nextStartId'];
    const messageKeys = ['messageId', 'mobileId', 'receiveTime', 'mailboxTime', 'satelliteRegion', 'codecServiceId', 'size'];
    const payloadKeys = ['codecServiceId', 'codecMessageId', 'name', 'fields'];
    const fieldKeys = ['name', 'dataType', 'stringValue'];
    const arrayFieldKeys = ['name', 'dataType', 'arrayElements'];
    const arrayKeys = ['index', 'fields'];
    const date = new Date();
    date.setUTCHours(date.getUTCHours() - RETRIEVAL_OFFSET);
    const filter = {
      startTimeUtc: date,
    };
    const description = `should include properties ${apiKeys}`
        + `\n\t where Messages include keys ${messageKeys}`
        + `\n\t and if a message includes Payload it has keys ${payloadKeys}`
        + '\n\t and if a message includes RawPayload it is an array';
    it(description, function () {
      return Promise.resolve(idpApi.getReturnMessages(auth, filter))
      .then(function (result) {
        console.log('Returned:', JSON.stringify(result));
        expect(result)
          .to.be.an('Object')
          .that.has.all.keys(apiKeys);
        expect(result.errorId).to.equal(0);
        if (result.messages !== null) {
          for (let i = 0; i < result.messages.length; i++) {
            let message = result.messages[i];
            expect(message)
              .to.be.an('Object')
              .that.includes.all.keys(messageKeys);
            // Modem Simulator does not seem to provide OTAMessageSize...
            //if (mailboxIndex === 1) expect(message).to.include.key('OTAMessageSize');
            if (message.payloadRaw) {
              expect(message.payloadRaw).to.be.an('Array');
            }
            if (message.payloadJson) {
              expect(message.payloadJson).to.have.all.keys(payloadKeys);
              message.payloadJson.fields.forEach(field => {
                if (field.dataType !== 'array' && field.dataType !== 'message') {
                  expect(field).to.have.all.keys(fieldKeys);
                } else {
                  // TODO: support message dataType?
                  expect(field).to.have.all.keys(arrayFieldKeys);
                  field.arrayElements.forEach(element => {
                    expect(element).to.have.all.keys(arrayKeys);
                    element.fields.forEach(field => {
                      expect(field).to.have.all.keys(fieldKeys);
                    });
                  });
                }
              });
            }
          }
        }
        expect(result.nextStartId).to.be.a('number');
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
    //TODO: auth failure, filter failure, mobile filter
  });
  
  describe('#getMobileIds()', function () {
    /*
    const apiKeys = ['ErrorID', 'Mobiles'];
    const mobileKeys = ['ID', 'Description', 'LastRegistrationUTC', 'RegionName'];
    */
   const apiKeys = ['errorId', 'mobiles'];
   const mobileKeys = ['mobileId', 'description', 'lastRegistrationTime', 'satelliteRegion'];
   const description = 'should return a list of Mobile information including' +
                        `${mobileKeys}`;
    it(description, function () {
      //const auth = mailboxes[mailboxIndex];
      const filter = {};
      return Promise.resolve(idpApi.getMobileIds(auth, filter))
      .then(function (result) {
        expect(result)
          .to.be.an('Object')
          .that.includes.all.keys(apiKeys);
        expect(result.errorId).to.equal(0);
        if (result.mobiles !== null) {
          for (let i = 0; i < result.mobiles.length; i++) {
            expect(result.mobiles[i])
              .to.be.an('Object')
              .that.includes.all.keys(mobileKeys);
          }
        }
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
    //TODO: exercise error cases bad auth, filter out of range, mobile filter
  });
  
  describe('#ForwardMessage sequential tests', function() {
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
      const description = `should return an array of Submissions with ${submissionKeys}`;
      it(description, function () {
        //const auth = mailboxes[mailboxIndex];
        const testMessage = {
          mobileId: testMobileId,
          userMessageId: userMessageId,
          //Payload: modemMessages.pingModemRequest.Payload,  // will not display in Modem Simulator but will solicit response
          payloadRaw: [0, 72],   // will display in Modem Simulator "To-Mobile Messages" pane
        };
        const messages = [testMessage];
        return Promise.resolve(idpApi.submitForwardMessages(auth, messages))
        .then(function (result) {
          expect(result)
            .to.be.an('Object')
            .that.includes.all.keys(apiKeys);
          expect(result.errorId).to.equal(0);
          expect(result.submissions)
            .to.be.an('Array')
            .that.has.lengthOf(1);
          let submission = result.submissions[0];
          expect(submission)
            .to.be.an('Object')
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
          expect(result)
            .to.be.an('Object')
            .that.includes.all.keys(apiKeys);
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
            //console.log('getForwardMessages RESULT: ' + JSON.stringify(result, null, 2));
            expect(result)
              .to.be.an('Object')
              .that.includes.all.keys(apiKeys);
            expect(result.errorId).to.equal(0);
            expect(result.messages).to.be.an('Array').that.has.lengthOf.greaterThan(0);
            for (let i = 0; i < result.messages.length; i++) {
              let message = result.messages[i];
              expect(message)
                .to.be.an('Object')
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
            expect(result)
              .to.be.an('Object')
              .that.includes.all.keys(apiKeys);
            expect(result.errorId).to.equal(0);
            expect(result.submissions).to.be.an('Array').that.has.lengthOf.greaterThan(0);
            for (let i = 0; i < result.submissions.length; i++) {
              let submission = result.submissions[i];
              expect(submission)
                .to.be.an('Object')
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
  describe('#getStateDefinition()', function() {
    let state = 0;
    let stateDef = idpApi.getStateDefinition(state);
    it('should return SUBMITTED', function() {
      expect(stateDef).to.equal('SUBMITTED');
    })
  })
  
});
