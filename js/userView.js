window.CurrentUserView = Backbone.View.extend({
	subscriptions: null,
	items: null,
	initialize: function () {
		"use strict";
		this.model.bind('destroy', function () {
			$(document.body).attr('id', 'not_logged_in');
		});
		this.model.bind('change', this.render, this);
		this.model.bind('change:view_items', function () {
			this.items.reload();
		}, this);
		this.subscriptions = new SubscriptionListView();
		this.items = new ItemListView ();
		$('div.options a').click(function (ev) {
			$('div.options a').removeClass('primary');
			var e = $(ev.currentTarget);
			$(e).addClass('primary');
			if (e.attr('id') === 'viewAll') {
				CurrentUser.getInstance().set({'view_items': window.ViewItemsAll });
			}
			if (e.attr('id') === 'viewUnread') {
				CurrentUser.getInstance().set({'view_items': window.ViewItemsUnread });
			}
		});
	},
	render: function () {
		"use strict";
		if (this.model.get('user_id') === 0) {
			$(document.body).attr('id', 'not_logged_in');
			$('#item_list').html('');
			$('#subscriptions').html('');
		} else {
			$('a.menu').parent().removeClass('open');
			$(document.body).attr('id', 'logged_in');
		}
	}
});
window.CurrentUserView.instance = null;
window.CurrentUserView.getInstance = function () {
	"use strict";
	return window.CurrentUserView.instance;
};

