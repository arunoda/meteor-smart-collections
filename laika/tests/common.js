doAutoPublish = function() {
  if(Meteor.default_server && Meteor.default_server.autopublish) {
    Meteor.default_server.autopublish();
  } else {
    Package = {autopublish: true};
  }
  emit('return');
}