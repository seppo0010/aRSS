var user = {
	"username": null,
	"user_id": null,
	"unread_number": 0,
	"subscriptions": [],
	"active_list": 'allitems',
	"allitems": [],
}

var UNEXPECTED_ERROR = "Oops, something went wrong";

function deepCopy(obj) {
	if (typeof obj == 'object') {
		if (obj instanceof Array) {
			var l = obj.length;
			var r = new Array(l);
			for (var i = 0; i < l; i++) {
				r[i] = deepCopy(obj[i]);
			}
			return r;
		} else {
			var r = {};
			r.prototype = obj.prototype;
			for (var k in obj) {
				r[k] = deepCopy(obj[k]);
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
	if (obj instanceof Array)
		return true;
	for (var k in ARRAY_PROPS) {
		if (!(k in obj && typeof obj[k] == ARRAY_PROPS[k]))
		return false;
	}
	return true;
}

var escaper = $('<div></div>')
function htmlentities(str) {
	if (typeof str === 'string')
		return escaper.text(str).html();
	else {
		var obj = deepCopy(str)
		if (typeof obj === 'array')
			return $.map(obj, function(i, e) { return htmlentities(e) });
		else
			for (var k in obj)
				obj[k] = htmlentities(obj[k]);
		return obj;
	}
}

function html_entities_decode(str) {
	if (typeof str === 'string')
		return escaper.html(str).text();
	else {
		var obj = deepCopy(str)
		if (typeof obj === 'array')
			return $.map(obj, function(i, e) { return html_entities_decode(e) });
		else
			for (var k in obj)
				obj[k] = html_entities_decode(obj[k]);
		return obj;
	}
}

function add_user_credentials(params) {
	if (!params) params = {};
	params.user_id = user.user_id;
	params.token = "true";
	return params
}

function user_logout() {
	user.username = null;
	user.user_id = null;
	user.subscriptions = [];
	window.name = null;
	$(document.body).attr('id', 'not_logged_in');
}

function refresh_items() {
	if (user.unread_number)
		$('title').text('(' + user.unread_number + ') aRSS Reader');
	else
		$('title').text('aRSS Reader');
	if (!user[user.active_list]) {
		// TODO: handle me! send ajax here
		return;
	}
	var items = deepCopy(user[user.active_list]);
	for (var i in items) {
		var d = items[i].description;
		items[i] = html_entities_decode(items[i]);
		items[i] = htmlentities(items[i]);
		items[i].description = html_entities_decode(d);
	}
	$('#item_list').html(render('item_list', {item: items}, true))
        $('#item_list article').each(function(i,news) {
            $(news).click(function() {
                var active = $('article.active');
                active.removeClass('active');
                $(news).addClass('active');
            });
        });
}

function refresh_subscriptions() {
	$('#subscription_list').html(render('subscription_list', user))
	$('#subscription_list li a').click(function(ev) {
		var obj = ev.currentTarget;
		$('#subscription_list li a.active').removeClass('active');
		$(obj).addClass('active');
		var href = $(obj).attr('href');
		user.active_list = href.substr(href.lastIndexOf('/') + 1)
	});
}

function user_has_logged_in() {
	$('a.menu').parent().removeClass('open');
	if (user.user_id) {
		window.name = '{"username":"'+encodeURIComponent(user.username)+'","user_id":'+ user.user_id +'}'
		$(document.body).attr('id', 'logged_in');
		$.ajax('/items/list', {
			'data': add_user_credentials({ start: 0, stop: 100}),
			'success': function(data, textStatus, jqXHR) {
				try {
					var json = $.parseJSON(data);
					user.allitems = json
					refresh_items();
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message)
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
		});
		$.ajax('/subscription/list', {
			'data': add_user_credentials(),
			'success': function(data, textStatus, jqXHR) {
				try {
					var json = $.parseJSON(data);
					user.subscriptions = json
					refresh_subscriptions();
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message)
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
		});
	}
}

function render(template, variables, no_escape) {
	var t = new EJS({ text: document.getElementById('template_' + template).innerHTML })
	return t.render(no_escape ? variables : htmlentities(variables));
}

function show_message(message, level) {
	var html = $(render((level || 'error') + 'message', {message: message}));
	$(document.body).append(html)
	html.hide();
	html.fadeIn('fast');
	setTimeout(function() { html.fadeOut('fast', function() { html.remove(); }); }, 4000)
}

$(function() {
	try {
		if (window.name) {
			var data = $.parseJSON(window.name)
			if (data) {
				user.username = decodeURIComponent(data.username)
				user.user_id = decodeURIComponent(data.user_id)
				user_has_logged_in();
			}
		}
	} catch (e) {}

	$('.login').click(function() {
		$('#register_box').hide();
		$('#login_box').show();
		$('#login_box').find('input:visible').first().focus();
	})

	$('.register').click(function() {
		$('#register_box').show();
		$('#login_box').hide();
		$('#register_box').find('input:visible').first().focus();
	})

	$('a.menu').click(function(ev) {
		$(ev.currentTarget).parent().toggleClass('open');
		$(ev.currentTarget).parent().find('input:visible').first().focus();
	})

	$('#login_form').submit(function (e) {
		$.ajax('/user/login', {
			'type': 'post',
			'data': {
				'username': $('#email').val(),
				'password': $('#password').val(),
			},
			'success': function(data, textStatus, jqXHR) {
				$('#email').val('')
				$('#password').val('')
				$('#register_email').val('')
				$('#register_password').val('')
				$('#confirm_register_password').val('')
				var json = $.parseJSON(data);
				user.username = json.user.username;
				user.user_id = json.user.user_id;
				if (user.user_id)
					user_has_logged_in();
				else
					show_message(UNEXPECTED_ERROR)
			},
			error: function(jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message)
				} catch (e) {
					show_message(UNEXPECTED_ERROR)
				}
			},
		})
		e.preventDefault();
	})

	$('#register_form').submit(function (e) {
		$.ajax('/user/signup', {
			'type': 'post',
			'data': {
				'username': $('#register_email').val(),
				'password': $('#register_password').val(),
			},
			'success': function(data, textStatus, jqXHR) {
				$('#email').val('')
				$('#password').val('')
				$('#register_email').val('')
				$('#register_password').val('')
				$('#confirm_register_password').val('')
				var json = $.parseJSON(data);
				user.username = json.user.username;
				user.user_id = json.user.user_id;
				user_has_logged_in();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message)
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			},
		})
		e.preventDefault();
	})

	$('#add_subscription_box').hide();
	$('#add_subscription').click(function () {
		$('#add_subscription_box').show();
		$('#new_subscription_url').val('http://');
	})
	$('#confirm_subscription').click(function() {
		$('#new_subscription_url').attr('disabled', 'disabled');
		$.ajax('/subscription/subscribe', {
			'type': 'post',
			'data': add_user_credentials({subscription_url: $('#new_subscription_url').val() }),
			'success': function(data, textStatus, jqXHR) {
				var json = $.parseJSON(data);
				if (json) {
					user.subscriptions.push(json);
					refresh_subscriptions();
				}
				$('#add_subscription_box').hide();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message)
				} catch (e) {
					show_message(UNEXPECTED_ERROR)
				}
			},
			complete: function() {
				$('#new_subscription_url').attr('disabled', false);
			}
		})
	});
	$('#cancel_subscription').click(function() {
		$('#add_subscription_box').hide();
	});
	$('#add_subscription_box .close').click(function(e) {
		$('#add_subscription_box').hide();
		e.preventDefault();
	});
	$('#logout_box a').click(user_logout);
});

    $(function() {
        $(document).keypress(function(e) {
            if ($(':focus').length > 0) return;
            if (e.which == 63) { // for some reason in keyup the '?' is returning 0, along with other keys
                $('#keyboard-help').show();
            }
            var active = $('article.active');
            if (e.which == 106 || e.which == 107) {
                var newActive;
                if (active.length == 0) {
                    if (e.which == 106) {
                        newActive = $('article').first();
                    } else {
                        newActive = $('article').last();
                    }
                } else if (e.which == 106){
                    newActive = $($('article').get($('article').index(active)+1));
                } else if (e.which == 107){
                    var index = $('article').index(active);
                    if (index == 0) return;
                    newActive = $($('article').get(index-1));
                }
                if (newActive.length == 0) return;
                active.removeClass('active');
                newActive.addClass('active');
				$('html, body').animate({ scrollTop: newActive.offset().top - 50 }, 100);
            }
            if (e.which == 13 && active.length > 0) {
                if (active.find('h2 a').length == 0) return;
                location.href = active.find('h2 a').attr('href');
            }
            if (e.which == 27) {
                $('#keyboard-help').hide();
            }
        });
    });
