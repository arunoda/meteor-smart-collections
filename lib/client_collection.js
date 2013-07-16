function SmartCollection(name) {
  var self = this;
  this.name = name;
  this._meteorCollection = new Meteor.Collection(name);

  //wrap methods from the _meteorCollection
  ['find', 'findOne', 'allow', 'deny'].forEach(function(field) {
    self[field] = function() {
      return self._meteorCollection[field].apply(self._meteorCollection, arguments);
    };
  });
}

SmartCollection.prototype.insert = function(doc, callback) {
  //_si_ == smart insert :P
  Meteor.call('_si_', this.name, doc, callback);
};

Meteor.SmartCollection = SmartCollection;