"""
Rate limiting module for IMAP connection attempts
Uses in-memory counters with exponential backoff
Lean startup approach: no Redis infrastructure needed
"""

import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class IMAPRateLimiter:
    """
    In-memory rate limiter for IMAP connections
    Implements exponential backoff for failed authentication attempts
    """
    
    def __init__(self):
        self.connection_attempts = defaultdict(list)  # {user_id: [attempt_timestamps]}
        self.failed_attempts = defaultdict(int)  # {user_id: failed_count}
        self.blocked_until = defaultdict(float)  # {user_id: timestamp_when_unblocked}
        self.lock = threading.Lock()
        
        # Rate limiting configuration
        self.max_attempts_per_hour = 60  # 60 IMAP connection attempts per hour per user
        self.max_attempts_per_minute = 10  # 10 attempts per minute per user
        self.max_failed_attempts = 5  # Max failed attempts before exponential backoff
        
        # Exponential backoff configuration (in seconds)
        self.backoff_base = 60  # 1 minute base
        self.backoff_max = 3600  # 1 hour maximum
        
        # Cleanup old entries every 10 minutes
        self.last_cleanup = time.time()
        self.cleanup_interval = 600  # 10 minutes
    
    def _cleanup_old_entries(self):
        """Clean up old entries to prevent memory bloat"""
        current_time = time.time()
        
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        with self.lock:
            # Clean up connection attempts older than 1 hour
            cutoff_time = current_time - 3600
            
            for user_id in list(self.connection_attempts.keys()):
                # Filter out old attempts
                self.connection_attempts[user_id] = [
                    attempt for attempt in self.connection_attempts[user_id]
                    if attempt > cutoff_time
                ]
                
                # Remove empty entries
                if not self.connection_attempts[user_id]:
                    del self.connection_attempts[user_id]
            
            # Clean up expired blocks
            for user_id in list(self.blocked_until.keys()):
                if self.blocked_until[user_id] <= current_time:
                    del self.blocked_until[user_id]
                    # Reset failed attempts when block expires
                    if user_id in self.failed_attempts:
                        del self.failed_attempts[user_id]
            
            self.last_cleanup = current_time
            logger.debug(f"Rate limiter cleanup completed. Active users: {len(self.connection_attempts)}")
    
    def _calculate_backoff_time(self, failed_count: int) -> int:
        """Calculate exponential backoff time based on failed attempts"""
        if failed_count <= self.max_failed_attempts:
            return 0
        
        # Exponential backoff: base * 2^(failed_count - max_failed_attempts)
        excess_failures = failed_count - self.max_failed_attempts
        backoff_time = self.backoff_base * (2 ** min(excess_failures, 6))  # Cap at 2^6 = 64x
        
        return min(backoff_time, self.backoff_max)
    
    def is_rate_limited(self, user_id: str) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Check if user is rate limited
        Returns: (is_limited, reason, retry_after_seconds)
        """
        self._cleanup_old_entries()
        
        current_time = time.time()
        
        with self.lock:
            # Check if user is currently blocked due to failed attempts
            if user_id in self.blocked_until:
                if self.blocked_until[user_id] > current_time:
                    retry_after = int(self.blocked_until[user_id] - current_time)
                    return True, "Too many failed authentication attempts", retry_after
                else:
                    # Block has expired
                    del self.blocked_until[user_id]
                    if user_id in self.failed_attempts:
                        del self.failed_attempts[user_id]
            
            # Get recent attempts for this user
            recent_attempts = self.connection_attempts[user_id]
            
            # Check per-minute rate limit
            minute_ago = current_time - 60
            attempts_last_minute = len([a for a in recent_attempts if a > minute_ago])
            
            if attempts_last_minute >= self.max_attempts_per_minute:
                return True, "Too many connection attempts per minute", 60
            
            # Check per-hour rate limit
            hour_ago = current_time - 3600
            attempts_last_hour = len([a for a in recent_attempts if a > hour_ago])
            
            if attempts_last_hour >= self.max_attempts_per_hour:
                return True, "Too many connection attempts per hour", 3600
            
            return False, None, None
    
    def record_attempt(self, user_id: str, success: bool, config_name: str = "unknown") -> None:
        """
        Record a connection attempt
        Args:
            user_id: User making the attempt
            success: Whether the connection was successful
            config_name: Name of the IMAP config for logging
        """
        current_time = time.time()
        
        with self.lock:
            # Record the attempt
            self.connection_attempts[user_id].append(current_time)
            
            if success:
                # Reset failed attempts on successful connection
                if user_id in self.failed_attempts:
                    failed_count = self.failed_attempts[user_id]
                    del self.failed_attempts[user_id]
                    if failed_count > 0:
                        logger.info(f"User {user_id} successful connection to {config_name} - failed attempts reset")
                
                # Remove any existing block
                if user_id in self.blocked_until:
                    del self.blocked_until[user_id]
            
            else:
                # Increment failed attempts
                self.failed_attempts[user_id] += 1
                failed_count = self.failed_attempts[user_id]
                
                logger.warning(f"Failed IMAP connection for user {user_id} to {config_name} (attempt {failed_count})")
                
                # Apply exponential backoff if needed
                if failed_count > self.max_failed_attempts:
                    backoff_time = self._calculate_backoff_time(failed_count)
                    self.blocked_until[user_id] = current_time + backoff_time
                    
                    logger.warning(
                        f"User {user_id} blocked for {backoff_time} seconds due to {failed_count} failed attempts"
                    )
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get rate limiting stats for a user"""
        self._cleanup_old_entries()
        
        current_time = time.time()
        
        with self.lock:
            recent_attempts = self.connection_attempts.get(user_id, [])
            
            # Calculate attempts in different time windows
            minute_ago = current_time - 60
            hour_ago = current_time - 3600
            
            attempts_last_minute = len([a for a in recent_attempts if a > minute_ago])
            attempts_last_hour = len([a for a in recent_attempts if a > hour_ago])
            
            failed_count = self.failed_attempts.get(user_id, 0)
            
            # Check if blocked
            blocked_until = self.blocked_until.get(user_id, 0)
            is_blocked = blocked_until > current_time
            time_until_unblocked = max(0, int(blocked_until - current_time)) if is_blocked else 0
            
            return {
                "attempts_last_minute": attempts_last_minute,
                "attempts_last_hour": attempts_last_hour,
                "max_attempts_per_minute": self.max_attempts_per_minute,
                "max_attempts_per_hour": self.max_attempts_per_hour,
                "failed_attempts": failed_count,
                "max_failed_attempts": self.max_failed_attempts,
                "is_blocked": is_blocked,
                "time_until_unblocked": time_until_unblocked,
                "remaining_attempts_minute": max(0, self.max_attempts_per_minute - attempts_last_minute),
                "remaining_attempts_hour": max(0, self.max_attempts_per_hour - attempts_last_hour)
            }
    
    def get_global_stats(self) -> Dict[str, Any]:
        """Get global rate limiting statistics"""
        self._cleanup_old_entries()
        
        with self.lock:
            total_users = len(self.connection_attempts)
            blocked_users = len([u for u in self.blocked_until.values() if u > time.time()])
            users_with_failures = len(self.failed_attempts)
            
            # Calculate total attempts in the last hour
            current_time = time.time()
            hour_ago = current_time - 3600
            
            total_attempts_hour = sum(
                len([a for a in attempts if a > hour_ago])
                for attempts in self.connection_attempts.values()
            )
            
            return {
                "total_active_users": total_users,
                "blocked_users": blocked_users,
                "users_with_failures": users_with_failures,
                "total_attempts_last_hour": total_attempts_hour,
                "cleanup_last_run": datetime.fromtimestamp(self.last_cleanup).isoformat()
            }
    
    def reset_user_limits(self, user_id: str) -> bool:
        """
        Reset rate limits for a specific user (admin function)
        Returns: True if user had limits to reset
        """
        with self.lock:
            had_limits = False
            
            if user_id in self.connection_attempts:
                del self.connection_attempts[user_id]
                had_limits = True
            
            if user_id in self.failed_attempts:
                del self.failed_attempts[user_id]
                had_limits = True
            
            if user_id in self.blocked_until:
                del self.blocked_until[user_id]
                had_limits = True
            
            if had_limits:
                logger.info(f"Rate limits reset for user {user_id}")
            
            return had_limits

# Global rate limiter instance
_rate_limiter_instance = None

def get_imap_rate_limiter() -> IMAPRateLimiter:
    """Get singleton rate limiter instance"""
    global _rate_limiter_instance
    if _rate_limiter_instance is None:
        _rate_limiter_instance = IMAPRateLimiter()
    return _rate_limiter_instance 