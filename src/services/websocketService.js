const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 */
const initializeWebSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join admin room for receiving updates
    socket.on('join-admin', () => {
      socket.join('admin-room');
      console.log(`Socket ${socket.id} joined admin-room`);
    });

    // Leave admin room
    socket.on('leave-admin', () => {
      socket.leave('admin-room');
      console.log(`Socket ${socket.id} left admin-room`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeWebSocket first.');
  }
  return io;
};

/**
 * Emit booking pickup event to admin panel
 * @param {Object} booking - Booking object with populated fields
 */
const emitBookingPickedUp = (booking) => {
  try {
    const io = getIO();
    io.to('admin-room').emit('booking:picked-up', {
      bookingId: booking._id,
      status: booking.status,
      pickedUpAt: booking.pickedUpAt,
      booking: booking
    });
    console.log(`📡 Emitted booking:picked-up for booking ${booking._id}`);
  } catch (error) {
    console.error('Error emitting booking picked up event:', error);
  }
};

/**
 * Emit booking completed event to admin panel
 * @param {Object} booking - Booking object with populated fields
 */
const emitBookingCompleted = (booking) => {
  try {
    const io = getIO();
    io.to('admin-room').emit('booking:completed', {
      bookingId: booking._id,
      status: booking.status,
      completedAt: booking.completedAt,
      completionImages: booking.completionImages,
      booking: booking
    });
    console.log(`📡 Emitted booking:completed for booking ${booking._id}`);
  } catch (error) {
    console.error('Error emitting booking completed event:', error);
  }
};

/**
 * Emit general booking update event to admin panel
 * @param {Object} booking - Booking object with populated fields
 * @param {String} action - Action type (e.g., 'created', 'assigned', 'updated')
 */
const emitBookingUpdate = (booking, action = 'updated') => {
  try {
    const io = getIO();
    io.to('admin-room').emit('booking:update', {
      bookingId: booking._id,
      action: action,
      booking: booking
    });
    console.log(`📡 Emitted booking:update (${action}) for booking ${booking._id}`);
  } catch (error) {
    console.error('Error emitting booking update event:', error);
  }
};

module.exports = {
  initializeWebSocket,
  getIO,
  emitBookingPickedUp,
  emitBookingCompleted,
  emitBookingUpdate
};
