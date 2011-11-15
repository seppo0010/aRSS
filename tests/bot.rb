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
require 'bot'
require 'tests/support/user'
require 'fileutils'
require 'redis'

s, user = User.signup 'a', '1'
s, user = User.login 'a', '1' unless s
p "Unable to login/signup" unless s

FileUtils.cp 'tests/sample1.rss', 'public/sample.rss'
user.subscribe BaseUrl + 'sample.rss'
FileUtils.cp 'tests/sample2.rss', 'public/sample.rss'
abort 'Wrong number of items on the user list (expecting 2, got ' + user.list_items.count.to_s + ')' unless user.list_items.count == 2
$r = Redis.new(:host => RedisHost, :port => RedisPort) if !$r
subscription_id = $r.hget "subscription:url", BaseUrl + 'sample.rss'
$r.zadd "subscription:next_update", Time.now.to_i, "1"
Bot.fetcher $r
Bot.publisher $r, false
abort 'Wrong number of items on the user list (expecting 3, got ' + user.list_items.count.to_s + ')' unless user.list_items.count == 3
