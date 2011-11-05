# Copyright 2011 Sebastian Waisbrot. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
# 
#    1. Redistributions of source code must retain the above copyright
#    notice, this list of conditions and the following disclaimer.
# 
#    2. Redistributions in binary form must reproduce the above copyright
#    notice, this list of conditions and the following disclaimer in the
#    documentation and/or other materials provided with the distribution.
# 
# THIS SOFTWARE IS PROVIDED BY SALVATORE SANFILIPPO ''AS IS'' AND ANY EXPRESS
# OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
# OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
# NO EVENT SHALL SALVATORE SANFILIPPO OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
# INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
# THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
# 
# The views and conclusions contained in the software and documentation are
# those of the authors and should not be interpreted as representing official
# policies, either expressed or implied, of Salvatore Sanfilippo.

require 'uri'
require 'simple-rss'
require 'open-uri'

class Subscription
	attr_accessor :subscription_id
	attr_accessor :url
	attr_accessor :link
	attr_accessor :title
	attr_accessor :description

	def initialize(redis, hash=nil)
		@r = redis
		if hash
			@subscription_id = hash["subscription_id"]
			@url = hash["url"]
			@link = hash["link"]
			@title = hash["title"]
			@description = hash["description"]
		end
	end

	def self.get_by_id(r, subscription_id)
		return self.new r, r.hgetall('subscription:' + subscription_id.to_s)
	end

	def self.get_by_url(r, url)
		return nil, "Invalid url" if !url.start_with? "http://" and !url.start_with? "https://"
		subscription_id = r.hget 'subscription:url', url
		return self.new r, r.hgetall('subscription:' + subscription_id.to_s) if subscription_id

		begin
			rss = SimpleRSS.parse open(url)
			return nil, "Invalid URL" if !rss

			subcription_id = r.incr 'subscription_id'
			r.hset 'subscription:url', url, subcription_id
			r.hmset 'subscription:' + subcription_id.to_s,
			"subscription_id", subcription_id,
			"url", url

			subscription = self.new r, { "subscription_id" => subcription_id, "url" => url }
			subscription.update_feed rss
			return subscription
		rescue
			return nil, "Invalid URL"
		end
	end

	def update_feed rss=nil
		# TODO: search RSS in homepage
		rss = SimpleRSS.parse open(@url) if !rss
		return nil, "Invalid URL" if !rss
		@r.hmset 'subscription:' + @subscription_id.to_s,
			"link", rss.channel.link,
			"title", rss.channel.title,
			"description", rss.channel.description
		@link = rss.channel.link
		@title = rss.channel.title
		@description = rss.channel.description
		add_items rss.items
		return self
	end

	def add_items items
		items.each {|item|
			item_id = @r.hget 'item:guid', item.guid || (item.link + item.title)
			item_id = @r.incr 'item_id' if !item_id
			date = (item.pubDate || Time.now).to_i
			@r.zadd 'subscription:' + @subscription_id.to_s + ':items', date, item_id.to_s
			@r.hset 'item:guid', item.guid || (item.link + item.title), item_id.to_s 
			@r.hmset 'item:' + item_id.to_s,
				"title", item.title,
				"link", item.link,
				"guid", item.guid,
				"description", item.description,
				"comments", item.comments,
				"timestamp", date.to_s,
				"last_update", Time.now.to_i
			}
	end

	def to_hash
		{
			:subscription_id => @subscription_id,
			:url => @url,
			:link => @link,
			:title => @title,
			:description => @description,
		}
	end
end
