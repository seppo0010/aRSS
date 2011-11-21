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

require 'digest/sha1'

class User
	attr_accessor :user_id
	attr_accessor :username
	attr_accessor :password

	def initialize(redis, hash=nil)
		@r = redis
		if hash
			@user_id = hash["user_id"]
			@username = hash["username"]
			@password = hash["password"]
		end
	end

	def signup(username, password)
		return nil, "Username already in use" if !@r.setnx('user:' + username, 0)
		@user_id = @r.incr 'user_id'
		@username = username
		@password = Digest::SHA1.hexdigest(Digest::SHA1.hexdigest(@username) + password);
		@r.hset 'user:username', username, @user_id
		@r.hmset 'user:' + @user_id.to_s,
			"password", @password,
			"username", @username,
			"user_id", @user_id
		return self
	end

	def self.get(r, username, password)
		user_id = r.hget 'user:username', username
		return nil, 'Invalid username or password' if !user_id
		if r.hget('user:' + user_id.to_s, 'password') == Digest::SHA1.hexdigest(Digest::SHA1.hexdigest(username) + password);
			return self.new r, r.hgetall('user:' + user_id.to_s)
		else
			return nil, 'Invalid username or password'
		end
	end

	def to_hash
		{ :username => @username, :password => @password, :user_id => @user_id }
	end

	def subscribe(subscription)
		return nil, "Invalid subscription" if !subscription
		return nil, "Unexpected error" if !@user_id
		@r.multi {
			@r.sadd 'user:' + @user_id.to_s + ':subscriptions', subscription.subscription_id.to_s
			@r.sadd 'subscription:' + subscription.subscription_id.to_s + ':users', @user_id.to_s
		}
		items = @r.zrevrange 'subscription:' + subscription.subscription_id.to_s + ':items', 0, 20
		timestamps = @r.multi {
			items.each { |item|
				@r.hget 'item:' + item.to_s, 'timestamp'
			}
		}
		@r.multi {
			items.each_with_index { |item, i|
				timestamp = timestamps[i]
				@r.zadd 'user:' + @user_id.to_s + ':items', timestamp.to_i, item
				@r.zadd 'user:' + @user_id.to_s + ':unread', timestamp.to_i, item
			}
		}
		new_max_item = (items.map {|i| i.to_i}).max
		old_max_item = @r.get('user:'+ @user_id.to_s + ':subscription:' + subscription.subscription_id.to_s + ':max_item').to_i
		if new_max_item > old_max_item
			old_max_item = @r.getset('user:'+ @user_id.to_s + ':subscription:' + subscription.subscription_id.to_s + ':max_item', new_max_item).to_i
			while old_max_item > new_max_item
				old_max_item = @r.getset('user:'+ @user_id.to_s + ':subscription:' + subscription.subscription_id.to_s + ':max_item', old_max_item).to_i
			end
		end
		return subscription
	end

	def unsubscribe(subscription)
		return nil, "Invalid subscription" if !subscription
		return nil, "Unexpected error" if !@user_id
		@r.multi {
			@r.srem 'user:' + @user_id.to_s + ':subscriptions', subscription.subscription_id.to_s
			@r.srem 'subscription:' + subscription.subscription_id.to_s + ':users', @user_id.to_s
		}
		items = @r.zrevrange 'subscription:' + subscription.subscription_id.to_s + ':items', 0, 20
		@r.multi {
			items.each { |item|
				timestamp = @r.hget 'item:' + item.to_s, 'timestamp'
				@r.zrem 'user:' + @user_id.to_s + ':items', item
				@r.zrem 'user:' + @user_id.to_s + ':unread', item
			}
		}
		return subscription
	end

	def subscriptions
		return nil, "Unexpected error" if !@user_id
		Subscription.list @r, @r.smembers('user:' + @user_id.to_s + ':subscriptions')
	end

	def items start, stop, subscription_id
		if subscription_id == 'allitems'
			items = @r.zrevrange 'user:' + @user_id.to_s + ':items', start, stop
		else
			items = @r.zrevrange 'subscription:' + subscription_id.to_s + ':items', start, stop
		end
		r = []
		@r.multi {
			items.each {|item|
				@r.hgetall 'item:' + item.to_s
			}
		}.each {|i|
			item = hgetall_to_hash i
			item[:unread] = @r.zscore('user:'+ @user_id.to_s + ':unread', item["item_id"]) != nil
			r.push(item)
		}
		return r
	end

	def mark items_id, type
		items_id.each {|item_id|
			timestamp = @r.hget 'item:' + item_id.to_s, 'timestamp'
			if (type == 'unread' || type == 'read')
				@r.multi {
					@r.zrem 'user:' + @user_id.to_s + ':' + (type =='read' ? 'un' : '') + 'read', item_id.to_s
					@r.zadd 'user:' + @user_id.to_s + ':' + (type =='read' ? '' : 'un') + 'read', timestamp, item_id.to_s
				}
			end
		}
	end
end
