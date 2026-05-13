import { config } from "./config";
import app from "./app";
import { initDB } from "./config/db";
import { initAttendanceCron } from "./cron/attendanceCron";

const PORT = config.port || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    initAttendanceCron();
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
