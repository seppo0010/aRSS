aRSS Reader
===========

Just a RSS Reader. Inspired on the good old Google Reader (not the current one).

Requirements
------------

To run aRSS the following Gems are required: sinatra, redis, json, simple-rss and hpricot.
To prepare the project to run haml and lessc are required.
Redis server is required. By defaulf aRSS connects to Redis on port 10001.

Installation
------------

    git clone git://github.com/seppo0010/aRSS.git
	cd aRSS
	git submodule update --init
	make
	ruby app.rb
