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
	def initialize(redis, hash=nil)
		@r = redis
		if hash
			@id = hash["id"]
			@username = hash["username"]
			@password = hash["password"]
		end
	end

	def signup(username, password)
		return nil, "Username already in use" if !@r.setnx('user:' + username, 0)
		@id = @r.incr 'user_id'
		@username = username
		@password = Digest::SHA1.hexdigest(Digest::SHA1.hexdigest(@username) + password);
		@r.hset 'user:username', username, @id
		@r.hmset 'user:' + @id.to_s,
			"password", @password,
			"username", @username,
			"id", @id
		return self
	end

	def self.get(r, username, password)
		id = r.hget 'user:username', username
		return nil, 'Invalid username or password' if !id
		if r.hget('user:' + id.to_s, 'password') == Digest::SHA1.hexdigest(Digest::SHA1.hexdigest(username) + password);
			return self.new r, r.hgetall('user:' + id.to_s)
		else
			return nil, 'Invalid username or password'
		end
	end

	def to_hash
		{ :username => @username, :password => @password, :id => @id }
	end
end
