# Hướng dẫn tích hợp WebSocket cho Admin Panel (React + Vite)

## Tổng quan

Backend đã được cấu hình để gửi realtime updates qua WebSocket khi:
1. Driver scan QR code để pickup → Status cập nhật thành `in_progress`
2. Driver hoàn thành drop-off và upload ảnh → Status cập nhật thành `completed`

## Bước 1: Cài đặt Socket.IO Client

```bash
npm install socket.io-client
```

## Bước 2: Cài đặt thư viện notification (Optional)

```bash
npm install react-toastify
```

## Bước 3: Tạo WebSocket Service

Tạo file `src/services/websocket.js`:

```javascript
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket = null;

/**
 * Initialize WebSocket connection
 * @returns {Socket} Socket instance
 */
export const initializeWebSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server:', socket.id);
      // Join admin room to receive booking updates
      socket.emit('join-admin');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to WebSocket server after', attemptNumber, 'attempts');
      socket.emit('join-admin');
    });
  }

  return socket;
};

/**
 * Get existing socket instance or create new one
 * @returns {Socket} Socket instance
 */
export const getSocket = () => {
  if (!socket) {
    return initializeWebSocket();
  }
  return socket;
};

/**
 * Disconnect from WebSocket server
 */
export const disconnectWebSocket = () => {
  if (socket) {
    socket.emit('leave-admin');
    socket.disconnect();
    socket = null;
    console.log('👋 Disconnected from WebSocket server');
  }
};
```

## Bước 4: Tạo Custom Hook

Tạo file `src/hooks/useWebSocket.js`:

```javascript
import { useEffect, useCallback } from 'react';
import { getSocket } from '../services/websocket';

/**
 * Custom hook for WebSocket events
 * @returns {Object} WebSocket event handlers
 */
export const useWebSocket = () => {
  const socket = getSocket();

  /**
   * Listen for booking picked up events
   * @param {Function} callback - Callback function to handle the event
   * @returns {Function} Cleanup function
   */
  const onBookingPickedUp = useCallback((callback) => {
    socket.on('booking:picked-up', callback);

    // Return cleanup function
    return () => {
      socket.off('booking:picked-up', callback);
    };
  }, [socket]);

  /**
   * Listen for booking completed events
   * @param {Function} callback - Callback function to handle the event
   * @returns {Function} Cleanup function
   */
  const onBookingCompleted = useCallback((callback) => {
    socket.on('booking:completed', callback);

    return () => {
      socket.off('booking:completed', callback);
    };
  }, [socket]);

  /**
   * Listen for general booking update events
   * @param {Function} callback - Callback function to handle the event
   * @returns {Function} Cleanup function
   */
  const onBookingUpdate = useCallback((callback) => {
    socket.on('booking:update', callback);

    return () => {
      socket.off('booking:update', callback);
    };
  }, [socket]);

  return {
    socket,
    onBookingPickedUp,
    onBookingCompleted,
    onBookingUpdate
  };
};
```

## Bước 5: Tích hợp vào App Component

Cập nhật file `src/App.jsx`:

```javascript
import { useEffect } from 'react';
import { initializeWebSocket, disconnectWebSocket } from './services/websocket';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useEffect(() => {
    // Initialize WebSocket when app mounts
    const socket = initializeWebSocket();

    // Cleanup when app unmounts
    return () => {
      disconnectWebSocket();
    };
  }, []);

  return (
    <>
      {/* Your routes and components */}
      <YourRoutes />

      {/* Toast notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

export default App;
```

## Bước 6: Sử dụng trong Booking List Component

