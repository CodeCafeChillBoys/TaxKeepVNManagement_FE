import * as signalR from '@microsoft/signalr'

const GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_MANAGEMENT_API_URL ||
  'http://localhost:5000'

class SignalRService {
  constructor() {
    this.connection = null
    this.listeners = new Map()
    this.isConnecting = false
  }

  /**
   * Khởi tạo và mở kết nối tới Hub SignalR /hubs/tax-ai
   */
  async startConnection() {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return this.connection
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise((r) => setTimeout(r, 100))
      }
      return this.connection
    }

    this.isConnecting = true

    try {
      // Ưu tiên dùng đường dẫn tương đối '/hubs/tax-ai' để tận dụng Vite proxy (tránh hoàn toàn CORS)
      // hoặc kết nối trực tiếp tới ApiGateway với withCredentials: false
      const hubUrl =
        typeof window !== 'undefined' && window.location?.origin?.includes('5173')
          ? '/hubs/tax-ai'
          : `${GATEWAY_URL}/hubs/tax-ai`

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => {
            const token =
              localStorage.getItem('taxkeep_token') ||
              sessionStorage.getItem('taxkeep_token') ||
              ''
            return token
          },
          withCredentials: false,
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.LongPolling,
          skipNegotiation: false,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
        .configureLogging(signalR.LogLevel.Information)
        .build()

      // Gán lại các listeners đã đăng ký
      this.listeners.forEach((callbacks, eventName) => {
        this.connection.on(eventName, (...args) => {
          callbacks.forEach((cb) => {
            try {
              cb(...args)
            } catch (e) {
              console.error(`[SignalR] Callback error for ${eventName}:`, e)
            }
          })
        })
      })

      this.connection.onclose(() => {})
      this.connection.onreconnecting(() => {})
      this.connection.onreconnected(() => {})

      await this.connection.start()
      return this.connection
    } catch (err) {
      // Fallback: kết nối trực tiếp Gateway với withCredentials: false và WebSockets
      try {
        const fallbackUrl = `${GATEWAY_URL}/hubs/tax-ai`
        this.connection = new signalR.HubConnectionBuilder()
          .withUrl(fallbackUrl, {
            accessTokenFactory: () => {
              return (
                localStorage.getItem('taxkeep_token') ||
                sessionStorage.getItem('taxkeep_token') ||
                ''
              )
            },
            withCredentials: false,
            transport:
              signalR.HttpTransportType.WebSockets |
              signalR.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000])
          .configureLogging(signalR.LogLevel.None)
          .build()

        this.listeners.forEach((callbacks, eventName) => {
          this.connection.on(eventName, (...args) => {
            callbacks.forEach((cb) => {
              try {
                cb(...args)
              } catch {
                // Bỏ qua lỗi callback
              }
            })
          })
        })

        await this.connection.start()
        return this.connection
      } catch (fallbackErr) {
        throw fallbackErr
      }
    } finally {
      this.isConnecting = false
    }
  }

  /**
   * Lắng nghe sự kiện từ Hub
   * @param {string} eventName
   * @param {Function} callback
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set())
    }
    this.listeners.get(eventName).add(callback)

    if (this.connection) {
      this.connection.off(eventName)
      this.connection.on(eventName, (...args) => {
        const cbs = this.listeners.get(eventName)
        if (cbs) {
          cbs.forEach((cb) => {
            try {
              cb(...args)
            } catch (e) {
              console.error(`[SignalR] Callback error for ${eventName}:`, e)
            }
          })
        }
      })
    }
  }

  /**
   * Hủy lắng nghe sự kiện
   * @param {string} eventName
   * @param {Function} [callback]
   */
  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      if (callback) {
        this.listeners.get(eventName).delete(callback)
      } else {
        this.listeners.delete(eventName)
        if (this.connection) {
          this.connection.off(eventName)
        }
      }
    }
  }

  /**
   * Đăng ký nhận kết quả của một tác vụ bóc tách cụ thể
   * @param {string} taskId
   */
  async joinTaskGroup(taskId) {
    if (!taskId) return
    try {
      await this.startConnection()
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        await this.connection.invoke('JoinTaskGroup', taskId)
      }
    } catch {
      // Bỏ qua lỗi gia nhập group
    }
  }

  /**
   * Rời khỏi nhóm theo dõi tác vụ
   * @param {string} taskId
   */
  async leaveTaskGroup(taskId) {
    if (!taskId) return
    try {
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        await this.connection.invoke('LeaveTaskGroup', taskId)
      }
    } catch {
      // Bỏ qua lỗi rời group
    }
  }

  /**
   * Dừng kết nối
   */
  async stopConnection() {
    if (this.connection) {
      try {
        await this.connection.stop()
      } catch {
        // Bỏ qua lỗi ngắt kết nối
      }
    }
  }
}

export const signalrService = new SignalRService()
