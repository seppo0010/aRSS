all: js css html

js:
	cp lib/bootstrap/js/*.js public/js/
	cp lib/underscode/underscore-min.js public/js/
	cp lib/backbone/backbone.js public/js/
	cat js/* | uglifyjs  > public/js/main.js

css:
	mkdir -p public/css
	cd lib/bootstrap && make
	mv lib/bootstrap/bootstrap.min.css public/css/bootstrap.min.css
	cd lib/bootstrap && git checkout -- bootstrap.min.css bootstrap.css
	lessc less/main.less > public/css/main.css

html:
	mkdir -p public/html
	haml -f html5 haml/index.haml public/html/index.html

release:
	mkdir -p public/html
	haml -f html5 -t ugly haml/index.haml public/html/index.html
	lessc less/main.less > public/css/main.css --compress

