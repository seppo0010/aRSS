window.SubscriptionListView = Backbone.View.extend({
	initialize: function () {
		CurrentUser.getInstance().unbind('change:subscriptions', this.render);
		CurrentUser.getInstance().bind('change:subscriptions', this.render);
		if (CurrentUser.getInstance().get('subscriptions')) {
			CurrentUser.getInstance().get('subscriptions').bind('add', this.render);
		}
	},
	render: function () {
		"use strict";

		var s, user = CurrentUser.getInstance();
		s = user.get('subscriptions');
		s.unbind('add', this.render);
		s.bind('add', this.render); // in case it wasn't binded

		$('#subscription_list').html(render('subscription_list', { subscriptions: s }));
		$('#subscription_list li a').click(function (ev) {
			var href, obj = ev.currentTarget;
			$('#subscription_list li a.active').removeClass('active');
			$(obj).addClass('active');
		});
	}
});

