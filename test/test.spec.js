var chai = require('chai');
var expect = chai.expect;

describe('Parsers', function () {
  it('Should Get The Aura Name', function () {
    var fileName = 'src/aura/Care_Team/Care_TeamController.js'
    var auraName = getAuraNameFromFileName(fileName);
    function getAuraNameFromFileName(fileName) {
      'use strict';
      var parts = fileName.split('src/aura/');
      var auraNameParts = (parts && parts.length) > 1 ? parts[1].split('/') : undefined;
      var auraName = (auraNameParts && auraNameParts.length) > 0 ? auraNameParts[0] : undefined;
      return auraName;
    }

    expect(auraName).to.not.eql(undefined)
    expect(auraName).to.eql('Care_Team');
  })
})
