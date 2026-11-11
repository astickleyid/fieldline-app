import { redis } from './redis';
import { AuthStore, CHALLENGE_SECONDS, Challenge, MAX_ATTEMPTS } from './auth-core';

// Redis scripts make attempt limits and single-use consumption atomic across instances.
export const CONSUME_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return false end
local item = cjson.decode(raw)
if item.expiresAt <= tonumber(ARGV[2]) or item.attempts >= tonumber(ARGV[3]) then
  redis.call('DEL', KEYS[1]); return false
end
if item.digest ~= ARGV[1] then
  item.attempts = item.attempts + 1
  if item.attempts >= tonumber(ARGV[3]) then redis.call('DEL', KEYS[1])
  else redis.call('SET', KEYS[1], cjson.encode(item), 'KEEPTTL') end
  return false
end
redis.call('DEL', KEYS[1])
return raw
`;
export const LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;
export const authStore: AuthStore = {
  async put(id, challenge) { await redis.set(`auth:v2:challenge:${id}`, challenge, { ex: CHALLENGE_SECONDS }); },
  async remove(id) { await redis.del(`auth:v2:challenge:${id}`); },
  async consume(id, digest, now) {
    const result = await redis.eval(CONSUME_SCRIPT, [`auth:v2:challenge:${id}`], [digest, now, MAX_ATTEMPTS]);
    return result ? (typeof result === 'string' ? JSON.parse(result) : result) as Challenge : null;
  },
  async limit(key, maximum, seconds) {
    const count = await redis.eval<unknown[], number>(LIMIT_SCRIPT, [`auth:v2:limit:${key}`], [seconds]);
    return count <= maximum;
  },
};
