window.ItemView = Backbone.View.extend({
	"tagName": "li",
	"events": {
		'click article': "open"
	},
	"initialize": function () {
		"use strict";
		ItemView.DOMMap["ItemView" + this.model.get('item_id')] = this;
	},
	"destroy": function () {
		"use strict";
		delete ItemView.DOMMap["ItemView" + this.model.get('item_id')]
	},
	"open": function () {
		"use strict";
		var active = $('article.active');
		active.removeClass('active');
		$(this.el).find('article').addClass('active');
		var offset = $(document.body).hasClass('fullscreen') ? 10 : 50;
		$('html, body').animate({ scrollTop: $(this.el).offset().top - offset }, 100);
		$(this.el).find('article').removeClass('unread');
		$(this.el).find('article').addClass('read');
		this.model.mark('read');
	},
	"render": function () {
		"use strict";
		$(this.el).html(render('item', { item: this.model, user: CurrentUser.getInstance() }));
		return this;
	}
});
window.ItemView.DOMMap = {};

window.ItemListView = Backbone.View.extend({
	initialize: function () {
		CurrentUser.getInstance().bind('change:items', this.render);
		CurrentUser.getInstance().bind('change:subscriptions', this.reload);
		CurrentUser.getInstance().bind('change:active_subscription', this.render);
	},
	reload: function () {
		var subscription, items, user = CurrentUser.getInstance();
		if (user.get('active_subscription') === 'allitems') {
			items = user.get('items')['allitems'];
		} else {
			if (!user.get('subscriptions')) {
				return;
			}
			subscription = user.get('subscriptions').at(user.get('subscriptions_index')[user.get('active_subscription')]);
			if (!subscription) {
				return;
			}
			items = subscription.get('items');
			if (!items) {
				return;
			}
		}
		items.fetchList();
	},
	render: function () {
		"use strict";
		var subscription, i, d, items, user = CurrentUser.getInstance();
		if (!user.get('subscriptions')) {
			return;
		}
		if (user.unread_number) {
			$('title').text('(' + user.unread_number + ') aRSS Reader');
		} else {
			$('title').text('aRSS Reader');
		}
		if (user.get('active_subscription') === 'allitems') {
			items = user.get('items')['allitems'];
		} else {
			subscription = user.get('subscriptions').at(user.get('subscriptions_index')[user.get('active_subscription')]);
			if (!subscription) {
				return;
			}
			items = subscription.get('items');
			if (!items) {
				return;
			}
		}
		if (!items.initialized) {
			items.fetchList();
			return;
		}
		var ul = $('<ul class="unstyled"></ul>');
		items.each(function (item, i) {
			ul.append((new ItemView({ model: item })).render().el);
		});
		$('#item_list').html(ul);
		$('html, body').animate({ scrollTop: $(this.el).offset().top }, 100);
	}
});

