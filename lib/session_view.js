/*
  This is a dummy sessionView implement which only holds ids.
  So any added could send the data again to the client
  Later on we can couple this our smartCache system for better results 

  ===
  This is not used, since we need more logic to handle what need to be send to the client
  For now, existing Meteor method used for the stability
*/

function SessionView(meteorSession, collectionName) {
  this._idMap = {};
  this._session = meteorSession;
  this._collectionName = collectionName;
}

SessionView.prototype.added = function(id, doc) {
  if(this._idMap[id]) {
    this._session.sendChanged(this._collectionName, id, doc);
  } else {
    this._idMap[id] = true;
    this._session.sendAdded(this._collectionName, id, doc);
  }
};

SessionView.prototype.changed = function(id, fields) {
  if(this._idMap[id]) {
    this._session.sendChanged(this._collectionName, id, fields);
  } else {
    this._idMap[id] = true;
    this._session.sendAdded(this._collectionName, id, fields);
  }
};

SessionView.prototype.removed = function(id) {
  if(this._idMap[id]) {
    this._session.sendRemoved(this._collectionName, id);
    this._idMap[id] = null;
  }
};

Meteor.SmartSessionView = SessionView;