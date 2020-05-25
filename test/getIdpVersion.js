'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');

describe('#getIdpVersion()', function () {
  it('should return a version string', function () {
    return Promise.resolve(idpApi.getIdpVersion())
    .then(result => {
      console.log('Returned:', JSON.stringify(result));
      expect(result).to.be.a('string');
      let parts = result.split('.');
      expect(parts).to.have.length(4);
      //TODO: additional criteria on format 'Major.minor.patch.build'
    })
    .catch(err => {
      console.log(`Error: ${err.message}`);
      throw err;
    });
  })
});
