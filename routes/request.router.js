import express from "express";
import {
  listRequests,
  overview,
  requestRefund,
  updateRequest,
} from "../controller/request.controller.js";
import { listOrders } from "../controller/order.controller.js";

const router = express.Router();

router.get("/", listRequests);
router.post("/", requestRefund);
router.post("/update", updateRequest);
router.get("/orders", listOrders);
router.get("/overview", overview);

export default router;
