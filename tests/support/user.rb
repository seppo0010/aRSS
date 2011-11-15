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
require 'httpclient'
require 'json'

class User
	def initialize user=nil
		@u = user
		@u['token'] ||= "true"
	end

	def self.signup username, password
		r = JSON.parse HTTPClient.new.post(BaseUrl + '/user/signup', {
			:username => username,
			:password => password,
		}).content
		return true, self.new(r['user']) if r['status'] == 'ok'
		return false, r
	end

	def self.login username, password
		r = JSON.parse HTTPClient.new.post(BaseUrl + '/user/login', {
			:username => username,
			:password => password,
		}).content
		return true, self.new(r['user']) if r['status'] == 'ok'
		return false, r
	end

	def subscribe url
		JSON.parse HTTPClient.new.post(BaseUrl + '/subscription/subscribe', {
			:subscription_url => url,
			:user_id => @u['user_id'],
			:token => @u['token'],
		}).content
	end

	def unsubscribe id
		JSON.parse HTTPClient.new.post(BaseUrl + '/subscription/unsubscribe', {
			:subscription_id => id,
			:user_id => @u['user_id'],
			:token => @u['token'],
		}).content
	end

	def list_items
		JSON.parse HTTPClient.new.get(BaseUrl + '/items/list', {
			:user_id => @u['user_id'],
			:token => @u['token'],
		}).content
	end
end
