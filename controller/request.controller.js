import analyzeRefundRequest from "../ai/ai-service.js";
import Customer from "../models/customer.js";
import Order from "../models/orders.js";
import AppError from "../utils/app-error.js";
import catchAsync from "../utils/catch-async.js";
import RefundRequest from "../models/requests.js";
import OrderItems from "../models/order-items.js";

const refundCategories = [
  "damaged_item",
  "incorrect_item",
  "missing_item",
  "defective_item",
  "not_as_described",
  "wrong_quantity",
  "late_delivery",
  "changed_mind",
  "duplicate_order",
  "unauthorized_order",
  "other",
];

export const requestRefund = catchAsync(async (req, res, next) => {
  const { orderId, category, reason } = req.body;

  if (!orderId) return next(new AppError("order ID is required", 400));
  if (!category) return next(new AppError("category is required", 400));
  if (!reason) return next(new AppError("reason is required", 400));

  if (!refundCategories.includes(category)) {
    return next(new AppError("Invalid refund category", 400));
  }

  const order = await Order.findOne({ orderNumber: orderId })
    .populate("customerId")
    .populate("items");

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  const existingRequest = await RefundRequest.findOne({
    orderId: order._id,
  });

  const eligibleItems = order.items.filter((item) => !item.isFinalSale);
  const ineligibleItems = order.items.filter((item) => item.isFinalSale);

  const refundableAmount = eligibleItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );

  const policy = {
    eligible: false,
    requiresReview: false,
    escalate: false,
    reasons: [],
    refundableItems: eligibleItems,
    ineligibleItems,
  };

  if (existingRequest) {
    policy.escalate = true;
    policy.reasons.push("A refund request already exists for this order.");
  }

  if (order.orderedAt) {
    const orderAge = Date.now() - new Date(order.orderedAt).getTime();

    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (orderAge > thirtyDays) {
      policy.reasons.push(
        "Orders older than 30 days are not eligible for refund.",
      );
    } else {
      policy.eligible = true;
    }
  }

  if (ineligibleItems.length === order.items.length) {
    policy.eligible = false;
    policy.reasons.push("All items in this order are final sale items.");
  }

  if (refundableAmount > 500) {
    policy.requiresReview = true;
    policy.reasons.push("Refunds above $500 require human review.");
  }

  if (
    ["damaged_item", "incorrect_item"].includes(category) &&
    eligibleItems.length > 0
  ) {
    policy.eligible = false;
    policy.requiresReview = false;
    policy.reasons.push(
      "Damaged or incorrect items does not qualify for a refund.",
    );
  }

  if (existingRequest) {
    policy.eligible = false;
  }

  const aiAnalysis = await analyzeRefundRequest({
    customer: order.customerId,
    order,
    items: order.items,
    category,
    message: reason,
    policyResult: policy,
  });

  const refundRequest = await RefundRequest.create({
    customerId: order.customerId._id,
    orderId: order._id,
    message: reason,
    status:
      policy.eligible && !policy.requiresReview
        ? "approved"
        : policy.eligible && policy.requiresReview
          ? "escalated"
          : !policy.eligible
            ? "denied"
            : "processing",
    amount: refundableAmount,
    policyResult: policy,
    aiAnalysis,
  });

  return res.status(201).json({
    data: refundRequest,
  });
});

export const listRequests = catchAsync(async (req, res) => {
  const requests = await RefundRequest.find()
    .populate({
      path: "orderId",
      populate: {
        path: "items",
        model: "OrderItem",
      },
    })
    .populate("customerId")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    data: requests,
  });
});

export const updateRequest = catchAsync(async (req, res, next) => {
  const requestId = req.body.requestId;
  const status = req.body.status;

  if (!["approve", "deny"].includes(status))
    return next(new AppError("invalid request status"));

  if (!requestId) return next(new AppError("request id is required"));

  const request = await RefundRequest.findById(requestId)
    .populate({
      path: "orderId",
      populate: {
        path: "items",
        model: "OrderItem",
      },
    })
    .populate("customerId");
  if (!request) return next(new AppError("request not found", 404));

  if (status === "approve") {
    request.status = "approved";
  } else {
    request.status = "denied";
  }

  request.resolvedAt = new Date();
  await request.save();

  const requests = await RefundRequest.find()
    .populate({
      path: "orderId",
      populate: {
        path: "items",
        model: "OrderItem",
      },
    })
    .populate("customerId")
    .sort({ createdAt: -1 });
  return res.status(200).json({
    data: requests,
  });
});

export const overview = catchAsync(async (req, res) => {
  const [total, approved, denied, escalated, recentRequests] =
    await Promise.all([
      RefundRequest.countDocuments(),
      RefundRequest.countDocuments({ status: "approved" }),
      RefundRequest.countDocuments({ status: "denied" }),
      RefundRequest.countDocuments({ status: "escalated" }),
      RefundRequest.find()
        .populate({
          path: "orderId",
          populate: {
            path: "items",
            model: "OrderItem",
          },
        })
        .populate("customerId")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

  return res.status(200).json({
    data: {
      stats: {
        total,
        approved,
        denied,
        escalated,
      },
      recentRequests,
    },
  });
});
