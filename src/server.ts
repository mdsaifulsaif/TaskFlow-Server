import { config } from "./config";
import app from "./app";
import { initDB } from "./config/db"; 

const PORT = config.port || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});