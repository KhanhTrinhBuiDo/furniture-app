// Vercel Serverless Function entry point
// Vercel tự động nhận diện bất kỳ file .js nào trong thư mục /api làm 1 serverless function.
// File này chỉ import và re-export Express app đã viết sẵn cho serverless (backend/server-vercel.js).
import app from "../backend/server-vercel.js";

export default app;
