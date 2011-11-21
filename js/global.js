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

function render(template, variables) {
	"use strict";
	var t = document.getElementById('template_' + template).innerHTML;
	return _.template(t, variables);
}

function show_message(message, level) {
	"use strict";
	var html = $(render((level || 'error') + 'message', {message: message}));
	$(document.body).append(html);
	html.hide();
	html.fadeIn('fast');
	setTimeout(function () { html.fadeOut('fast', function () { html.remove(); }); }, 4000);
}


function autolink(text) {
	"use strict";
	var re = /((http|https|ftp):\/\/[\w?=&.\/\-;#~%\-]+(?![\w\s?&.\/;#~%"=\-]*>))/g;
	return (text.replace(re, '<a href="$1">$1</a>'));
}
