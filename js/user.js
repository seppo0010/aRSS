window.User = Backbone.Model.extend({
	attributes: {
		"username": null,
		"user_id": 0
	}
});

window.ViewItemsAll = 1;
window.ViewItemsUnread = 2;
window.CurrentUser = User.extend({
	attributes: {
		"unread_number": 0,
		"subscriptions": [],
		"subscriptions_index": {},
		"items": {},
		"active_subscription": "allitems",
		"view_items": window.ViewItemsUnread
	},
	"signParams": function (params) {
		"use strict";
		if (!params) {
			params = {};
		}
		params.user_id = this.get('user_id');
		params.token = "true";
		return params;
	},
	"initialize": function () {
		"use strict";
		this.set({ "view_items": window.ViewItemsUnread });
		this.bind('change:user_id', this.didLogin, this);
	},
	"logout": function () {
		"use strict";
		window.name = null;
		this.set({user_id: 0, username: null});
	},
	"fetchItems": function () {
		"use strict";
		var section = 'allitems';
		if (!this.get('items')) {
			this.set({items: {}});
		}
		var items = this.get('items')[section];

		if (!items) {
			items = new ItemList();
			items.section = section;
			this.get('items')[section] = items;
		}
		items.fetchList();
	},
	"fetchSubscriptions": function () {
		"use strict";
		var user = this;
		$.ajax('/subscription/list', {
			'data': this.signParams(),
			'success': function (data, textStatus, jqXHR) {
				try {
					var s, json = $.parseJSON(data);
					var user = CurrentUser.getInstance();
					var subscriptions_index = {};
					$.each(json, function (i, s) {
						subscriptions_index[s.subscription_id] = i;
					});
					user.set({subscriptions_index: subscriptions_index}); // Using two steps, since updating subscriptions will redraw and needs the index set
					user.set({subscriptions : new SubscriptionList(json) });
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message);
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			}
		});
	},
	isLoggedIn: false,
	"didLogin": function () {
		"use strict";
		if (this.get('user_id')) {
			if (!this.isLoggedIn) {
				window.name = '{"username":"' + encodeURIComponent(this.get('username')) + '","user_id":' +  this.get('user_id')  + '}';
				this.set({active_subscription: 'allitems' });
				this.fetchSubscriptions();
				this.fetchItems(this.get('active_subscription'));
			}
		} else {
			if (this.isLoggedIn) {
				this.logout();
			}
		}
	},
	"subscribe": function (url, callback) {
		"use strict";
		$.ajax('/subscription/subscribe', {
			'type': 'post',
			'data': this.signParams({subscription_url: $('#new_subscription_url').val() }),
			'success': (function (data, textStatus, jqXHR) {
				try {
					var json = $.parseJSON(data);
					if (json) {
						this.get('subscriptions').add(new Subscription(json));
					}
					this.trigger('change:subscriptions');
					callback(true);
				} catch (e) {
					callback(false, UNEXPECTED_ERROR);
				}
			}).bind(this),
			error: function (jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					callback(false, json.message);
				} catch (e) {
					callback(false, UNEXPECTED_ERROR);
				}
			}
		});
	}
});
window.CurrentUser.instance = null;
window.CurrentUser.getInstance = function () {
	"use strict";
	if (CurrentUser.instance == null) {
		CurrentUser.instance = new window.CurrentUser();
		window.CurrentUserView.instance = new window.CurrentUserView({ model: CurrentUser.instance });
	}
	return CurrentUser.instance;
};

