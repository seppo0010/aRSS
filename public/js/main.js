

var UNEXPECTED_ERROR = "Oops, something went wrong";

function deepCopy(obj) {
	"use strict";
	var l, r, i, k;
	if (typeof obj === 'object') {
		if (obj instanceof Array) {
			l = obj.length;
			r = [];
			for (i = 0; i < l; i += 1) {
				r[i] = deepCopy(obj[i]);
			}
			return r;
		} else {
			r = {};
			r.prototype = obj.prototype;
			for (k in obj) {
				if (obj.hasOwnProperty(k)) {
					r[k] = deepCopy(obj[k]);
				}
			}
			return r;
		}
	}
	return obj;
}

var ARRAY_PROPS = {
        length: 'number',
        sort: 'function',
        slice: 'function',
        splice: 'function'
    };

function isArray(obj) {
	"use strict";
	var k;
	if (obj instanceof Array) {
		return true;
	}
	for (k in ARRAY_PROPS) {
		if (!(k in obj && typeof obj[k] === ARRAY_PROPS[k])) {
			return false;
		}
	}
	return true;
}

var escaper = $('<div></div>');
function htmlentities(str) {
	"use strict";
	var k, obj;
	if (typeof str === 'string') {
		return escaper.text(str).html();
	} else {
		obj = deepCopy(str);
		if (typeof obj === 'array') {
			return $.map(obj, function (i, e) { return htmlentities(e); });
		} else {
			for (k in obj) {
				if (obj.hasOwnProperty(k)) {
					obj[k] = htmlentities(obj[k]);
				}
			}
		}
		return obj;
	}
}

function html_entities_decode(str) {
	"use strict";
	var k, obj;
	if (typeof str === 'string') {
		return escaper.html(str).text();
	} else {
		obj = deepCopy(str);
		if (typeof obj === 'array') {
			return $.map(obj, function (i, e) { return html_entities_decode(e); });
		} else {
			for (k in obj) {
				if (obj.hasOwnProperty(k)) {
					obj[k] = html_entities_decode(obj[k]);
				}
			}
		}
		return obj;
	}
}

function render(template, variables, no_escape) {
	"use strict";
	var t = document.getElementById('template_' + template).innerHTML;
	return _.template(t, no_escape ? variables : htmlentities(variables));
}

function show_message(message, level) {
	"use strict";
	var html = $(render((level || 'error') + 'message', {message: message}));
	$(document.body).append(html);
	html.hide();
	html.fadeIn('fast');
	setTimeout(function () { html.fadeOut('fast', function () { html.remove(); }); }, 4000);
}

var User = Backbone.Model.extend({
	attributes: {
		"username": null,
		"user_id": 0
	}
});

