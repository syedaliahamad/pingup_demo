const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Group = require("./models/groups.js");
const Message = require("./models/message.js");
const authRoutes = require("./routes/auth");
const verifyToken = require("./middleware/auth.js");
const User = require("./models/users.js");
const groups = require("./models/groups.js");
const Gmessage=require("./models/groupMessage.js")
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// store online users
const users = {};

app.use("/auth", authRoutes);

io.on("connection", async (socket) => {
  console.log("User connected");

  const token = socket.handshake.auth.token;
  const userData = verifyToken(token);

  if (!userData) {
    console.log("Invalid Token");
    socket.disconnect();
    return;
  }

  const username = userData.username;
  socket.username = username;

  // fetch user from DB
  const dbUser = await User.findOne({ username });

  if (!dbUser) {
    console.log("User not found in DB");
    socket.disconnect();
    return;
  }

  // store user
  users[username] = {
    socketId: socket.id,
    uid: dbUser.uid,
  };

  // send own info
  socket.emit("me", {
    username,
    uid: dbUser.uid,
  });

  // ================= GET MY CHATS =================
  socket.on("get_my_chats", async (uid) => {
    try {
      const messages = await Message.find({
        $or: [
          { from: username },
          { to: username },
        ],
      });

      const chatUsers = new Set();

      messages.forEach((msg) => {
        if (msg.from === username) {
          chatUsers.add(msg.to);
        } else {
          chatUsers.add(msg.from);
        }
      });
      // console.log(uid);
      const Ygroup = await Group.find({
  members: uid
});
      
      socket.emit("my_chats", {users: Array.from(chatUsers),
  DBgroups: Ygroup});
    } catch (err) {
      console.log(err);
    }
  });

  // ================= SEARCH USER BY UID =================
  socket.on("search_user", async (uid) => {
    try {
      const foundUser = await User.findOne({ uid });

      if (!foundUser) {
        socket.emit("search_result", { found: false });
      } else {
        socket.emit("search_result", {
          found: true,
          user: {
            username: foundUser.username,
            uid: foundUser.uid,
          },
        });
      }
    } catch (err) {
      console.log(err);
      socket.emit("search_result", { found: false });
    }
  });

  socket.on("search_user1", async (uid) => {
    try {
      const foundUser = await User.findOne({ uid });

      if (!foundUser) {
        socket.emit("search_result1", { found: false });
      } else {
        socket.emit("search_result1", {
          found: true,
          user: {
            username: foundUser.username,
            uid: foundUser.uid,
          },
        });
      }
    } catch (err) {
      console.log(err);
      socket.emit("search_result1", { found: false });
    }
  });

  // ================= PRIVATE MESSAGE =================
  socket.on("private_message", async ({ to, message }) => {
    const from = socket.username;
    const room = getRoom(from, to);

    socket.join(room);

    try {
      await Message.create({
        from,
        to,
        message,
        time: new Date(),
      });

      io.to(room).emit("receive_message", {
        from,
        to,
        message,
      });
    } catch (err) {
      console.log(err);
    }
  });
    // ================= Group MESSAGE =================
socket.on("Gr_message",async({gr,message})=>{
  const Gname=gr.groupName;
  const from=socket.username;
  const Gid=gr._id.toString();
  //console.log(guid)
socket.join(Gid)
try{
  await Gmessage.create({
    from,
    Gname,
    Gid,
    message,
    time: new Date(),
  });
  io.to(Gid).emit("receive_message",{
    from,
    message,
  })

} 
catch(err){
  console.log(err);
} 
})

  // ================= LOAD MESSAGES =================
  socket.on("load_messages", async (otherUser) => {
    const myName = socket.username;
    const room = getRoom(myName, otherUser);

    socket.join(room);

    try {
      const messages = await Message.find({
        $or: [
          { from: myName, to: otherUser },
          { from: otherUser, to: myName },
        ],
      }).sort({ time: 1 });

      socket.emit("chat_history", messages);
    } catch (err) {
      console.log(err);
    }
  });
  // ================= LOAD GmESSAGES =================
  socket.on("load_Gmessages", async (gr) => {
    const myName = socket.username;
    const room = gr._id.toString();
    const grid=gr._id;
    socket.join(room);

    try {
      const messages = await Gmessage.find({
         Gid:room,
      }).sort({ time: 1 });
      console.log(messages)
      socket.emit("chat_history", messages);
    } catch (err) {
      console.log(err);
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.username);

    delete users[socket.username];
  });

  // ================= ROOM HELPER =================
  function getRoom(user1, user2) {
    return [user1, user2].sort().join("_");
  }


  socket.on("Cgroup",async (data)=>{
    try {
      
      await Group.create({
    groupName: data.groupName,
    members: data.members,
    createdBy: data.createdBy
  });

    } catch (err) {
      console.log(err);
    }
  })

});

// ================= DB CONNECTION =================
mongoose
  .connect("mongodb://localhost:27017/PingUp_DB")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// ================= SERVER START =================
server.listen(5000, () => {
  console.log("Server running on port 5000");
});