'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');
const mailboxes = require('./mailboxes-local').credentials;

const mailboxIndex = 2
const auth = mailboxes[mailboxIndex];
const badAuth = { accessId: 'bad', password: 'bad' };

const RETRIEVAL_OFFSET = 24;

describe('#getReturnMessages()', function () {
  /* Native API responses
  const apiKeys = ['ErrorID', 'Messages', 'More', 'NextStartUTC', 'NextStartID'];
  const messageKeys = ['ID', 'MobileID', 'ReceiveUTC', 'MessageUTC', 'RegionName', 'SIN'];
  const payloadKeys = ['SIN', 'MIN', 'Name', 'Fields'];
  */
  const apiKeys = ['errorId', 'messages', 'more', 'nextStartTimeUtc', 'nextStartId'];
  const messageKeys = ['messageId', 'mobileId', 'receiveTimeUtc', 'mailboxTimeUtc', 'satelliteRegion', 'codecServiceId', 'size'];
  const payloadKeys = ['codecServiceId', 'codecMessageId', 'name', 'fields'];
  const fieldKeys = ['name', 'dataType', 'stringValue'];
  const arrayFieldKeys = ['name', 'dataType', 'arrayElements'];
  const arrayKeys = ['index', 'fields'];
  //: Set high water mark reference N hours ago
  const date = new Date();
  date.setUTCHours(date.getUTCHours() - RETRIEVAL_OFFSET);
  const filter = {
    startTimeUtc: date,
  };

  let description = `should include properties ${apiKeys}`;
  
  describe('with invalid authentication', function() {
    const authErrCode = 21785;
    it(description + ` and have errorId ${authErrCode}`, function() {
      return Promise.resolve(idpApi.getReturnMessages(badAuth, filter))
      .then(result => {
        expect(result).to.be.an('Object').that.has.all.keys(apiKeys);
        expect(result.errorId).to.equal(authErrCode);
      })
    });
  });

  describe('with valid authentication', async function() {
    description = `should include properties ${apiKeys}`
    + `\n\t where messages include properties ${messageKeys}`
    + `\n\t and if a message includes payloadJaon it has keys ${payloadKeys}`
    + '\n\t and if a message includes payloadRaw it is an array';
    it(description, function () {
      return Promise.resolve(idpApi.getReturnMessages(auth, filter))
      .then(function (result) {
        expect(result).to.be.an('Object').that.has.all.keys(apiKeys);
        expect(result.errorId).to.equal(0);
        if (result.messages !== null) {
          console.log(`Retreived ${result.messages.length} messages like: `
              + `${JSON.stringify(result.messages[0], null, 2)}`);
          result.messages.forEach(message => {
            expect(message).to.be.an('Object').that.includes.all.keys(messageKeys);
            if (message.payloadRaw) {
              expect(message.payloadRaw).to.be.an('Array');
              message.payloadRaw.forEach(dataByte => {
                expect(dataByte).to.be.a('number')
                  .above(-1).and.below(256);
              });
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
          });
          expect(result.nextStartTimeUtc).to.be.a('string').not.equal('');
          if(result.more) {
            expect(result.nextStartId).to.be.a('number').above(-1);
          } else {
            expect(result.nextStartId).to.be.a('number').equal(-1);
          }
        } else {
          console.log(`No retrieved messages: ${JSON.stringify(result)}`);
          expect(result.nextStartId).to.equal(-1);
        }
      })
      .catch(err => {
        console.log(`Error: ${err.message}`);
        throw err;
      });
    })
  });
});
