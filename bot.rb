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

require File.expand_path './subscription'
require File.expand_path 'user'

class Bot
	def self.fetcher r
		Subscription.update_scheduled r
	end

	def self.publisher r, wait=true
		if wait
			feed = r.brpoplpush 'feed_update', 'feed_updating', 0
		else
			feed = r.rpoplpush 'feed_update', 'feed_updating'
		end
		return if !feed
		tmp = 'tmp_' + (r.incr 'tmp').to_s
		r.sunionstore tmp, 'subscription:' + feed + ':users'
		while user = r.spop(tmp)
			while 1
				r.watch 'user:' + user.to_s + ':subscription:' + feed + ':max_item'
				max_item = r.get('user:' + user.to_s + ':subscription:' + feed + ':max_item').to_i
				min_score = r.zscore('subscription:' + feed + ':items', max_item).to_i - 1
				items = r.zrangebyscore 'subscription:' + feed + ':items', min_score-1, '+inf', {:withscores => 1}

				newmax_item = max_item
				result = r.multi {
					(items.count / 2).times {|t|
						if (items[t * 2].to_i > max_item)
							r.zadd 'user:' + user + ':items', items[t * 2 + 1], items[t * 2]
							r.zadd 'user:' + user + ':unread', items[t * 2 + 1], items[t * 2]
							newmax_item = items[t * 2].to_i if items[t * 2].to_i > newmax_item
							# TODO: can user read an item between line zrangebyscore and here?
						end
					}
				}
				break if result != nil
			end
		end
		r.lrem 'feed_updating', 0, feed
	end
end
