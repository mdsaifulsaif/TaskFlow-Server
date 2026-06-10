import { config } from "./config";
import { createServer } from "http"; 
import { Server } from "socket.io";
import app from "./app";
import { initDB } from "./config/db";
import { initAttendanceCron } from "./cron/attendanceCron";

const PORT = config.port || 5000;
// ১. এক্সপ্রেস অ্যাপ দিয়ে HTTP সার্ভার তৈরি
const httpServer = createServer(app);

// ২. সকেটের CORS পলিসি পুরোপুরি ওপেন করা (যাতে Next.js ব্লক না খায়)
const io = new Server(httpServer, {
  cors: {
    origin: "*", // লোকালহোস্টের সব পোর্টকে পারমিশন দেওয়া হলো
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ৩. এক্সপ্রেসের গ্লোবাল অবজেক্টে সকেট সেট করা
app.set("io", io);

// ফ্রন্টএন্ড কানেক্ট হলে ব্যাকএন্ডের টার্মিনালে এই লগটি আসবে
io.on("connection", (socket: any) => {
  console.log(`🔌 Success: A user connected to Socket! ID: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(" User disconnected from Socket");
  });
});

// initDB().then(() => {
//   app.listen(PORT, () => {
//     initAttendanceCron();
//     console.log(`🚀 Server running on port ${PORT}`);
//   });
// });


// এই অংশটুকু আপনার ফাইলের নিচে এভাবে আপডেট করুন:

initDB().then(() => {
  // 🎯 এখানে 'app.listen' এর বদলে অবশ্যই 'httpServer.listen' হতে হবে
  httpServer.listen(PORT, () => {
    initAttendanceCron();
    console.log(`🚀 Server running on port ${PORT}`);
  });
});