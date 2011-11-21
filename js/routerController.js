$(function () {
	var Workspace = Backbone.Router.extend({
		  routes: {
			"subscription/:subscription": "subscription",
		},
		"subscription": function (id) {
			CurrentUser.getInstance().set({active_subscription: id});
		}
	});
	new Workspace();
	Backbone.history.start();
});

