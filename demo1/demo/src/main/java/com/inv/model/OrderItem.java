package com.inv.model;

import java.math.BigDecimal;

public class OrderItem {
    private String orderItemId; // แก้เป็น String
    private String orderId;     // แก้เป็น String
    private String productId;   // แก้เป็น String
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
    private int fulfilledQty;
    private int remainingQty;

    // --- Getters and Setters (ปรับ Type ของ ID) ---
    public String getOrderItemId() { return orderItemId; }
    public void setOrderItemId(String orderItemId) { this.orderItemId = orderItemId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    //... (Getters and Setters ที่เหลือ)
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }

    public int getFulfilledQty() { return fulfilledQty; }
    public void setFulfilledQty(int fulfilledQty) { this.fulfilledQty = fulfilledQty; }

    public int getRemainingQty() { return remainingQty; }
    public void setRemainingQty(int remainingQty) { this.remainingQty = remainingQty; }
}