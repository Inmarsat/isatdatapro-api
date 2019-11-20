'use strict';

const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../index');
const mailboxes = require('../config/mailboxes');

describe('#getMgsVersion', function() {
    it('should return a version', function() {
        idpApi.getMgsVersion().then(function(result) {
            expect(result).to.be.a('string');
            //TODO: additional criteria on format X.Y.Z
        })
    })
});

describe('#getUtcTime', function() {
    it('should return UTC time', function() {
        idpApi.getUtcTime().then(function(result) {
            expect(result).to.be.a('string');
            expect(result).to.have.lengthOf(19);
        })
    })
});

describe('#getErrorDefinitions', function() {
    var caseDesc = 'should return a non-empty Array of error code objects ' +
                    'with properties ID, Name, Description';
    it(caseDesc, function() {
        idpApi.getErrorDefinitions().then(function(result) {
            expect(result).to.be.a('Array');
            expect(result).to.have.lengthOf.above(1);
            // TODO: probably more comprehensive to check each entry
            expect(result[0]).to.have.property('ID');
            expect(result[0]).to.have.property('Name');
            expect(result[0]).to.have.property('Description');

        })
    })
});

describe('#getErrorName', function() {
    var errorCase1 = 'NO_ERRORS';
    it('(0) should return ' + errorCase1, function() {
        idpApi.getErrorName(0).then(function(result) {
            expect(result).to.equal('NO_ERRORS')
        })
    })
    //TODO additional error cases including UNDEFINED
});

describe('#getMobileOriginated', function() {
    const RETRIEVAL_OFFSET = 24;   // hours ago
    var baseCase = 'should return an Object with properties ErrorID, Messages, More, NextStartUTC, NextStartID';
    it(baseCase, function() {
        var auth = mailboxes[0];
        var d = new Date();
        d.setUTCHours(d.getUTCHours() - RETRIEVAL_OFFSET);
        var highWaterMark = d.toISOString().split('.')[0].replace('T',' ');
        idpApi.getMobileOriginated(auth, highWaterMark).then(function(result) {
            expect(result).to.be.a('Object');
            expect(result).to.have.property('ErrorID');
            expect(result.ErrorID).to.equal(0);
            expect(result).to.have.property('Messages');
            expect(result).to.have.property('More');
            expect(result.More).to.be.a('boolean');
            expect(result).to.have.property('NextStartUTC');
            expect(result.NextStartUTC).to.be.a('string');
            expect(result).to.have.property('NextStartID');
            expect(result.NextStartID).to.be.a('number');
        })
    })
});
