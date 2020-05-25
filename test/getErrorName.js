'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');

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
