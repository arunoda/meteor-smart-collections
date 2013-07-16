//validator which used to helps .allow() and .deny() on the ServerSide collections

function Validator(defaultResult) {
  this._allowList = [];
  this._denyList = [];
  this._defaultResult = defaultResult === true;
}

Validator.prototype.setDefaultResult = function(value) {
  this._defaultResult = value;
};

Validator.prototype.register = function add(type, func) {
  if(type == 'allow') {
    this._allowList.push(func);
  } else if(type == 'deny') {
    this._denyList.push(func);
  }
};

Validator.prototype.evaluate = function() {
  
  var defautReturn = (this._allowList.length == 0 && this._denyList.length == 0)? this._defaultResult: false;
  //evaluate denyList
  for(var lc=0; lc<this._denyList.length; lc++) {
    var result = this._denyList[lc].apply(null, arguments);
    if(result) {
      return false;
    }
  }

  //evaluate allowList
  for(var lc=0; lc<this._allowList.length; lc++) {
    var result = this._allowList[lc].apply(null, arguments);
    if(result) {
      return true;
    }
  }

  return defautReturn;
};

Meteor.SmartValidator = Validator;