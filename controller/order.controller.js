import catchAsync from "../utils/catch-async.js";
import Order from "../models/orders.js";

export const listOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({});
  console.log(orders);

  return res.status(200).json({
    data: orders,
  });
});