Tạo hoặc cập nhật file `src/pages/BookingList.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'react-toastify';

function BookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { onBookingPickedUp, onBookingCompleted, onBookingUpdate } = useWebSocket();

  // Fetch initial bookings
  useEffect(() => {
    fetchBookings();
  }, []);

  // Listen for realtime updates
  useEffect(() => {
    // Event 1: When driver picks up booking
    const cleanupPickedUp = onBookingPickedUp((data) => {
      console.log('📦 Booking picked up:', data);

      // Update booking in state
      setBookings(prev => prev.map(booking =>
        booking._id === data.bookingId
          ? {
              ...booking,
              status: 'in_progress',
              pickedUpAt: data.pickedUpAt,
              isPickedUp: true
            }
          : booking
      ));

      // Show success notification
      toast.success(`Booking #${data.bookingId.slice(-6)} has been picked up! 📦`, {
        icon: '📦'
      });
    });

    // Event 2: When driver completes drop-off
    const cleanupCompleted = onBookingCompleted((data) => {
      console.log('✅ Booking completed:', data);

      // Update booking in state
      setBookings(prev => prev.map(booking =>
        booking._id === data.bookingId
          ? {
              ...booking,
              status: 'completed',
              completedAt: data.completedAt,
              completionImages: data.completionImages
            }
          : booking
      ));

      // Show success notification
      toast.success(`Booking #${data.bookingId.slice(-6)} has been completed! ✅`, {
        icon: '✅'
      });

      // Optional: Play notification sound
      playNotificationSound();
    });

    // Event 3: General booking updates (optional)
    const cleanupUpdate = onBookingUpdate((data) => {
      console.log('🔄 Booking updated:', data);

      if (data.action === 'created') {
        // Add new booking to the top of the list
        setBookings(prev => [data.booking, ...prev]);
        toast.info('New booking created! 🆕');
      } else if (data.action === 'assigned') {
        // Update booking when driver is assigned
        setBookings(prev => prev.map(booking =>
          booking._id === data.bookingId ? data.booking : booking
        ));
        toast.info(`Booking #${data.bookingId.slice(-6)} assigned to driver`);
      }
    });

    // Cleanup all listeners on unmount
    return () => {
      cleanupPickedUp();
      cleanupCompleted();
      cleanupUpdate();
    };
  }, [onBookingPickedUp, onBookingCompleted, onBookingUpdate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');

      const response = await fetch('http://localhost:3000/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    // Optional: Play sound for important updates
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
      assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800' },
      in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return <div className="p-4">Loading bookings...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hotel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Driver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  #{booking._id.slice(-6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.fullName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.phoneNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {booking.hotel?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(booking.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {booking.assignedDriver?.name || 'Not assigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-blue-600 hover:text-blue-900">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No bookings found
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingList;
```

## Bước 7: Tạo file Environment Variables

Tạo file `.env` ở root của React project:

```bash
VITE_API_URL=http://localhost:3000
```

Hoặc nếu deploy production:

```bash
VITE_API_URL=https://your-api-domain.com
```

## WebSocket Events Reference

### Events mà Admin Panel nhận được:

#### 1. `booking:picked-up`
Được emit khi driver scan QR code để pickup hành lý.

**Data structure:**
```javascript
{
  bookingId: "507f1f77bcf86cd799439011",
  status: "in_progress",
  pickedUpAt: "2025-12-03T10:30:00.000Z",
  booking: {
    _id: "507f1f77bcf86cd799439011",
    fullName: "Nguyen Van A",
    phoneNumber: "0901234567",
    status: "in_progress",
    isPickedUp: true,
    pickedUpAt: "2025-12-03T10:30:00.000Z",
    hotel: {
      _id: "...",
      name: "Hotel ABC",
      address: "123 Street",
      zone: "District 1"
    },
    assignedDriver: {
      _id: "...",
      name: "Driver Name",
      phone: "0909999999"
    },
    // ... other booking fields
  }
}
```

#### 2. `booking:completed`
Được emit khi driver hoàn thành drop-off và upload ảnh.

**Data structure:**
```javascript
{
  bookingId: "507f1f77bcf86cd799439011",
  status: "completed",
  completedAt: "2025-12-03T11:00:00.000Z",
  completionImages: [
    "uploads/completion-images/1701604800000-image1.jpg",
    "uploads/completion-images/1701604800000-image2.jpg"
  ],
  booking: {
    _id: "507f1f77bcf86cd799439011",
    status: "completed",
    completedAt: "2025-12-03T11:00:00.000Z",
    completionImages: [...],
    // ... other booking fields with populated hotel and driver
  }
}
```

#### 3. `booking:update` (Optional)
General update event cho các thay đổi khác.

**Data structure:**
```javascript
{
  bookingId: "507f1f77bcf86cd799439011",
  action: "created" | "assigned" | "updated",
  booking: {
    // Full booking object
  }
}
```

## Testing WebSocket Connection

### Test 1: Kiểm tra connection trong browser console

Mở DevTools → Console và kiểm tra các log:
```
✅ Connected to WebSocket server: abc123xyz
```

### Test 2: Test với Postman hoặc cURL

Simulate driver picking up:
```bash
curl -X PATCH http://localhost:3000/api/bookings/driver/BOOKING_ID/picked-up \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -H "Content-Type: application/json"
```

Simulate driver completing:
```bash
curl -X PATCH http://localhost:3000/api/bookings/driver/BOOKING_ID/completed \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

Admin panel sẽ nhận được realtime updates!

## Troubleshooting

### Issue 1: WebSocket không kết nối được

**Giải pháp:**
- Kiểm tra CORS settings ở backend
- Kiểm tra VITE_API_URL trong .env
- Kiểm tra browser console để xem error messages
- Thử thêm transport option: `transports: ['websocket', 'polling']`

### Issue 2: Không nhận được events

**Giải pháp:**
- Đảm bảo đã join admin room: `socket.emit('join-admin')`
- Kiểm tra backend logs xem có emit events không
- Kiểm tra event names có đúng không (phải match với backend)

### Issue 3: Memory leaks

**Giải pháp:**
- Luôn cleanup listeners trong useEffect return function
- Disconnect socket khi unmount App component
- Không tạo multiple socket connections

## Best Practices

1. **Reconnection handling**: Socket.IO tự động reconnect, nhưng phải rejoin admin room sau reconnect
2. **Error handling**: Wrap emit/on callbacks trong try-catch
3. **Notification**: Sử dụng toast notifications để thông báo cho user
4. **Sound alerts**: Thêm âm thanh cho events quan trọng
5. **Visual feedback**: Highlight row khi có update mới (animation)
6. **Rate limiting**: Throttle hoặc debounce nếu có quá nhiều updates

## Production Deployment Notes

1. Đảm bảo backend cho phép CORS từ domain của admin panel
2. Sử dụng HTTPS cho production (wss:// instead of ws://)
3. Configure proper environment variables
4. Monitor WebSocket connections và performance
5. Implement reconnection strategies với exponential backoff

## Kết luận

Với hướng dẫn này, admin panel của bạn sẽ nhận được realtime updates khi:
- ✅ Driver scan QR để pickup → Booking status → `in_progress`
- ✅ Driver hoàn thành drop-off → Booking status → `completed`

Không cần refresh trang, mọi thay đổi sẽ được cập nhật tự động!
