package middleware

import (
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimit allows each client IP `burst` requests at once, refilling at
// `perMinute` requests per minute. Used on login/registration to slow down
// password guessing. State is in memory, so it is per API instance.
func RateLimit(perMinute float64, burst int) gin.HandlerFunc {
	var (
		mu       sync.Mutex
		visitors = map[string]*visitor{}
		every    = rate.Limit(perMinute / 60)
	)

	go func() {
		for range time.Tick(5 * time.Minute) {
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > 15*time.Minute {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		mu.Lock()
		v, ok := visitors[ip]
		if !ok {
			v = &visitor{limiter: rate.NewLimiter(every, burst)}
			visitors[ip] = v
		}
		v.lastSeen = time.Now()
		r := v.limiter.Reserve()
		mu.Unlock()

		if delay := r.Delay(); delay > 0 {
			r.Cancel()
			c.Header("Retry-After", strconv.Itoa(int(math.Ceil(delay.Seconds()))))
			abort(c, http.StatusTooManyRequests, "Too many attempts. Please wait a moment and try again.")
			return
		}
		c.Next()
	}
}
