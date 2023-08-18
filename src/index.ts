import app from "./app"; 
import { config } from "./config/config";

// Cấu hình chạy trên Server
app.set('port', config.port);
app.listen(app.get('port'), () => {
    console.log(`Server is running on port ${config.port}`);
  }); 
 