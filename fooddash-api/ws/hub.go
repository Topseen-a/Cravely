// Package ws pushes real-time updates to browsers over WebSockets.
//
// Clients subscribe to a topic: "order:<id>" for a customer tracking one
// order, or "staff" for the kitchen dashboard. All map mutations and channel
// closes happen in the hub goroutine, so there are no races or double closes.
package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
)

const StaffTopic = "staff"

func OrderTopic(orderID uint) string { return fmt.Sprintf("order:%d", orderID) }

// Message is the envelope sent to clients. Data holds the full order so the
// client can simply replace its copy.
type Message struct {
	Event string `json:"event"` // order.created, order.updated
	Data  any    `json:"data"`
}

type broadcast struct {
	topic string
	data  []byte
}

type Hub struct {
	topics     map[string]map[*Client]struct{}
	register   chan *Client
	unregister chan *Client
	broadcast  chan broadcast
	done       chan struct{}
}

func NewHub() *Hub {
	return &Hub{
		topics:     make(map[string]map[*Client]struct{}),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan broadcast, 256),
		done:       make(chan struct{}),
	}
}

// Run processes hub events until ctx is cancelled.
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			close(h.done)
			for _, clients := range h.topics {
				for c := range clients {
					close(c.send)
				}
			}
			h.topics = map[string]map[*Client]struct{}{}
			return

		case c := <-h.register:
			if h.topics[c.topic] == nil {
				h.topics[c.topic] = make(map[*Client]struct{})
			}
			h.topics[c.topic][c] = struct{}{}

		case c := <-h.unregister:
			h.remove(c)

		case b := <-h.broadcast:
			for c := range h.topics[b.topic] {
				select {
				case c.send <- b.data:
				default:
					// Client is too slow to keep up; drop it.
					h.remove(c)
				}
			}
		}
	}
}

func (h *Hub) remove(c *Client) {
	clients := h.topics[c.topic]
	if _, ok := clients[c]; !ok {
		return
	}
	delete(clients, c)
	close(c.send)
	if len(clients) == 0 {
		delete(h.topics, c.topic)
	}
}

// Publish sends msg to every client subscribed to topic. It never blocks the
// caller for long: if the hub is overloaded the message is dropped, and
// clients will catch up on their next REST fetch.
func (h *Hub) Publish(topic string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("ws: marshal message", "err", err)
		return
	}
	select {
	case h.broadcast <- broadcast{topic: topic, data: data}:
	default:
		slog.Warn("ws: broadcast queue full, dropping message", "topic", topic)
	}
}
