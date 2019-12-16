'use strict';

const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib');
const mailboxes = require('../config/mailboxes').credentials;
const testTerminals = require('../config/mailboxes').testTerminals;
const modemMessages = require('./modem-messages');

// Set to 0 for simulator or 1 for live gateway
const mailboxIndex = (idpApi.apiUrl.includes('api.inmarsat.com')) ? 1 : 0;
const testMobileId = testTerminals[mailboxIndex].mobileId;
const auth = mailboxes[mailboxIndex];

const RETRIEVAL_OFFSET = 24;
let mobileTerminatedMessageIds = [];

describe('#getIdpVersion()', function () {
  it('should return a version string', function () {
    idpApi.getIdpVersion().then(function (result) {
      expect(result).to.be.a('string');
      //TODO: additional criteria on format X.Y.Z.a
    })
  })
});

describe('#getIdpTime()', function () {
  it('should return UTC time', function () {
    idpApi.getIdpTime().then(function (result) {
      expect(result)
        .to.be.a('string')
        .that.has.lengthOf(19);
    })
  })
});

describe('#getErrorDefinitions()', function () {
  const testDesc = 'should return a non-empty Array of error code objects'
                    + ' with properties ID, Name, Description';
  it(testDesc, function () {
    idpApi.getErrorDefinitions().then(function (result) {
      expect(result)
        .to.be.an('Array')
        .that.has.lengthOf.above(1);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).to.have.all.keys('ID', 'Name', 'Description');
      }
    })
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
      it('should return ' + testCases[key], function () {
        idpApi.getErrorName(key)
          .then(function (result) {
            expect(result).to.equal(testCases[key]);
          })
          .catch(err => {
            console.log(err);
          });
      })
    }
  })
});

describe('#getMobileOriginatedMessages()', function () {
  //const auth = mailboxes[mailboxIndex];
  const date = new Date();
  date.setUTCHours(date.getUTCHours() - RETRIEVAL_OFFSET);
  const filter = {
    startTimeUtc: idpApi.dateToIdpTime(date),
  };
  const description = 'should include properties ErrorID, Messages, More, NextStartUTC, NextStartID'
      + '\n\t where Messages include keys ID, MobileID, ReceiveUTC, MessageUTC, RegionName, SIN'
      + '\n\t and if a message includes Payload it has keys SIN, MIN, Name, Fields'
      + '\n\t and if a message includes RawPayload it is an array';
  it(description, function () {
    idpApi.getMobileOriginatedMessages(auth, filter)
      .then(function (result) {
        expect(result)
          .to.be.an('Object')
          .that.has.all.keys('ErrorID', 'Messages', 'More', 'NextStartUTC', 'NextStartID');
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
        console.log(err);
      }
      );
  })
  //TODO: auth failure, filter failure, mobile filter
});

describe('#getMobileIds()', function () {
  it('should return a list of Mobile information', function () {
    //const auth = mailboxes[mailboxIndex];
    const filter = {};
    idpApi.getMobileIds(auth, filter)
      .then(function (result) {
        expect(result)
          .to.be.an('Object')
          .that.includes.all.keys('ErrorID', 'Mobiles');
        expect(result.ErrorID).to.equal(0);
        if (result.Mobiles !== null) {
          for (let i = 0; i < result.Mobiles.length; i++) {
            expect(result.Mobiles[i])
              .to.be.an('Object')
              .that.includes.all.keys('ID', 'Description', 'LastRegistrationUTC', 'RegionName');
          }
        }
      })
      .catch(err => {
        console.log(err);
      });
  })
  //TODO: exercise error cases bad auth, filter out of range, mobile filter
});

describe('#submitMobileTerminatedMessages()', function () {
  let userMessageId = 0;
  beforeEach(function() {
    userMessageId += 1;
  });
  const description = 'should return an Object with properties ErrorID, Messages, More, NextStartUTC, NextStartID';
  it(description, function () {
    //const auth = mailboxes[mailboxIndex];
    const testMessage = {
      DestinationID: testMobileId,
      UserMessageID: userMessageId,
      //Payload: modemMessages.pingModemRequest.Payload,  // will not display in Modem Simulator but will solicit response
      RawPayload: [255, 255],   // will display in Modem Simulator "To-Mobile Messages" pane
    };
    const messages = [testMessage];
    idpApi.submitMobileTerminatedMessages(auth, messages)
      .then(function (result) {
        expect(result)
          .to.be.an('Object')
          .that.includes.all.keys('ErrorID', 'Submissions');
        expect(result.ErrorID).to.equal(0);
        expect(result.Submissions)
          .to.be.an('Array')
          .that.has.lengthOf(1);
        var submission = result.Submissions[0];
        expect(submission)
          .to.be.an('Object')
          .that.includes.all.keys('ErrorID', 'ForwardMessageID', 'UserMessageID', 'DestinationID',
                                  'StateUTC', 'ScheduledSendUTC', 'TerminalWakeupPeriod',
                                  'OTAMessageSize');
        mobileTerminatedMessageIds.push(submission.ForwardMessageID);
        expect(submission.UserMessageID).to.equal(userMessageId);
        expect(submission.DestinationID).to.equal(testMobileId);
        if (submission.TerminalWakeupPeriod) {
          expect(submission).has.property('ScheduledSendUTC');
        }
      })
      .catch(err => {
        console.log(err);
      });
  })
});

