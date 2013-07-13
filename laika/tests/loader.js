Npm = {require: require};
Meteor = {};

module.exports = function loader(module) {
  require('../../' + module);
};