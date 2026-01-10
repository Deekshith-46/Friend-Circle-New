const socketIO = require('socket.io');
const Message = require('./models/chat/Message');
const ChatRoom = require('./models/chat/ChatRoom');
const { setIO } = require('./socketInstance');

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*'
    }
  });
  
  setIO(io); // Store the io instance globally

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle authentication
    socket.on('authenticate', async (token) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch user from database to confirm user type (security hardening)
        const FemaleUser = require('./models/femaleUser/FemaleUser');
        const MaleUser = require('./models/maleUser/MaleUser');
        const AdminUser = require('./models/admin/AdminUser');
        const AgencyUser = require('./models/agency/AgencyUser');
        
        let user;
        let userType;
        
        // Try to find user in different collections
        user = await FemaleUser.findById(decoded.id);
        if (user) {
          userType = 'female';
        } else {
          user = await MaleUser.findById(decoded.id);
          if (user) {
            userType = 'male';
          } else {
            user = await AdminUser.findById(decoded.id);
            if (user) {
              userType = 'admin';
            } else {
              user = await AgencyUser.findById(decoded.id);
              if (user) {
                userType = 'agency';
              }
            }
          }
        }
        
        if (!user) {
          throw new Error('User not found');
        }
        
        socket.userId = decoded.id;
        socket.userType = userType;
        
        socket.emit('authenticated', { success: true });
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication_error', { message: 'Invalid token' });
        socket.disconnect();
      }
    });

    // Join chat room
    socket.on('joinRoom', (roomId) => {
      if (!socket.userId || !socket.userType) {
        socket.emit('error', { message: 'Authentication required before joining room' });
        return;
      }
      socket.join(roomId);
      console.log(`User ${socket.id} (type: ${socket.userType}) joined room ${roomId}`);
    });

    // Send message
    socket.on('sendMessage', async (data) => {
      try {
        const {
          roomId,
          type,
          content
        } = data;

        // Use authenticated socket user instead of client-provided values
        const senderId = socket.userId;
        const senderType = socket.userType;

        if (!senderId || !senderType) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const room = await ChatRoom.findOne({
          _id: roomId,
          'participants.userId': senderId
        });

        if (!room) {
          socket.emit('error', { message: 'Chat room not found or unauthorized' });
          return;
        }

        let expireAt = null;
        if (room.isDisappearing) {
          expireAt = new Date(
            Date.now() + room.disappearingAfterHours * 60 * 60 * 1000
          );
        }

        const message = await Message.create({
          chatRoomId: roomId,
          senderId,
          senderType,
          type,
          content,
          expireAt
        });

        // Update last message
        room.lastMessage = content;
        room.lastMessageAt = new Date();
        await room.save();

        // Emit message to room
        io.to(roomId).emit('newMessage', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark message as read (supports both single and bulk)
    socket.on('markAsRead', async (data) => {
      try {
        const {
          roomId,
          messageIds
        } = data;

        // Handle both single messageId (backward compatibility) and array of messageIds
        let idsToProcess = [];
        if (messageIds) {
          idsToProcess = Array.isArray(messageIds) ? messageIds : [messageIds];
        } else if (data.messageId) {
          // Check if messageId is an array or single value
          idsToProcess = Array.isArray(data.messageId) ? data.messageId : [data.messageId];
        }
        
        if (!idsToProcess || idsToProcess.length === 0) {
          socket.emit('error', { message: 'messageIds array is required' });
          return;
        }

        // Use authenticated socket user instead of client-provided values
        const userId = socket.userId;
        const userType = socket.userType;

        if (!userId || !userType) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const room = await ChatRoom.findOne({
          _id: roomId,
          'participants.userId': userId
        });

        if (!room) {
          socket.emit('error', { message: 'Chat room not found or unauthorized' });
          return;
        }

        // Find messages that belong to the room, sent by other users, and not already read by this user
        const messages = await Message.find({
          _id: { $in: idsToProcess },
          chatRoomId: roomId,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId }
        });

        if (messages.length > 0) {
          // Update all messages with read status
          for (const message of messages) {
            await Message.findByIdAndUpdate(
              message._id,
              { 
                $push: { 
                  readBy: { 
                    userId: userId, 
                    userType: userType, 
                    readAt: new Date() 
                  } 
                }
              },
              { new: true }
            );
          }

          // Update the room's last read time for this user
          // Remove old entry first to avoid conflicts
          await ChatRoom.updateOne(
            { _id: roomId },
            { $pull: { lastReadBy: { userId: userId } } }
          );
          
          // Add new entry
          await ChatRoom.updateOne(
            { _id: roomId },
            { 
              $push: { 
                lastReadBy: { 
                  userId: userId, 
                  userType: userType, 
                  lastReadAt: new Date() 
                } 
              }
            }
          );

          // Emit read receipt to room (supporting bulk)
          io.to(roomId).emit('messageRead', {
            roomId,
            messageIds: messages.map(m => m._id.toString()),
            readerId: userId,
            readerType: userType,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};