if(typeof(Meteor) == 'undefined') {
  Npm = {require: require};
  Meteor = {};
  require('../../../lib/invalidator.js');
}