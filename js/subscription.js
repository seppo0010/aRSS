window.Subscription = Backbone.Model.extend({
	attributes: {
		"items": null
	},
	initialize: function () {
		"use strict";
		var items = new ItemList();
		items.section = this.get('subscription_id');
		this.set({items: items});
	}
});

window.SubscriptionList = Backbone.Collection.extend({
	model: Subscription
});

