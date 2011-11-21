$(function () {
	"use strict";
	$(document).keypress(function (e) {
		if ($(':focus').length > 0) { return; }
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.which === 63) { // for some reason in keyup the '?' is returning 0, along with other keys
			$('#keyboard-help').show();
		}
		var index, newActive, active = $('article.active');
		if (e.which === 102) {
			$(document.body).toggleClass('fullscreen');
		}
		if (e.which === 114) {
			CurrentUserView.getInstance().items.reload();
		}
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
			var element = ItemView.DOMMap[newActive.attr('id')];
			if (!element) return;
			element.open();
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
