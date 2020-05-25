'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');

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
