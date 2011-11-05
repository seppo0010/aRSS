var user = {
	"username": null,
	"user_id": null,
	"subscriptions": [],
}

var UNEXPECTED_ERROR = "Oops, something went wrong";

function add_user_credentials(params) {
	if (!params) params = {};
	params.user_id = user.user_id;
	params.token = "true";
	return params
}

function user_has_logged_out() {
	user.username = null;
	user.user_id = null;
	user.subscriptions = [];
	$(document.body).attr('id', 'not_logged_in');
}

function user_has_logged_in() {
	$('a.menu').parent().removeClass('open');
	if (user.user_id) {
		$(document.body).attr('id', 'logged_in');
		$.ajax('/subscription/list', {
			'data': add_user_credentials(),
			'success': function(data, textStatus, jqXHR) {
				try {
					var json = $.parseJSON(data);
					user.subscriptions = json
					console.log(json);
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
		})
	}
}

function render(template, variables) {
	var t = new EJS({ text: document.getElementById(template).innerHTML })
	return t.render(variables);
}

function show_message(message, level) {
	var html = $(render((level || 'error') + 'message', {message: message}));
	$(document.body).append(html)
	html.hide();
	html.fadeIn('fast');
	setTimeout(function() { html.fadeOut('fast', function() { html.remove(); }); }, 4000)
}

$(function() {
	$('.login').click(function() {
		$('#register_box').hide();
		$('#login_box').show();
	})

	$('.register').click(function() {
		$('#register_box').show();
		$('#login_box').hide();
	})

	$('a.menu').click(function(ev) {
		$(ev.currentTarget).parent().toggleClass('open');
	})

	$('#login_form').submit(function (e) {
		$.ajax('/user/login', {
			'type': 'post',
			'data': {
				'username': $('#email').val(),
				'password': $('#password').val(),
			},
			'success': function(data, textStatus, jqXHR) {
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
});
