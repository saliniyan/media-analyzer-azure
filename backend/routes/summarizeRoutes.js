// routes/summarizeRoutes.js
import express from "express";
import { getSummary } from "../controllers/summarizeController.js";

const router = express.Router();
router.post("/summarize", getSummary);
export default router;
