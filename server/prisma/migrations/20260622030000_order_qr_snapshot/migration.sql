-- Add immutable payment QR snapshot fields to each order.
ALTER TABLE "Order" ADD COLUMN "paymentQrImageBase64" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentQrLabel" TEXT;
