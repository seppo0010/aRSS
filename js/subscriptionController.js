$(function () {
	$('#add_subscription_box').hide();
	$('#add_subscription').click(function () {
		$('#add_subscription_box').show();
		$('#new_subscription_url').val('http://');
	});
	$('#confirm_subscription').click(function () {
		$('#new_subscription_url').attr('disabled', 'disabled');
		CurrentUser.getInstance().subscribe($('#new_subscription_url').val(), function(success, response) {
			if (success) {
				$('#add_subscription_box').hide();
			} else {
				try {
					var json = $.parseJSON(jqXHR.responseText);
					show_message(json.message);
				} catch (e) {
					show_message(UNEXPECTED_ERROR);
				}
			}
			$('#new_subscription_url').attr('disabled', false);
		});
	});
	$('#cancel_subscription').click(function () {
		$('#add_subscription_box').hide();
	});
	$('#add_subscription_box .close').click(function (e) {
		$('#add_subscription_box').hide();
		e.preventDefault();
	});
});