describe('#getMobileTerminatedStatuses()', function () {
  //const auth = mailboxes[mailboxIndex];
  //Get the status of the submitted message
  var description1 = 'should return an Object with properties'
                      + ' ErrorID, Statuses, More, NextStartUTC'
                      + '\n\t where each Status has properties'
                      + ' ErrorID, ForwardMessageID, ReferenceNumber, State,'
                      + ' StateUTC, IsClosed';
  it(description1, function () {
    let filter = {};
    if (mobileTerminatedMessageIds.length > 0) {
      filter.ids = mobileTerminatedMessageIds;
    } else {
      const date = new Date();
      date.setUTCHours(date.getUTCHours() - RETRIEVAL_OFFSET);
      filter.startTimeUtc = idpApi.dateToIdpTime(date)
    }
    idpApi.getMobileTerminatedStatuses(auth, filter)
      .then(function (result) {
        //console.log('getMobileTerminatedStatuses RESULT: ' + JSON.stringify(result, null, 2));
        expect(result)
          .to.be.an('Object')
          .that.includes.all.keys('ErrorID', 'Statuses', 'More', 'NextStartUTC');
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
            .that.includes.all.keys('ErrorID', 'ForwardMessageID', 
                'ReferenceNumber', 'State', 'StateUTC', 'IsClosed');
          expect(status.ErrorID).to.be.a('number');
          expect(status.State).to.be.a('number');
          expect(status.StateUTC).to.be.a('string');
          mobileTerminatedMessageIds.push(status.ForwardMessageID);
        }
      })
      .catch(err => {
        console.log(err);
      });
  });
});

describe('#getMobileTerminatedMessages()', function() {
  let ids;
  if (mobileTerminatedMessageIds.length > 0) {
    ids = mobileTerminatedMessageIds[mobileTerminatedMessageIds.length - 1];
  }
  //Retrieve the message that was submitted
  it('should return a valid Mobile-Terminated message previously submitted', function () {
    idpApi.getMobileTerminatedMessages(auth, ids)
      .then(function (result) {
        //console.log('getMobileTerminatedMessages RESULT: ' + JSON.stringify(result, null, 2));
        expect(result)
          .to.be.an('Object')
          .that.includes.all.keys('ErrorID', 'Messages');
        expect(result.ErrorID).to.equal(0);
        expect(result.Messages).to.be.an('Array').that.has.lengthOf.greaterThan(0);
        for (let i = 0; i < result.Messages.length; i++) {
          let message = result.Messages[i];
          expect(message)
            .to.be.an('Object')
            .that.includes.all.keys('ID', 'DestinationID', 'StatusUTC', 'CreateUTC',
                                    'IsClosed', 'State', 'ErrorID', 'ReferenceNumber',
                                    'Payload', 'RawPayload');
        }
      })
      .catch(err => {
        console.log(err);
      });
  });
});

describe('#cancelMobileTerminatedMessages()', function() {
  let ids;
  if (mobileTerminatedMessageIds.length > 0) {
    ids = mobileTerminatedMessageIds[mobileTerminatedMessageIds.length - 1];
  }
  //Retrieve the message that was submitted
  it('should return a valid Mobile-Terminated message previously submitted', function () {
    idpApi.cancelMobileTerminatedMessages(auth, ids)
      .then(function (result) {
        //console.log('cancelMobileTerminatedMessages RESULT: ' + JSON.stringify(result, null, 2));
        expect(result)
          .to.be.an('Object')
          .that.includes.all.keys('ErrorID', 'Submissions');
        expect(result.ErrorID).to.equal(0);
        expect(result.Submissions).to.be.an('Array').that.has.lengthOf.greaterThan(0);
        for (let i = 0; i < result.Submissions.length; i++) {
          let submission = result.Submissions[i];
          expect(submission)
            .to.be.an('Object')
            .that.includes.all.keys('ErrorID', 'ForwardMessageID', 'UserMessageID', 
                                    'DestinationID','StateUTC', 
                                    'ScheduledSendUTC', 'TerminalWakeupPeriod',
                                    'OTAMessageSize');
        }
      })
      .catch(err => {
        console.log(err);
      });
  });
});
