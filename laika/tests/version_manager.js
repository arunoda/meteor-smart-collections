var assert = require('assert');
global._ = require('../../node_modules/underscore');
require('./loader')('lib/version_manager.js');

suite('Version Manager', function() {
  test('single version', function() {
    var vm = new Meteor.SmartVersionManager();
    var id1 = 'id-1';
    var version = vm.begin(id1, {a: 1, b: 1});
    var versionedResult = vm.commit(id1, version, {a: 100, b: 300});
    assert.deepEqual(versionedResult, {a: 100, b: 300});

    assert.equal(vm._idHandlers[id1], undefined);
    assert.equal(vm._versionDefaults[version], undefined);
  });

  test('single version with 2 deleted fields', function() {
    var vm = new Meteor.SmartVersionManager();
    var id1 = 'id-1';
    var version = vm.begin(id1, {a: 1, b: 1, c: 1});
    var versionedResult = vm.commit(id1, version, {b: 300});
    assert.deepEqual(versionedResult, {a: null, b: 300, c: null});

    assert.equal(vm._idHandlers[id1], undefined);
    assert.equal(vm._versionDefaults[version], undefined);
  });

  test('two version sequentially', function() {
    var vm = new Meteor.SmartVersionManager();
    var id = 'id-1';

    var version1 = vm.begin(id, {a: 1, b: 1});
    var version2 = vm.begin(id, {b: 1, c: 1});

    var versionedResult = vm.commit(id, version1, {a: 100, b: 300});
    assert.deepEqual(versionedResult, {a: 100, b: 300});

    var versionedResult2 = vm.commit(id, version2, {b: 500, c: 400});
    assert.deepEqual(versionedResult2, {b: 500, c: 400});

    assert.equal(vm._idHandlers[id], undefined);
    assert.equal(vm._versionDefaults[version1], undefined);
    assert.equal(vm._versionDefaults[version2], undefined);
  });

  test('two version but 2 comes before 1', function() {
    var vm = new Meteor.SmartVersionManager();
    var id = 'id'

    var version1 = vm.begin(id, {a: 1, b: 1});
    var version2 = vm.begin(id, {b: 1, c: 1});

    var versionedResult2 = vm.commit(id, version2, {b: 500, c: 400});
    assert.deepEqual(versionedResult2, {b: 500, c: 400});

    var versionedResult = vm.commit(id, version1, {a: 100, b: 300});
    assert.deepEqual(versionedResult, {a: 100});

    assert.equal(vm._idHandlers[id], undefined);
    assert.equal(vm._versionDefaults[version1], undefined);
    assert.equal(vm._versionDefaults[version2], undefined);
  }); 

  test('three version but 2 comes before 1', function() {
    var vm = new Meteor.SmartVersionManager();
    var id = 'id'

    var version1 = vm.begin(id, {a: 1, b: 1});
    var version2 = vm.begin(id, {b: 1, c: 1});
    var version3 = vm.begin(id, {b: 1, c: 1, d:1});

    var versionedResult2 = vm.commit(id, version2, {b: 500, c: 400});
    assert.deepEqual(versionedResult2, {b: 500, c: 400});

    var versionedResult1 = vm.commit(id, version1, {a: 100, b: 300});
    assert.deepEqual(versionedResult1, {a: 100});

    var versionedResult3 = vm.commit(id, version3, {b: 6, c: 7, d: 9});
    assert.deepEqual(versionedResult3, {b: 6, c: 7, d: 9});

    assert.equal(vm._idHandlers[id], undefined);
    assert.equal(vm._versionDefaults[version1], undefined);
    assert.equal(vm._versionDefaults[version2], undefined);
    assert.equal(vm._versionDefaults[version3], undefined);
  });  

  test('three version but 3 comes before 1', function() {
    var vm = new Meteor.SmartVersionManager();
    var id = 'id'

    var version1 = vm.begin(id, {a: 1, b: 1});
    var version2 = vm.begin(id, {b: 1, c: 1});
    var version3 = vm.begin(id, {b: 1, c: 1, d:1});

    var versionedResult3 = vm.commit(id, version3, {b: 6, c: 7, d: 9});
    assert.deepEqual(versionedResult3, {b: 6, c: 7, d: 9});

    var versionedResult1 = vm.commit(id, version1, {a: 100, b: 300});
    assert.deepEqual(versionedResult1, {a: 100});

    var versionedResult2 = vm.commit(id, version2, {b: 500, c: 400});
    assert.deepEqual(versionedResult2, {});

    assert.equal(vm._idHandlers[id], undefined);
    assert.equal(vm._versionDefaults[version1], undefined);
    assert.equal(vm._versionDefaults[version2], undefined);
    assert.equal(vm._versionDefaults[version3], undefined);
  }); 

  test('abort version', function() {
    var vm = new Meteor.SmartVersionManager();
    var id1 = 'id-1';
    var version = vm.begin(id1, {a: 1, b: 1});
    vm.abort(id1, version);

    assert.equal(vm._idHandlers[id1], undefined);
    assert.equal(vm._versionDefaults[id1], undefined);
  }); 

  test('abort version and a following commit', function() {
    var vm = new Meteor.SmartVersionManager();
    var id1 = 'id-1';
    var version = vm.begin(id1, {a: 1, b: 1});
    vm.abort(id1, version);

    assert.throws(function() {
      var versionedResult = vm.commit(id1, version, {a: 100, b: 300});
    });

    assert.equal(vm._idHandlers[id1], undefined);
    assert.equal(vm._versionDefaults[id1], undefined);
  });

  test('single version - multiple ids', function() {
    var vm = new Meteor.SmartVersionManager();
    var version = vm.begin(null, {a: 1, b: 1});
    var versionedResult1 = vm.commit('id1', version, {a: 100, b: 300}, true);
    assert.deepEqual(versionedResult1, {a: 100, b: 300});

    var versionedResult2 = vm.commit('id2', version, {a: 100, b: 300}, true);
    assert.deepEqual(versionedResult2, {a: 100, b: 300});

    vm.cleanVersion(version);

    assert.equal(vm._idHandlers['id1'], undefined);
    assert.equal(vm._idHandlers['id2'], undefined);
    assert.equal(vm._versionDefaults[version], undefined);
  });

  test('single version - multiple ids - later version comes before this', function() {
    var vm = new Meteor.SmartVersionManager();
    var version = vm.begin(null, {a: 1, b: 1});
    var version2 = vm.begin('id1', {a: 1, c: 1});

    var versioned2Result = vm.commit('id1', version2, {a: 200, c: 500})
    assert.deepEqual(versioned2Result, {a: 200, c: 500})

    var versionedResult1 = vm.commit('id1', version, {a: 100, b: 300}, true);
    assert.deepEqual(versionedResult1, {b: 300});

    var versionedResult2 = vm.commit('id2', version, {a: 100, b: 300}, true);
    assert.deepEqual(versionedResult2, {a: 100, b: 300});

    vm.cleanVersion(version);

    assert.equal(vm._idHandlers['id1'], undefined);
    assert.equal(vm._idHandlers['id2'], undefined);
    assert.equal(vm._versionDefaults[version], undefined);
    assert.equal(vm._versionDefaults[version2], undefined);
  });
});