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
require 'digest/sha1'

Version = "0.0.0"

before do
    $r = Redis.new(:host => RedisHost, :port => RedisPort) if !$r
    $user = nil
    auth_user(request.params['user_id'], request.params['token'])
	$output_method = :to_json
end

post '/user/signup' do
	if (!required_params(:username, :password))
		halt(401, { :status => "error", :message => "Missing username or password"}.send($output_method))
	end
	$user = User.new $r
	u, message = $user.signup(params[:username], params[:password])
	if (!$user)
		halt(401, { :status => "error", :message => message }.send($output_method))
	else
		{ :status => "ok", :user => $user.to_hash }.send($output_method)
	end
end

post '/user/login' do
	if (!required_params(:username, :password))
		halt(401, { :status => "error", :message => "Missing username or password"}.send($output_method))
	end
	$user, message = User.get($r, params[:username], params[:password])
	if (!$user)
		halt(401, { :status => "error", :message => message }.send($output_method))
	else
		{ :status => "ok", :user => $user.to_hash }.send($output_method)
	end
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
    $user = user if user.length > 0
end
