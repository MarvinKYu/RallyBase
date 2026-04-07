import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// 10 confirmation attempts per 10 minutes per player — prevents brute-forcing 4-digit codes
export const confirmCodeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  prefix: "rl:confirm",
});

// 30 submit attempts per minute per player — prevents submission spam
export const submitResultRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:submit",
});
