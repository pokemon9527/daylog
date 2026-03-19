package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Client WebSocket 客户端
type Client struct {
	ID     string
	UserID string
	PageID string
	Conn   *websocket.Conn
	Send   chan []byte
}

// Hub WebSocket 连接管理中心
type Hub struct {
	// 页面 ID -> 客户端集合
	rooms map[string]map[*Client]bool

	// 注册请求
	register chan *Client

	// 注销请求
	unregister chan *Client

	// 广播消息
	broadcast chan *BroadcastMessage

	mu sync.RWMutex
}

// BroadcastMessage 广播消息
type BroadcastMessage struct {
	PageID  string
	Message []byte
	Sender  *Client
}

// WSMessage WebSocket 消息结构
type WSMessage struct {
	Type     string          `json:"type"`
	PageID   string          `json:"page_id"`
	UserID   string          `json:"user_id"`
	ClientID string          `json:"client_id"`
	Data     json.RawMessage `json:"data"`
}

// NewHub 创建 Hub
func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
	}
}

// Run 启动 Hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if _, ok := h.rooms[client.PageID]; !ok {
				h.rooms[client.PageID] = make(map[*Client]bool)
			}
			h.rooms[client.PageID][client] = true
			h.mu.Unlock()
			log.Printf("客户端 %s 加入页面 %s", client.ID, client.PageID)

			// 通知房间内其他用户
			h.notifyPresence(client.PageID, "user_joined", client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if room, ok := h.rooms[client.PageID]; ok {
				if _, ok := room[client]; ok {
					delete(room, client)
					close(client.Send)
					if len(room) == 0 {
						delete(h.rooms, client.PageID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("客户端 %s 离开页面 %s", client.ID, client.PageID)

			// 通知房间内其他用户
			h.notifyPresence(client.PageID, "user_left", client.UserID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			if room, ok := h.rooms[msg.PageID]; ok {
				for client := range room {
					if client != msg.Sender {
						select {
						case client.Send <- msg.Message:
						default:
							close(client.Send)
							delete(room, client)
						}
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Register 注册客户端
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister 注销客户端
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Broadcast 广播消息
func (h *Hub) Broadcast(msg *BroadcastMessage) {
	h.broadcast <- msg
}

// GetRoomUsers 获取房间内在线用户
func (h *Hub) GetRoomUsers(pageID string) []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var users []string
	seen := make(map[string]bool)

	if room, ok := h.rooms[pageID]; ok {
		for client := range room {
			if !seen[client.UserID] {
				users = append(users, client.UserID)
				seen[client.UserID] = true
			}
		}
	}
	return users
}

// notifyPresence 通知在线状态变化
func (h *Hub) notifyPresence(pageID, msgType, userID string) {
	msg := WSMessage{
		Type:   msgType,
		PageID: pageID,
		UserID: userID,
	}
	data, _ := json.Marshal(msg)

	h.mu.RLock()
	defer h.mu.RUnlock()

	if room, ok := h.rooms[pageID]; ok {
		for client := range room {
			select {
			case client.Send <- data:
			default:
				close(client.Send)
				delete(room, client)
			}
		}
	}
}
