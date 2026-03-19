package ws

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 开发阶段允许所有来源
	},
}

// HandleWebSocket WebSocket 连接处理
func HandleWebSocket(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		pageID := c.Query("page_id")
		userID := c.GetString("user_id")
		clientID := c.Query("client_id")

		if pageID == "" || userID == "" || clientID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要参数"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket 升级失败: %v", err)
			return
		}

		client := &Client{
			ID:     clientID,
			UserID: userID,
			PageID: pageID,
			Conn:   conn,
			Send:   make(chan []byte, 256),
		}

		hub.Register(client)

		go writePump(client)
		go readPump(hub, client)
	}
}

// readPump 读取消息
func readPump(hub *Hub, client *Client) {
	defer func() {
		hub.Unregister(client)
		client.Conn.Close()
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("WebSocket 读取错误: %v", err)
			}
			break
		}

		// 广播消息到同页面的其他客户端
		hub.Broadcast(&BroadcastMessage{
			PageID:  client.PageID,
			Message: message,
			Sender:  client,
		})
	}
}

// writePump 写入消息
func writePump(client *Client) {
	defer client.Conn.Close()

	for message := range client.Send {
		if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("WebSocket 写入错误: %v", err)
			break
		}
	}
}
