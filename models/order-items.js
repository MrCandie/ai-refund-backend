import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    // orderId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Order",
    //   required: true,
    // },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    isFinalSale: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("OrderItem", orderItemSchema);
