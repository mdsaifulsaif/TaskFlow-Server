import { config } from "./config";
import app from "./app";
import "./config/db";

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});