window.CurrentUser = User.extend({
	attributes: {
		"unread_number": 0,
		"subscriptions": [],
		"subscriptions_index": {},
		"active_list": "allitems",
		"allitems": [],
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
		this.bind('change:user_id', this.didLogin, this);
	},
	"logout": function () {
		"use strict";
		window.name = null;
		window.CurrentUser.instance = null;
	},
	"fetchUnread": function () {
		$.ajax('/items/list', {
			'data': this.signParams({ start: 0, stop: 100}),
			'success': function (data, textStatus, jqXHR) {
				try {
					var json = $.parseJSON(data);
					CurrentUser.getInstance().set({ allitems: new ItemList(json) });
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
	"fetchSubscriptions": function () {
		"use strict";
		var user = this;
		$.ajax('/subscription/list', {
			'data': this.signParams(),
			'success': function (data, textStatus, jqXHR) {
				try {
					var s, json = $.parseJSON(data);
					var user = CurrentUser.getInstance();
					for (s in user.subscriptions) {
						if (user.subscriptions.hasOwnProperty(s)) {
							user.subscriptions_index[user.subscriptions[s].subscription_id] = s;
						}
					}
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
				this.fetchUnread();
				this.fetchSubscriptions();
			}
		} else {
			if (this.isLoggedIn) {
				this.logout();
			}
		}
	}
});
window.CurrentUser.instance = null;
window.CurrentUser.getInstance = function () {
	"use strict";
	if (CurrentUser.instance == null) {
		CurrentUser.instance = new window.CurrentUser();
		new window.CurrentUserView({ model: CurrentUser.instance })
	}
	return CurrentUser.instance;
};

window.CurrentUserView = Backbone.View.extend({
	initialize: function () {
		"use strict";
		this.model.bind('destroy', function () {
			$(document.body).attr('id', 'not_logged_in');
		});
		this.model.bind('change', this.render, this);
	},
	render: function () {
		"use strict";
		if (this.model.get('user_id') === 0) {
			$(document.body).attr('id', 'not_logged_in');
		} else {
			$('a.menu').parent().removeClass('open');
			$(document.body).attr('id', 'logged_in');
		}
	}
});

window.Subscription = Backbone.Model.extend({
	attributes: {
		"items": null
	},
	initialize: function () {
		"use strict";
		this.items = new ItemList();
	}
});

window.SubscriptionList = Backbone.Collection.extend({
	model: Subscription
});

window.Item = Backbone.Model.extend({
});

var ItemList = Backbone.Collection.extend({
	model: Item
});

window.Item.refresh = function () {
	"use strict";
	var user = CurrentUser.getInstance();
	if (user.unread_number) {
		$('title').text('(' + user.unread_number + ') aRSS Reader');
	} else {
		$('title').text('aRSS Reader');
	}
	if (!user[user.active_list]) {
		// TODO: handle me! send ajax here
		return;
	}
	var i, d, items = deepCopy(user[user.active_list]);
	for (i in items) {
		if (items.hasOwnProperty(i)) {
			d = items[i].description;
			items[i] = html_entities_decode(items[i]);
			items[i] = htmlentities(items[i]);
			items[i].description = html_entities_decode(d);
		}
	}
	$('#item_list').html(render('item_list', {item: items, user: user}, true));
	$('#item_list article').each(function (i, news) {
		$(news).click(function () {
			var active = $('article.active');
			active.removeClass('active');
			$(news).addClass('active');
		});
	});
};

window.Subscription = Backbone.Model.extend({
});

window.SubscriptionListView = Backbone.View.extend({
	render: function () {
		"use strict";
		$('#subscription_list').html(render('subscription_list', CurrentUser.getInstance()));
		$('#subscription_list li a').click(function (ev) {
			var href, obj = ev.currentTarget;
			$('#subscription_list li a.active').removeClass('active');
			$(obj).addClass('active');
			href = $(obj).attr('href');
			CurrentUser.getInstance().active_list = href.substr(href.lastIndexOf('/') + 1);
		});
	}
});

$(function () {
	"use strict";
	var user = CurrentUser.getInstance();
	try {
		if (window.name) {
			var data = $.parseJSON(window.name);
			if (data) {
				user.set({
					username: decodeURIComponent(data.username),
					user_id: decodeURIComponent(data.user_id)
				});
			}
		}
	} catch (e) {}

	$('.login').click(function () {
		$('#register_box').hide();
		$('#login_box').show();
		$('#login_box').find('input:visible').first().focus();
	});

	$('.register').click(function () {
		$('#register_box').show();
		$('#login_box').hide();
		$('#register_box').find('input:visible').first().focus();
	});

	$('a.menu').click(function (ev) {
		$(ev.currentTarget).parent().toggleClass('open');
		$(ev.currentTarget).parent().find('input:visible').first().focus();
	});

	$('#login_form').submit(function (e) {
		$.ajax('/user/login', {
			'type': 'post',
			'data': {
				'username': $('#email').val(),
				'password': $('#password').val()
			},
			'success': function (data, textStatus, jqXHR) {
				$('#email').val('');
				$('#password').val('');
				$('#register_email').val('');
				$('#register_password').val('');
				$('#confirm_register_password').val('');
				var json = $.parseJSON(data);
				user.set({
					username: json.user.username,
					user_id: json.user.user_id
				});

				if (!user.get('user_id')) {
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
		e.preventDefault();
	});

	$('#register_form').submit(function (e) {
		$.ajax('/user/signup', {
			'type': 'post',
			'data': {
				'username': $('#register_email').val(),
				'password': $('#register_password').val()
			},
			'success': function (data, textStatus, jqXHR) {
				$('#email').val('');
				$('#password').val('');
				$('#register_email').val('');
				$('#register_password').val('');
				$('#confirm_register_password').val('');
				var json = $.parseJSON(data);
				user.set({
					username: json.user.username,
					user_id: json.user.user_id
				});
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
		e.preventDefault();
	});

	$('#add_subscription_box').hide();
	$('#add_subscription').click(function () {
		$('#add_subscription_box').show();
		$('#new_subscription_url').val('http://');
	});
	$('#confirm_subscription').click(function () {
		$('#new_subscription_url').attr('disabled', 'disabled');
		$.ajax('/subscription/subscribe', {
			'type': 'post',
			'data': add_user_credentials({subscription_url: $('#new_subscription_url').val() }),
			'success': function (data, textStatus, jqXHR) {
				var json = $.parseJSON(data);
				if (json) {
					user.subscriptions.push(json);
				}
				$('#add_subscription_box').hide();
			},
			error: function (jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message);
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
			complete: function () {
				$('#new_subscription_url').attr('disabled', false);
			}
		});
	});
	$('#cancel_subscription').click(function () {
		$('#add_subscription_box').hide();
	});
	$('#add_subscription_box .close').click(function (e) {
		$('#add_subscription_box').hide();
		e.preventDefault();
	});
	$('#logout_box a').click(user.logout);
});

$(function () {
	"use strict";
	$(document).keypress(function (e) {
		if ($(':focus').length > 0) { return; }
		if (e.which === 63) { // for some reason in keyup the '?' is returning 0, along with other keys
			$('#keyboard-help').show();
		}
		var index, newActive, active = $('article.active');
		if (e.which === 106 || e.which === 107) {
			if (active.length === 0) {
				if (e.which === 106) {
					newActive = $('article').first();
				} else {
					newActive = $('article').last();
				}
			} else if (e.which === 106) {
				newActive = $($('article').get($('article').index(active) + 1));
			} else if (e.which === 107) {
				index = $('article').index(active);
				if (index === 0) { return; }
				newActive = $($('article').get(index - 1));
			}
			if (newActive.length === 0) {
				return;
			}
			active.removeClass('active');
			newActive.addClass('active');
			$('html, body').animate({ scrollTop: newActive.offset().top - 50 }, 100);
		}
		if (e.which === 13 && active.length > 0) {
			if (active.find('h2 a').length === 0) { return; }
			location.href = active.find('h2 a').attr('href');
		}
		if (e.which === 27) {
			$('#keyboard-help').hide();
		}
	});
});
