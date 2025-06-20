// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import summarizerRoutes from "./routes/summarizeRoutes.js";
import speechRoutes from './routes/speechRoutes.js'; 
import translateRoutes from './routes/translateRoutes.js';

dotenv.config();

const app = express();
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", summarizerRoutes);
app.use('/api', speechRoutes); 
app.use('/api', translateRoutes);

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
