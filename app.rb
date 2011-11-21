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

require 'app_config'
require 'rubygems'
require 'redis'
require 'sinatra'
require 'json'
require 'user'
require 'subscription'
require 'digest/sha1'

Version = "0.0.0"

def output obj
	return obj if obj.is_a? String
	return obj.to_json
end

before do
	$r = Redis.new(:host => RedisHost, :port => RedisPort) if !$r
	$user = nil
	auth_user(request.params['user_id'], request.params['token'])
end

get '/' do
	redirect('/html/index.html')
end

post '/user/signup' do
	if (!required_params(:username, :password))
		halt(401, output({ :status => "error", :message => "Missing username or password"}))
	end
	$user = User.new $r
	u, message = $user.signup(params[:username], params[:password])
	if (!u)
		halt(401, output({ :status => "error", :message => message }))
	else
		output({ :status => "ok", :user => $user.to_hash })
	end
end

post '/user/login' do
	if (!required_params(:username, :password))
		halt(401, output({ :status => "error", :message => "Missing username or password"}))
	end
	$user, message = User.get($r, params[:username], params[:password])
	if (!$user)
		halt(401, output({ :status => "error", :message => message }))
	else
		output({ :status => "ok", :user => $user.to_hash })
	end
end

post '/subscription/subscribe' do
	if (!$user)
		halt(401, output({ :status => "error", :message => "Missing or invalid token"}))
	end
	if (!required_params(:subscription_url))
		halt(401, output({ :status => "error", :message => "Missing subscription url"}))
	end

	subscription, message = Subscription.get_by_url $r, params[:subscription_url]
	if !subscription
		halt(400, output({ :status => "error", :message => message}))
	end
	subscription, message = $user.subscribe subscription
	if !subscription
		halt(400, output({ :status => "error", :message => message}))
	end
	output(subscription.to_hash)
end

post '/subscription/unsubscribe' do
	if (!$user)
		halt(401, output({ :status => "error", :message => "Missing or invalid token"}))
	end
	if (!required_params(:subscription_url) and !required_params(:subscription_id))
		halt(401, output({ :status => "error", :message => "Missing subscription"}))
	end

	if params[:subscription_url]
		subscription, message = Subscription.get_by_url $r, params[:subscription_url]
	elsif params[:subscription_id]
		subscription, message = Subscription.get_by_id $r, params[:subscription_id]
	end

	if !subscription
		halt(400, output({ :status => "error", :message => message}))
	end
	subscription, message = $user.unsubscribe subscription
	if !subscription
		halt(400, output({ :status => "error", :message => message}))
	end
	output(subscription.to_hash)
end

get '/subscription/list' do
	if (!$user)
		halt(401, output({ :status => "error", :message => "Missing or invalid token"}))
	end
	output($user.subscriptions)
end

get '/items/list' do
	if (!$user)
		halt(401, output({ :status => "error", :message => "Missing or invalid token"}))
	end
	output($user.items params[:start].to_i, params[:stop] || 20, params[:subscription_id], { :unread => params[:unread] })
end

post '/items/mark' do
	if (!$user)
		halt(401, output({ :status => "error", :message => "Missing or invalid token"}))
	end
	if (!params[:items_id])
		halt(401, output({ :status => "error", :message => "Missing or invalid item_id"}))
	end
	output($user.mark(params[:items_id].split(','), params[:type]))
end

def required_params *required
	required.each{|p|
		if !params[p] or !params[p].is_a? String or params[p].length == 0
			return false
		end
	}
	return true
end

def auth_user(user_id, token)
	return if token != 'true'
	user = $r.hgetall("user:#{user_id}")
	$user = User.new $r, user if user.length > 0
end

def hgetall_to_hash s
	l = {}
	(s.count / 2).times {|t|
		l[s[t * 2]] = s[t * 2 + 1]
	}
	return l
end
