'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');

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
