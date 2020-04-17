'use strict';

process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');
const mailboxes = require('./mailboxes-local').credentials;
const testTerminals = require('./mailboxes-local').testTerminals;
//const modemMessages = require('./modem-messages');

// Set to 0 for simulator or 1 for live gateway
const config = require('config');
console.log(`Testing NODE_ENV ${config.util.getEnv('NODE_ENV')} at ${idpApi.apiUrl}`);
let mailboxIndex = 0
if (idpApi.apiUrl.includes('api.inmarsat.com')) {
  mailboxIndex = 1;
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
    const keys = ['ID', 'Name', 'Description'];
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
  
  describe('#getMobileOriginatedMessages()', function () {
    const apiKeys = ['ErrorID', 'Messages', 'More', 'NextStartUTC', 'NextStartID'];
    const messageKeys = ['ID', 'MobileID', 'ReceiveUTC', 'MessageUTC', 'RegionName', 'SIN'];
    const payloadKeys = ['SIN', 'MIN', 'Name', 'Fields'];
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
      return Promise.resolve(idpApi.getMobileOriginatedMessages(auth, filter))
      .then(function (result) {
        //console.log('Returned:', JSON.stringify(result));
        expect(result)
          .to.be.an('Object')
          .that.has.all.keys(apiKeys);
        expect(result.ErrorID).to.equal(0);
        if (result.Messages !== null) {
          for (let i = 0; i < result.Messages.length; i++) {
            let message = result.Messages[i];
            expect(message)
              .to.be.an('Object')
              .that.includes.all.keys('ID', 'MobileID', 'ReceiveUTC', 'MessageUTC', 'RegionName', 'SIN');
            // Modem Simulator does not seem to provide OTAMessageSize...
            if (mailboxIndex === 1) expect(message).to.include.key('OTAMessageSize');
            if (message.RawPayload) expect(message.RawPayload).to.be.an('Array');
            if (message.Payload) expect(message.Payload).to.have.all.keys('SIN', 'MIN', 'Name', 'Fields');
          }
        }
        expect(result.NextStartID).to.be.a('number');
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
    //TODO: auth failure, filter failure, mobile filter
  });
  
  describe('#getMobileIds()', function () {
    const apiKeys = ['ErrorID', 'Mobiles'];
    const mobileKeys = ['ID', 'Description', 'LastRegistrationUTC', 'RegionName'];
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
        expect(result.ErrorID).to.equal(0);
        if (result.Mobiles !== null) {
          for (let i = 0; i < result.Mobiles.length; i++) {
            expect(result.Mobiles[i])
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
    
    describe('#submitMobileTerminatedMessages()', function () {
      let userMessageId = 0;
      beforeEach(function() {
        userMessageId += 1;
      });
      const apiKeys = ['ErrorID', 'Submissions'];
      const submissionKeys = ['ErrorID', 'ForwardMessageID', 'UserMessageID', 
        'DestinationID', 'StateUTC', 'ScheduledSendUTC', 'TerminalWakeupPeriod',
        'OTAMessageSize'
      ];
      const description = `should return an array of Submissions with ${submissionKeys}`;
      it(description, function () {
        //const auth = mailboxes[mailboxIndex];
        const testMessage = {
          DestinationID: testMobileId,
          UserMessageID: userMessageId,
          //Payload: modemMessages.pingModemRequest.Payload,  // will not display in Modem Simulator but will solicit response
          RawPayload: [255, 255],   // will display in Modem Simulator "To-Mobile Messages" pane
        };
        for (let i=0; i < TEST_MESSAGE_SIZE -2; i++) {
          testMessage.RawPayload.push(i);
        }
        const messages = [testMessage];
        return Promise.resolve(idpApi.submitMobileTerminatedMessages(auth, messages))
        .then(function (result) {
          expect(result)
            .to.be.an('Object')
            .that.includes.all.keys(apiKeys);
          expect(result.ErrorID).to.equal(0);
          expect(result.Submissions)
            .to.be.an('Array')
            .that.has.lengthOf(1);
          var submission = result.Submissions[0];
          expect(submission)
            .to.be.an('Object')
            .that.includes.all.keys(submissionKeys);
          forwardIds.push(submission.ForwardMessageID);
          console.log(`Added ${submission.ForwardMessageID} to forwardIds ${JSON.stringify(forwardIds)}`);
          expect(submission.UserMessageID).to.equal(userMessageId);
          expect(submission.DestinationID).to.equal(testMobileId);
          if (submission.TerminalWakeupPeriod) {
            expect(submission).has.property('ScheduledSendUTC');
          }
        })
        .catch(err => {
          console.log(`Error: ${err.message}`);
          throw err;
        });
      })
    });
    
    describe('#getMobileTerminatedStatuses()', function () {
      //const auth = mailboxes[mailboxIndex];
      //Get the status of the submitted message
      const apiKeys = ['ErrorID', 'Statuses', 'More', 'NextStartUTC'];
      const statusKeys = ['ErrorID', 'ForwardMessageID', 'ReferenceNumber',
        'State', 'StateUTC', 'IsClosed'
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
        return Promise.resolve(idpApi.getMobileTerminatedStatuses(auth, filter))
        .then(function (result) {
          //console.log('getMobileTerminatedStatuses RESULT: ' + JSON.stringify(result, null, 2));
          expect(result)
            .to.be.an('Object')
            .that.includes.all.keys(apiKeys);
          if (result.ErrorID !== 0) {
            idpApi.getErrorName(result.ErrorID).then(errorName => {
              console.log('getMobileTerminatedStatuses ERROR: ' + errorName);
            });
          }
          expect(result.ErrorID).to.equal(0);
          expect(result.More).to.be.a('boolean');
          if (result.More) {
            expect(result.NextStartUTC).to.be.a('string');
          }
          expect(result.Statuses).to.be.an('Array');
          for (let i = 0; i < result.Statuses.length; i++) {
            let status = result.Statuses[i];
            expect(status)
              .to.be.an('Object')
              .that.includes.all.keys(statusKeys);
            expect(status.ErrorID).to.be.a('number');
            expect(status.State).to.be.a('number');
            expect(status.StateUTC).to.be.a('string');
          }
        })
        .catch(err => {
          console.log(`Error: ${err.message}`);
          throw err;
        });
      });
    });
    
    describe('#getMobileTerminatedMessages()', function() {
      const apiKeys = ['ErrorID', 'Messages'];
      const messageKeys = ['ID', 'DestinationID', 'CreateUTC', 'ErrorID',
        'IsClosed', 'State', 'StatusUTC', 'ReferenceNumber', 'Payload', 'RawPayload'
      ];
      it(`should return array of message(s) each with ${messageKeys}`, function () {
        if (forwardIds.length > 0) {
          return Promise.resolve(idpApi.getMobileTerminatedMessages(auth, forwardIds))
          .then(function (result) {
            //console.log('getMobileTerminatedMessages RESULT: ' + JSON.stringify(result, null, 2));
            expect(result)
              .to.be.an('Object')
              .that.includes.all.keys(apiKeys);
            expect(result.ErrorID).to.equal(0);
            expect(result.Messages).to.be.an('Array').that.has.lengthOf.greaterThan(0);
            for (let i = 0; i < result.Messages.length; i++) {
              let message = result.Messages[i];
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
  
    describe('#cancelMobileTerminatedMessages()', function() {
      const apiKeys = ['ErrorID', 'Submissions'];
      const submissionKeys = ['ErrorID', 'ForwardMessageID', 'UserMessageID', 
        'DestinationID', 'StateUTC', 'ScheduledSendUTC', 'TerminalWakeupPeriod',
        'OTAMessageSize'
      ];
      const description = `should return a list of submissions each with ${submissionKeys}`;
      //Retrieve the message that was submitted
      it(description, function () {
        if (forwardIds.length > 0) {
          let ids = forwardIds[forwardIds.length - 1];
          return Promise.resolve(idpApi.cancelMobileTerminatedMessages(auth, ids))
          .then(function (result) {
            //console.log('cancelMobileTerminatedMessages RESULT: ' + JSON.stringify(result, null, 2));
            expect(result)
              .to.be.an('Object')
              .that.includes.all.keys(apiKeys);
            expect(result.ErrorID).to.equal(0);
            expect(result.Submissions).to.be.an('Array').that.has.lengthOf.greaterThan(0);
            for (let i = 0; i < result.Submissions.length; i++) {
              let submission = result.Submissions[i];
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
  describe('#getMtStateDef()', function() {
    let state = 0;
    let stateDef = idpApi.getMtStateDef(state);
    it('should return SUBMITTED', function() {
      expect(stateDef).to.equal('SUBMITTED');
    })
  })
  
});
