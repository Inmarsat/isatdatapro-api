'use strict';

const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../index');
const mailboxes = require('../config/mailboxes').credentials;
const testTerminals = require('../config/mailboxes').testTerminals;
const modemMessages = require('./modem-messages');

// Set to 0 for simulator or 1 for live gateway
var mailboxIndex = 0;
if (idpApi.apiUrl.includes('api.inmarsat.com')) {
    mailboxIndex = 1;
}
var testMobileId = testTerminals[mailboxIndex].mobileId;

var mobileTerminatedMessageIds = [];

describe('#getMgsVersion()', function() {
    it('should return a version string', function() {
        idpApi.getMgsVersion().then(function(result) {
            expect(result).to.be.a('string');
            //TODO: additional criteria on format X.Y.Z.a
        })
    })
});

describe('#getUtcTime()', function() {
    it('should return UTC time', function() {
        idpApi.getUtcTime().then(function(result) {
            expect(result)
                .to.be.a('string')
                .that.has.lengthOf(19);
        })
    })
});

describe('#getErrorDefinitions()', function() {
    var testDesc = 'should return a non-empty Array of error code objects ' +
                    'with properties ID, Name, Description';
    it(testDesc, function() {
        idpApi.getErrorDefinitions().then(function(result) {
            expect(result)
                .to.be.an('Array')
                .that.has.lengthOf.above(1);
            for (var i=0; i < result.length; i++) {
                expect(result[i]).to.have.all.keys('ID', 'Name', 'Description');
            }
        })
    })
});

describe('#getErrorName()', function() {
    var testCases = {
        0: 'NO_ERRORS',
        1000: 'UNDEFINED',
    };
    context('with number', function() {
        for (var key in testCases) {
            if (!testCases.hasOwnProperty(key)) continue;
            it('should return ' + testCases[key], function() {
                idpApi.getErrorName(key)
                    .then(function(result) {
                        expect(result).to.equal(testCases[key]);
                    })
                    .catch(err => {
                        console.log(err);
                    });
            })
        }
    })
});

describe('#getMobileOriginatedMessages()', function() {
    const RETRIEVAL_OFFSET = 24;   // hours ago
    var description = 'should include properties ErrorID, Messages, More, NextStartUTC, NextStartID'
                        + '\n where Messages include keys ID, MobileID, ReceiveUTC, MessageUTC, RegionName, SIN'
                        + '\n and if a message includes Payload it has keys SIN, MIN, Name, Fields'
                        + '\n and if a message includes RawPayload it is an array';
    it(description, function() {
        var auth = mailboxes[mailboxIndex];
        var d = new Date();
        d.setUTCHours(d.getUTCHours() - RETRIEVAL_OFFSET);
        var highWaterMark = d.toISOString().split('.')[0].replace('T',' ');
        idpApi.getMobileOriginatedMessages(auth, highWaterMark)
            .then(function(result) {
                expect(result)
                    .to.be.an('Object')
                    .that.has.all.keys('ErrorID', 'Messages', 'More', 'NextStartUTC', 'NextStartID');
                expect(result.ErrorID).to.equal(0);
                if (result.Messages !== null) {
                    for (var i=0; i< result.Messages.length; i++) {
                        var message = result.Messages[i];
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

describe('#getMobileIds()', function() {
    it('should return a list of Mobile information', function() {
        var auth = mailboxes[mailboxIndex];
        var filter = {};
        idpApi.getMobileIds(auth, filter)
            .then(function(result) {
                expect(result)
                    .to.be.an('Object')
                    .that.includes.all.keys('ErrorID', 'Mobiles');
                expect(result.ErrorID).to.equal(0);
                if (result.Mobiles !== null) {
                    for (var i=0; i < result.Mobiles.length; i++) {
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

describe('#submitMobileTerminatedMessages()', function() {
    var description = 'should return an Object with properties ErrorID, Messages, More, NextStartUTC, NextStartID';
    it(description, function() {
        var auth = mailboxes[mailboxIndex];
        var userMessageId = 1;
        var testMessage = {
            DestinationID: testMobileId,
            UserMessageID: userMessageId,
            //Payload: modemMessages.pingModemRequest.Payload,  // will not display in Modem Simulator but will solicit response
            RawPayload: [255, 255],   // will display in Modem Simulator "To-Mobile Messages" pane
        };
        var messages = [testMessage];
        idpApi.submitMobileTerminatedMessages(auth, messages)
            .then(function(result) {
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

describe.only('#getMobileTerminatedStatuses(), #getMobileTerminatedMessages()', function() {
    
    var auth = mailboxes[mailboxIndex];
    var userMessageId = 0;
    //var mobileTerminatedMessageIds = [];
    
    before(async function() {
        var testMessage = {
            DestinationID: testMobileId,
            UserMessageID: userMessageId + 1,
            Payload: modemMessages.pingModemRequest.Payload,
            // RawPayload: [255, 255],   // will display in Modem Simulator "To-Mobile Messages" pane
        };
        var messages = [testMessage];
        var result = await idpApi.submitMobileTerminatedMessages(auth, messages);
        if (result.ErrorID === 0) {
            mobileTerminatedMessageIds.push(result.Submissions[0].ForwardMessageID)
        }
    });

    var description1 = 'should return an Object with properties ErrorID, Statuses, More, NextStartUTC' + 
                    ' where the status corresponds to the filter request';
    it(description1, function() {
        idpApi.getMobileTerminatedStatuses(auth, mobileTerminatedMessageIds)
            .then(function(result) {
                expect(result)
                    .to.be.an('Object')
                    .that.includes.all.keys('ErrorID', 'Statuses', 'More', 'NextStartUTC');
                expect(result.ErrorID).to.equal(0);
                expect(result.More).to.be.a('boolean');
                if (result.More) {
                    expect(result.NextStartUTC).to.be.a('string');
                } else {
                    expect(result.NextStartUTC).to.be.null;
                }
                expect(result.Statuses).to.be.an('Array');
                for (var i=0; i < result.Statuses.length; i++) {
                    var status = result.Statuses[i];
                    expect(status)
                        .to.be.an('Object')
                        .that.includes.all.keys('ErrorID', 'ForwardMessageID', 'ReferenceNumber', 'State', 'StateUTC', 'IsClosed');
                    expect(status.ErrorID).to.be.a('number');
                    //expect(status.ForwardMessageID).to.equal(mobileTerminatedMessageIds[i]);
                    expect(mobileTerminatedMessageIds).to.contain.members([status.ForwardMessageID]);
                    expect(status.State).to.be.a('number');
                    expect(status.StateUTC).to.be.a('string');
                }
            })
            .catch(err => {
                console.log(err);
            });
    });

    it('should return a valid Mobile-Terminated message previously submitted', function() {
        idpApi.getMobileTerminatedMessages(auth, mobileTerminatedMessageIds)
            .then(function(result) {
                //console.log('getMobileTerminatedMessages RESULT: ' + JSON.stringify(result, null, 2));
                expect(result)
                    .to.be.an('Object')
                    .that.includes.all.keys('ErrorID', 'Messages');
                expect(result.ErrorID).to.equal(0);
                expect(result.Messages).to.be.an('Array').that.has.lengthOf.greaterThan(0);
                for (let i=0; i < result.Messages.length; i++) {
                    var message = result.Messages[i];
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

