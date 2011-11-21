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
				$(document.body).focus();
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
				$(document.body).focus();
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

	$('#logout_box a').click(_.bind(user.logout, user));
});
