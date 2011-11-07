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
require 'subscription'

$r = Redis.new(:host => RedisHost, :port => RedisPort)
while 1
	feed = $r.brpoplpush 'feed_update', 'feed_updating', 0
	tmp = 'tmp_' + ($r.incr 'tmp').to_s
	$r.sunionstore tmp, 'subscription:' + feed + ':users'
	while user = $r.spop(tmp)
		t = $r.zrevrange('user:' + user + ':items', 0, 0, {:withscores => 1}).last.to_i
		items = $r.zrangebyscore 'subscription:' + feed + ':items', t-1, '+inf', {:withscores => 1, :limit => 20}
		if items.count == 40
			$r.sadd user
		end


		$r.multi {
			l = {}
			(items.count / 2).times {|t|
				$r.zadd 'user:' + user + ':items', items[t * 2 + 1], items[t * 2]
				$r.zadd 'user:' + user + ':unread', items[t * 2 + 1], items[t * 2]
				# TODO: can user read an item between line zrangebyscore and here?
			}
		}
	end
	$r.lrem 'feed_updating', 0, feed
end
