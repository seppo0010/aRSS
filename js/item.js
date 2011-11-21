window.Item = Backbone.Model.extend({
	"mark": function (type) {
		"use strict";
		$.ajax('/items/mark', {
			'type': 'post',
			'data': CurrentUser.getInstance().signParams({
				items_id: this.get('item_id'),
				type: type
			}),
			complete: _.bind(function () {
				this.trigger('change');
			}, this)
		});
	}
});

window.ItemList = Backbone.Collection.extend({
	model: Item,
	section: null,
	unread: false,
	fetching: false,
	initialized: false,
	initialize: function () {
		"use strict";
	},
	fetchList: function (list) {
		"use strict";
		if (this.fetching) {
			return;
		}
		this.initialized = true;
		this.fetching = true;
		list = list || {};
		if (this.section) {
			list.subscription_id = this.section;
		}
		list.start = 0;
		list.stop = 100;
		if (CurrentUser.getInstance().get('view_items') === window.ViewItemsUnread) {
			list.unread = 1;
		}
		$.ajax('/items/list', {
			'data': CurrentUser.getInstance().signParams(list),
			'success': _.bind(function (data, textStatus, jqXHR) {
				try {
					var json = $.parseJSON(data);
					this.reset(json);
					CurrentUser.getInstance().trigger('change:items');
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			}, this),
			error: function (jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message);
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
			complete: (function () {
				this.fetching = false;
			}).bind(this)
		});
	}
});

