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

require 'rubygems'
require 'uri'
require 'net/http'
require 'simple-rss'
require 'open-uri'
require 'hpricot'

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

	def self.get_by_url(r, url, max_redirects = 10)
		return nil, "Maximum redirections reached" if max_redirects == 0
		return nil, "Invalid url" if !url.start_with? "http://" and !url.start_with? "https://"
		subscription_id = r.hget 'subscription:url', url
		return self.new r, r.hgetall('subscription:' + subscription_id.to_s) if subscription_id

		begin
			uri = URI(url)
			response = Net::HTTP.get_response uri
			case response
				when Net::HTTPSuccess     then
				when Net::HTTPRedirection then return self.get_by_url(r, response['location'], max_redirects - 1)
			else
				return nil, "Invalid URL"
			end
			body = response.body
			rss = SimpleRSS.parse body
			return nil, "Invalid URL" if !rss

			subcription_id = r.incr 'subscription_id'
			r.hset 'subscription:url', url, subcription_id
			r.hmset 'subscription:' + subcription_id.to_s,
			"subscription_id", subcription_id,
			"url", url

			subscription = self.new r, { "subscription_id" => subcription_id, "url" => url }
			subscription.update_feed rss
			return subscription
		rescue Exception => e
            p e
			begin
				doc = Hpricot.parse(body)
				(doc/:link).each do |link|
					if link[:rel] == 'alternate' and (link[:type] == 'application/rss+xml' or link[:type] == 'application/atom+xml')
						_uri = URI(link[:href])
						_uri.scheme = uri.scheme if !_uri.scheme
						_uri.host = uri.host if !_uri.host
						_uri.port = uri.port if !_uri.port
						_uri.path = uri.path if !_uri.path
						_uri.query = uri.query if !_uri.query
						_uri.fragment = uri.fragment if !_uri.fragment
						return self.get_by_url r, _uri.to_s, max_redirects - 1 if _uri != uri
					end
				end
				return nil, "Invalid URL"
			rescue Exception => e
				p e
				return nil, "Invalid URL"
			end
		end
	end

	def update_feed rss=nil
		begin
			rss = SimpleRSS.parse open(@url) if !rss
			return nil, "Invalid URL" if !rss
		rescue
			return nil, "Invalid URL" if !rss
		end

		description = ''
		begin
			description = rss.channel.description
		rescue
		end
		@r.hmset 'subscription:' + @subscription_id.to_s,
			"link", rss.channel.link,
			"title", rss.channel.title,
			"description", description
		@link = rss.channel.link
		@title = rss.channel.title
		@description = description
		add_items rss.items
        oldest = @r.zrange 'subscription:' + @subscription_id.to_s + ':items', 0, 0, { :withscores => true }
        timestamp = oldest.last.to_i
        card = @r.zcard 'subscription:' + @subscription_id.to_s + ':items'
        now = Time.now.to_i
        @r.zadd 'subscription:next_update', now + [(now - timestamp) / card, 60].max, @subscription_id
		return self
	end

	def add_items items
		@r.lpush 'feed_update', @subscription_id
		items.each {|item|
			item_id = @r.hget 'item:guid', item.guid || (item.link + item.title)
			item_id = @r.incr 'item_id' if !item_id
			date = (item.pubDate || Time.now).to_i
			@r.zadd 'subscription:' + @subscription_id.to_s + ':items', date, item_id.to_s
			@r.hset 'item:guid', item.guid || (item.link + item.title), item_id.to_s 
			@r.hmset 'item:' + item_id.to_s,
				"item_id", item_id,
				"subscription_id", @subscription_id,
				"title", item.title,
				"link", item.link,
				"guid", item.guid,
				"description", item.description,
				"comments", item.comments,
				"timestamp", date.to_s
			}
	end

	def self.list(r, ids)
		multi = r.multi {
			ids.each {|s_id|
				r.hgetall 'subscription:' + s_id.to_s
			}
		}
		subscriptions = []
		multi.each {|s|
			subscriptions.push(hgetall_to_hash s)
		}
		return subscriptions
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

	def self.update_scheduled r
		r.zrangebyscore('subscription:next_update', '-inf', Time.now.to_i).each { |subscription_id|
			self.get_by_id(r, subscription_id).update_feed
		}
        oldest = r.zrange 'subscription:next_update', 0, 0, { :withscores => true }
        return oldest.last.to_i
	end
end
